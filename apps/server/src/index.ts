import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { pagesRouter } from "./routes/pages";
import { adminRouter } from "./routes/admin";
import { webhookRouter } from "./routes/webhook";
import { dashboardRouter } from "./routes/dashboard";
import { conversationsRouter } from "./routes/conversations";
import { productsRouter } from "./routes/products";
import { contactsRouter } from "./routes/contacts";
import { knowledgeRouter } from "./routes/knowledge";
import { billingRouter } from "./routes/billing";
import { ordersRouter } from "./routes/orders";
import { automationRouter } from "./routes/automation";
import { uploadRouter } from "./routes/upload";
import { startMessageWorker } from "./workers/message-processor";
import { startTelegramWorker } from "./workers/telegram-worker";
import { createRateLimiter } from "./middleware/rate-limiter";
import { AiProxyClient } from "./ai-client";
import { prisma } from "@mogent/database";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-workspace-id", "Accept"],
    maxAge: 86400,
  })
);

// Global anti-abuse & rate limiting (120 req/min per IP)
app.use(
  "/api/*",
  createRateLimiter({
    windowSeconds: 60,
    maxRequests: 120,
    keyPrefix: "mogent:rl:api",
    message: "Too many requests to Mogent API. Please wait a moment.",
  })
);

// Auth endpoints rate limiting (20 req/min per IP)
app.use(
  "/api/auth/*",
  createRateLimiter({
    windowSeconds: 60,
    maxRequests: 20,
    keyPrefix: "mogent:rl:auth",
    message: "Too many login/registration attempts. Please wait 1 minute.",
  })
);

// Payment submission rate limiting (5 req/5min per IP/workspace)
app.use(
  "/api/billing/submit-payment",
  createRateLimiter({
    windowSeconds: 300,
    maxRequests: 5,
    keyPrefix: "mogent:rl:payment",
    message: "Too many payment submission attempts. Please wait 5 minutes before submitting again.",
  })
);

// Uploads rate limiting (30 uploads/min)
app.use(
  "/api/upload/*",
  createRateLimiter({
    windowSeconds: 60,
    maxRequests: 30,
    keyPrefix: "mogent:rl:upload",
    message: "Upload rate limit reached. Please wait a moment.",
  })
);

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

// -----------------------------------------------------------------------------
// 1. SYSTEM HEALTHCHECK & DIAGNOSTICS
// -----------------------------------------------------------------------------
app.get("/health", async (c) => {
  let dbStatus = "UNKNOWN";
  let aiStatus = "UNKNOWN";

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "CONNECTED";
  } catch (err: any) {
    dbStatus = `ERROR: ${err.message}`;
  }

  try {
    const aiHealth = await aiClient.checkHealth();
    aiStatus = aiHealth.status === "ok" ? "CONNECTED" : "UNHEALTHY";
  } catch {
    aiStatus = "UNREACHABLE";
  }

  return c.json({
    status: "ok",
    service: "Mogent Core Backend & Webhook Server",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    aiGateway: aiStatus,
  });
});

// -----------------------------------------------------------------------------
// 2. ROUTE REGISTRATIONS
// -----------------------------------------------------------------------------
app.route("/api/auth", authRouter);
app.route("/api/pages", pagesRouter);
app.route("/api/admin", adminRouter);
app.route("/api/billing", billingRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/conversations", conversationsRouter);
app.route("/api/products", productsRouter);
app.route("/api/contacts", contactsRouter);
app.route("/api/knowledge", knowledgeRouter);
app.route("/api/orders", ordersRouter);
app.route("/api/automation", automationRouter);
app.route("/api/upload", uploadRouter);

// Mount webhooks on both /webhook and /api/webhook for universal support
app.route("/webhook", webhookRouter);
app.route("/api/webhook", webhookRouter);

// -----------------------------------------------------------------------------
// 3. START BACKGROUND BULLMQ WORKERS
// -----------------------------------------------------------------------------
console.log("\n🚀 Starting BullMQ Background Workers...");
const messageWorker = startMessageWorker();
const telegramWorker = startTelegramWorker();

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await messageWorker.close();
  await telegramWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log(`\n======================================================`);
console.log(`⚡ MOGENT CORE BACKEND RUNNING ON PORT: ${config.port}`);
console.log(`🔗 AI Gateway Target: ${config.aiProxy.url}`);
console.log(`🔑 Master Key Configured: ${config.aiProxy.masterKey ? "YES" : "NO"}`);
console.log(`🗄️ PostgreSQL Connection Pool: CONFIGURED`);
console.log(`📥 Redis BullMQ Workers: ACTIVE & LISTENING`);
console.log(`======================================================\n`);

serve({
  fetch: app.fetch,
  port: config.port,
});
