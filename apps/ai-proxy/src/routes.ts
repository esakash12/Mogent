import { Hono } from "hono";
import { GeminiService } from "./gemini-client";
import { GeminiKeyRotator } from "./key-rotator";

export function createAiProxyRoutes(geminiService: GeminiService, rotator: GeminiKeyRotator) {
  const app = new Hono();

  // ----------------------------------------------------
  // 1. MASTER AUTHENTICATION MIDDLEWARE
  // ----------------------------------------------------
  const masterKey = process.env.MOGENT_AI_MASTER_KEY || "shohag_ai_master_secret_2026";

  app.use("/v1/*", async (c, next) => {
    // Exclude healthcheck from strict auth if needed
    if (c.req.path === "/v1/health") {
      return next();
    }

    const authHeader = c.req.header("Authorization") || c.req.header("x-api-key");
    if (!authHeader) {
      return c.json({ error: "Unauthorized. Missing Authorization header or x-api-key." }, 401);
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader.trim();

    if (token !== masterKey) {
      return c.json({ error: "Forbidden. Invalid master API key." }, 403);
    }

    await next();
  });

  // ----------------------------------------------------
  // 2. HEALTH & KEY STATUS ENDPOINTS
  // ----------------------------------------------------
  app.get("/v1/health", async (c) => {
    const status = await rotator.getStatus();
    return c.json({
      status: "ok",
      service: "Mogent AI Proxy Gateway",
      timestamp: new Date().toISOString(),
      activeKeysCount: status.activeKeysCount,
      totalKeys: status.totalConfiguredKeys,
      persistence: status.persistence,
    });
  });

  app.get("/v1/keys/status", async (c) => {
    const status = await rotator.getStatus();
    return c.json(status);
  });

  // ----------------------------------------------------
  // 3. MAIN AI GENERATION ENDPOINT
  // ----------------------------------------------------
  app.post("/v1/chat/generate", async (c) => {
    try {
      const body = await c.req.json();

      if (!body.systemPrompt) {
        return c.json({ error: "Missing required field: systemPrompt" }, 400);
      }

      const startTime = Date.now();
      const response = await geminiService.generateReply({
        model: body.model || process.env.DEFAULT_GEMINI_MODEL || "gemini-3.5-flash-lite",
        systemPrompt: body.systemPrompt,
        knowledgeBaseContext: body.knowledgeBaseContext || [],
        history: body.history || [],
        latestMessage: body.latestMessage || { text: "" },
        temperature: body.temperature ?? 0.3,
      });
      const durationMs = Date.now() - startTime;

      return c.json({
        success: true,
        data: response.result,
        meta: {
          usedKeyMasked: response.usedKeyMasked,
          attempts: response.attempts,
          durationMs,
        },
      });
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      return c.json(
        {
          success: false,
          error: err?.message || "Internal AI Proxy error",
        },
        500
      );
    }
  });

  return app;
}
