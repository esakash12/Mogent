import Redis from "ioredis";
import crypto from "crypto";

export interface KeyStatus {
  id?: string;
  index: number;
  key: string;
  maskedKey: string;
  keyHash: string;
  name?: string;
  role: "PRIMARY" | "SECONDARY" | "BACKUP";
  model: string;
  rpmUsed: number;
  rpmLimit: number;
  tpmUsed: number;
  tpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cooldownUntil: number | null;
  isExhausted: boolean;
  isEnabled: boolean;
}

export class GeminiKeyRotator {
  private keys: KeyStatus[] = [];
  private currentIndex: number = 0;
  private redis: Redis | null = null;
  private readonly defaultCooldownSec: number = 120; // 2 minutes auto-switch cooldown

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
      const role: "PRIMARY" | "SECONDARY" | "BACKUP" =
        index === 0 ? "PRIMARY" : index === 1 ? "SECONDARY" : "BACKUP";
      return {
        id: `k-${keyHash}`,
        index,
        key,
        keyHash,
        maskedKey: this.maskKey(key),
        name: `Key #${index + 1} (${role})`,
        role,
        model: "gemini-3.5-flash-lite",
        rpmUsed: 0,
        rpmLimit: 15,
        tpmUsed: 0,
        tpmLimit: 250000,
        rpdUsed: 0,
        rpdLimit: 500,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        cooldownUntil: null,
        isExhausted: false,
        isEnabled: true,
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
      // 1. Fetch structured metadata if available
      const rawMeta = await this.redis.get("mogent:gemini_keys_metadata");
      if (rawMeta) {
        try {
          const parsed: KeyStatus[] = JSON.parse(rawMeta);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.keys = parsed.map((item, idx) => ({
              ...item,
              index: idx,
              keyHash: item.keyHash || crypto.createHash("md5").update(item.key).digest("hex").substring(0, 10),
              maskedKey: item.maskedKey || this.maskKey(item.key),
              rpmLimit: item.rpmLimit || (item.model?.includes("gemma") ? 30 : 15),
              tpmLimit: item.tpmLimit || (item.model?.includes("gemma") ? 16000 : 250000),
              rpdLimit: item.rpdLimit || (item.model?.includes("gemma") ? 14400 : 500),
              isEnabled: item.isEnabled !== false,
            }));
            return;
          }
        } catch {}
      }

      // 2. Fallback to set pool
      const [pool1, pool2] = await Promise.all([
        this.redis.smembers("mogent:gemini_keys_pool").catch(() => []),
        this.redis.smembers("mogent:gemini_pool_keys").catch(() => []),
      ]);
      const customKeys = Array.from(new Set([...(pool1 || []), ...(pool2 || [])]));

      for (let idx = 0; idx < customKeys.length; idx++) {
        const key = customKeys[idx];
        if (!key || !key.trim()) continue;
        const cleanKey = key.trim();
        if (!this.keys.find((existing) => existing.key === cleanKey)) {
          const keyHash = crypto.createHash("md5").update(cleanKey).digest("hex").substring(0, 10);
          const role: "PRIMARY" | "SECONDARY" | "BACKUP" =
            idx === 0 ? "PRIMARY" : idx === 1 ? "SECONDARY" : "BACKUP";
          this.keys.push({
            id: `k-${keyHash}`,
            index: this.keys.length,
            key: cleanKey,
            keyHash,
            maskedKey: this.maskKey(cleanKey),
            name: `Key #${this.keys.length + 1} (${role})`,
            role,
            model: "gemini-3.5-flash-lite",
            rpmUsed: 0,
            rpmLimit: 15,
            tpmUsed: 0,
            tpmLimit: 250000,
            rpdUsed: 0,
            rpdLimit: 500,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cooldownUntil: null,
            isExhausted: false,
            isEnabled: true,
          });
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to sync keys from Redis:", e);
    }
  }

  /**
   * Retrieves the next available healthy API key using Round-Robin across all keys in pool.
   * Checks Redis TTL to ensure rate-limited keys are skipped during cooldown (1-2 mins).
   */
  public async getNextActiveKey(): Promise<KeyStatus | null> {
    await this.syncKeysFromRedis();
    const enabledKeys = this.keys.filter((k) => k.isEnabled !== false);
    if (enabledKeys.length === 0) return null;

    const totalKeys = enabledKeys.length;

    for (let i = 0; i < totalKeys; i++) {
      const candidateIndex = (this.currentIndex + i) % totalKeys;
      const candidate = enabledKeys[candidateIndex];

      const isUnavailable = await this.checkIfKeyIsUnavailable(candidate);
      if (!isUnavailable) {
        this.currentIndex = (candidateIndex + 1) % totalKeys;
        candidate.totalRequests++;
        candidate.rpmUsed = (candidate.rpmUsed || 0) + 1;
        candidate.rpdUsed = (candidate.rpdUsed || 0) + 1;
        this.incrementRedisStat(candidate.keyHash, "totalRequests");
        return candidate;
      }
    }

    // Fallback: If all are cooling down, return the first key
    console.warn("⚠️ All API keys are currently in cooldown. Attempting round-robin key.");
    const fallback = enabledKeys[this.currentIndex % totalKeys];
    this.currentIndex = (this.currentIndex + 1) % totalKeys;
    return fallback || null;
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
