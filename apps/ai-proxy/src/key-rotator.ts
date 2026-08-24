import Redis from "ioredis";
import crypto from "crypto";

export interface KeyStatus {
  index: number;
  key: string;
  maskedKey: string;
  keyHash: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cooldownUntil: number | null;
  isExhausted: boolean;
}

export class GeminiKeyRotator {
  private keys: KeyStatus[] = [];
  private currentIndex: number = 0;
  private redis: Redis | null = null;
  private readonly defaultCooldownSec: number = 60; // 60 seconds TTL

  constructor(apiKeys: string[], redisClient?: Redis | null) {
    const validKeys = apiKeys
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (validKeys.length === 0) {
      console.warn("⚠️ No Gemini API keys provided to KeyRotator!");
    }

    this.redis = redisClient || null;

    this.keys = validKeys.map((key, index) => {
      const keyHash = crypto.createHash("md5").update(key).digest("hex").substring(0, 10);
      return {
        index,
        key,
        keyHash,
        maskedKey: this.maskKey(key),
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cooldownUntil: null,
        isExhausted: false,
      };
    });

    console.log(
      `✅ GeminiKeyRotator initialized with ${this.keys.length} keys (Redis Persistence: ${
        this.redis ? "ENABLED" : "MEMORY ONLY"
      })`
    );
  }

  private maskKey(key: string): string {
    if (key.length <= 8) return "********";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  public async syncKeysFromRedis() {
    if (!this.redis) return;
    try {
      const customKeys = await this.redis.smembers("mogent:gemini_pool_keys");
      
      const newKeys = customKeys.filter(k => !this.keys.find(existing => existing.key === k));
      
      for (const key of newKeys) {
        const keyHash = crypto.createHash("md5").update(key).digest("hex").substring(0, 10);
        this.keys.push({
          index: this.keys.length,
          key,
          keyHash,
          maskedKey: this.maskKey(key),
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          cooldownUntil: null,
          isExhausted: false,
        });
      }
      
      // Keep only keys that are in Redis
      this.keys = this.keys.filter(existing => customKeys.includes(existing.key));
      
    } catch (e) {
      console.warn("⚠️ Failed to sync keys from Redis:", e);
    }
  }

  /**
   * Retrieves the next available healthy API key using Round-Robin.
   * Checks Redis TTL to ensure rate-limited keys are skipped even after server restarts.
   */
  public async getNextActiveKey(): Promise<KeyStatus | null> {
    await this.syncKeysFromRedis();
    if (this.keys.length === 0) return null;

    const totalKeys = this.keys.length;

    for (let i = 0; i < totalKeys; i++) {
      const candidateIndex = (this.currentIndex + i) % totalKeys;
      const candidate = this.keys[candidateIndex];

      const isUnavailable = await this.checkIfKeyIsUnavailable(candidate);
      if (!isUnavailable) {
        this.currentIndex = (candidateIndex + 1) % totalKeys;
        candidate.totalRequests++;
        this.incrementRedisStat(candidate.keyHash, "totalRequests");
        return candidate;
      }
    }

    // Fallback: If all are cooling down, return the first one
    console.warn("⚠️ All Gemini API keys are currently cooling down. Attempting first key.");
    const fallback = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % totalKeys;
    return fallback;
  }

  private async checkIfKeyIsUnavailable(keyObj: KeyStatus): Promise<boolean> {
    const now = Date.now();

    // 1. Check Redis State first (Persistent across container restarts)
    if (this.redis) {
      try {
        const isCooldown = await this.redis.get(`gemini:cooldown:${keyObj.keyHash}`);
        if (isCooldown) return true;

        const isExhausted = await this.redis.get(`gemini:exhausted:${keyObj.keyHash}`);
        if (isExhausted) return true;
      } catch (redisErr) {
        console.warn("Redis lookup failed in KeyRotator, falling back to memory:", redisErr);
      }
    }

    // 2. In-Memory fallback check
    if (keyObj.isExhausted) return true;
    if (keyObj.cooldownUntil && keyObj.cooldownUntil > now) return true;

    return false;
  }

  /**
   * Marks a key as temporarily rate-limited (HTTP 429) using Redis TTL auto-expiry.
   */
  public async markRateLimited(key: string, cooldownSec?: number): Promise<void> {
    const keyObj = this.keys.find((k) => k.key === key);
    if (!keyObj) return;

    const ttl = cooldownSec || this.defaultCooldownSec;
    keyObj.cooldownUntil = Date.now() + ttl * 1000;
    keyObj.failedRequests++;

    if (this.redis) {
      try {
        await this.redis.set(`gemini:cooldown:${keyObj.keyHash}`, "1", "EX", ttl);
        await this.incrementRedisStat(keyObj.keyHash, "failedRequests");
        console.warn(`⏳ Key [${keyObj.maskedKey}] locked in Redis cooldown for ${ttl}s.`);
      } catch (err) {
        console.error("Failed to set Redis cooldown:", err);
      }
    }
  }

  /**
   * Marks a key as daily quota exhausted (persisted for 24h in Redis).
   */
  public async markExhausted(key: string): Promise<void> {
    const keyObj = this.keys.find((k) => k.key === key);
    if (!keyObj) return;

    keyObj.isExhausted = true;
    keyObj.failedRequests++;

    if (this.redis) {
      try {
        // Expire in 24 hours (86400 seconds)
        await this.redis.set(`gemini:exhausted:${keyObj.keyHash}`, "1", "EX", 86400);
        await this.incrementRedisStat(keyObj.keyHash, "failedRequests");
        console.error(`❌ Key [${keyObj.maskedKey}] marked as EXHAUSTED in Redis (24h lock).`);
      } catch (err) {
        console.error("Failed to set Redis exhausted state:", err);
      }
    }
  }

  /**
   * Marks a successful API execution and records stats in Redis.
   */
  public async markSuccess(key: string): Promise<void> {
    const keyObj = this.keys.find((k) => k.key === key);
    if (!keyObj) return;

    keyObj.successfulRequests++;
    keyObj.cooldownUntil = null;

    if (this.redis) {
      try {
        await this.incrementRedisStat(keyObj.keyHash, "successfulRequests");
      } catch (err) {
        // silent stat ignore
      }
    }
  }

  private async incrementRedisStat(keyHash: string, field: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.hincrby(`gemini:stats:${keyHash}`, field, 1);
    } catch {
      // ignore
    }
  }

  /**
   * Returns current status with Redis TTL integration.
   */
  public async getStatus() {
    const now = Date.now();
    const statuses = await Promise.all(
      this.keys.map(async (k) => {
        let inCooldown = false;
        let cooldownSec = 0;
        let isExhausted = k.isExhausted;

        if (this.redis) {
          try {
            const ttl = await this.redis.ttl(`gemini:cooldown:${k.keyHash}`);
            if (ttl > 0) {
              inCooldown = true;
              cooldownSec = ttl;
            }
            const exhausted = await this.redis.get(`gemini:exhausted:${k.keyHash}`);
            if (exhausted) isExhausted = true;
          } catch {
            inCooldown = k.cooldownUntil ? k.cooldownUntil > now : false;
          }
        } else {
          inCooldown = k.cooldownUntil ? k.cooldownUntil > now : false;
          cooldownSec = k.cooldownUntil && k.cooldownUntil > now ? Math.round((k.cooldownUntil - now) / 1000) : 0;
        }

        return {
          index: k.index,
          maskedKey: k.maskedKey,
          keyHash: k.keyHash,
          totalRequests: k.totalRequests,
          successfulRequests: k.successfulRequests,
          failedRequests: k.failedRequests,
          inCooldown,
          cooldownRemainingSec: cooldownSec,
          isExhausted,
        };
      })
    );

    return {
      totalConfiguredKeys: this.keys.length,
      activeKeysCount: statuses.filter((s) => !s.inCooldown && !s.isExhausted).length,
      persistence: this.redis ? "REDIS_CONNECTED" : "IN_MEMORY",
      keys: statuses,
    };
  }
}
