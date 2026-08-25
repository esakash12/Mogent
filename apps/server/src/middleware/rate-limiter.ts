import { MiddlewareHandler } from "hono";
import { redisConnection } from "../redis";

interface RateLimiterOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
  message?: string;
  identifyBy?: "ip" | "workspace" | "token";
}

// In-memory fallback if Redis is temporarily unreachable
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(options: RateLimiterOptions): MiddlewareHandler {
  const {
    windowSeconds,
    maxRequests,
    keyPrefix = "mogent:ratelimit",
    message = "Too many requests. Please slow down and try again later.",
    identifyBy = "ip",
  } = options;

  return async (c, next) => {
    let identifier = "anonymous";

    if (identifyBy === "workspace") {
      identifier = c.req.header("x-workspace-id") || c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown_ws";
    } else if (identifyBy === "token") {
      identifier = c.req.header("authorization") || c.req.header("cf-connecting-ip") || "unknown_token";
    } else {
      // IP identifier
      identifier =
        c.req.header("cf-connecting-ip") ||
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
        c.req.header("x-real-ip") ||
        "127.0.0.1";
    }

    const key = `${keyPrefix}:${identifier}`;

    try {
      if (redisConnection && redisConnection.status === "ready") {
        const current = await redisConnection.incr(key);
        if (current === 1) {
          await redisConnection.expire(key, windowSeconds);
        }

        c.header("X-RateLimit-Limit", maxRequests.toString());
        c.header("X-RateLimit-Remaining", Math.max(0, maxRequests - current).toString());

        if (current > maxRequests) {
          const ttl = await redisConnection.ttl(key);
          c.header("Retry-After", ttl.toString());
          return c.json(
            {
              success: false,
              error: message,
              retryAfterSeconds: Math.max(1, ttl),
            },
            429
          );
        }

        return await next();
      }
    } catch (err) {
      console.warn("⚠️ Redis rate limiter error, using memory fallback:", err);
    }

    // In-memory sliding window fallback
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
      memoryStore.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return await next();
    }

    entry.count += 1;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", retryAfter.toString());
      return c.json(
        {
          success: false,
          error: message,
          retryAfterSeconds: Math.max(1, retryAfter),
        },
        429
      );
    }

    return await next();
  };
}
