import Redis from "ioredis";
import { config } from "./config";

export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  tls: config.redis.host.includes("upstash") ? {} : undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => {
    // Only warn if failed more than 3 consecutive times
    if (times === 3 || times % 10 === 0) {
      console.warn(`⚠️ [Attempt ${times}] Core Backend reconnecting to Redis at ${config.redis.host}:${config.redis.port}...`);
    }
    return Math.min(times * 500, 3000);
  },
});

redisConnection.on("connect", () => {
  console.log("✅ Core Backend connected to Redis.");
});

// Track last error time to avoid spam
let lastErrorTime = 0;
redisConnection.on("error", (err) => {
  const now = Date.now();
  if (now - lastErrorTime > 10000) { // Log error at most every 10 seconds
    console.error("❌ Redis connection error in Core Backend:", err.message);
    lastErrorTime = now;
  }
});
