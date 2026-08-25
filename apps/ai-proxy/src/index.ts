import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import { GeminiKeyRotator } from "./key-rotator";
import { GeminiService } from "./gemini-client";
import { createAiProxyRoutes } from "./routes";

import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const port = Number(process.env.AI_PROXY_PORT) || 5000;
const defaultModel = process.env.DEFAULT_GEMINI_MODEL || "gemini-3.5-flash-lite";

// 1. Initialize Redis for Key State & Cooldown Persistence
let redisClient: Redis | null = null;
if (process.env.REDIS_HOST) {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_HOST.includes("upstash") ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });

    redisClient
      .connect()
      .then(() => console.log("✅ AI Proxy connected to Redis for persistent rate-limit tracking."))
      .catch((err) => console.warn("⚠️ Redis connection failed, falling back to memory:", err.message));
  } catch (err) {
    console.warn("⚠️ Redis initialization error, using in-memory mode.");
  }
}

// 2. Load initial keys from .env if available, and also sync from Redis
const envKeys = (process.env.GEMINI_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

const keysList: string[] = envKeys;

// 3. Initialize Rotator & Gemini Service
const rotator = new GeminiKeyRotator(keysList, redisClient);
const geminiService = new GeminiService(rotator, defaultModel);

// Trigger initial sync
rotator.syncKeysFromRedis().catch(console.error);

// 4. Initialize Hono App
const app = new Hono();

app.use("*", logger());
app.use("*", cors());

const routes = createAiProxyRoutes(geminiService, rotator);
app.route("/", routes);

console.log(`\n======================================================`);
console.log(`🤖 MOGENT AI PROXY GATEWAY RUNNING ON PORT: ${port}`);
console.log(`🔑 Master Key: ${process.env.MOGENT_AI_MASTER_KEY ? "CONFIGURED (Protected)" : "DEFAULT"}`);
console.log(`🔄 Total Rotating Keys: ${keysList.length}`);
console.log(`💾 State Persistence: ${redisClient ? "REDIS (Persistent)" : "IN-MEMORY"}`);
console.log(`🧠 Default Model: ${defaultModel}`);
console.log(`======================================================\n`);

serve({
  fetch: app.fetch,
  port,
});
