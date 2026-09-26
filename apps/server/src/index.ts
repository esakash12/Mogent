process.env.TZ = "Asia/Dhaka";

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
import { broadcastsRouter } from "./routes/broadcasts";
import { uploadRouter } from "./routes/upload";
import { commentsRouter } from "./routes/comments";
import { startMessageWorker } from "./workers/message-processor";
import { startTelegramWorker } from "./workers/telegram-worker";
import { createRateLimiter } from "./middleware/rate-limiter";
import { AiProxyClient } from "./ai-client";
import { prisma } from "@mogent/database";
import { redisConnection } from "./redis";
import fs from "fs";
import path from "path";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-workspace-id", "Accept", "x-admin-secret"],
    exposeHeaders: ["x-new-token"],
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
app.route("/api/broadcasts", broadcastsRouter);
app.route("/api/campaigns", broadcastsRouter);
app.route("/api/upload", uploadRouter);
app.route("/api/comments", commentsRouter);

// Public Static Media Handler for Local Fallback Storage
app.get("/uploads/*", async (c) => {
  const relPath = c.req.path.replace(/^\/uploads\//, "");
  const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
  const candidates = [
    path.join(process.cwd(), "uploads", safePath),
    path.join(process.cwd(), "apps", "server", "uploads", safePath),
    path.resolve(process.cwd(), "..", "uploads", safePath),
    path.resolve(__dirname, "../uploads", safePath),
    path.resolve(__dirname, "../../uploads", safePath),
  ];
  const fullPath = candidates.find((p) => fs.existsSync(p));

  if (!fullPath) {
    return c.text("File not found", 404);
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
  };
  const mimeType = mimeMap[ext] || "application/octet-stream";

  const fileData = fs.readFileSync(fullPath);
  return c.body(fileData, 200, {
    "Content-Type": mimeType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
});

// Mount webhooks on both /webhook and /api/webhook for universal support
app.route("/webhook", webhookRouter);
app.route("/api/webhook", webhookRouter);

// -----------------------------------------------------------------------------
// 3. AUTOMATIC DATABASE SCHEMA SYNCHRONIZATION (SELF-HEALING)
// -----------------------------------------------------------------------------
async function syncDatabaseSchema() {
  try {
    console.log("🔄 Ensuring PostgreSQL database schema & tables are up to date...");

    // 1. Add missing columns safely across tables (Self-healing schema migration)
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN 
        -- Messages table: Media filenames and file sizes
        BEGIN
          ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Workspaces table: WhatsApp Cloud API credentials and settings
        BEGIN
          ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "whatsAppPhoneNumberId" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "whatsAppWabaId" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "whatsAppAccessToken" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "whatsAppAutoReply" BOOLEAN DEFAULT true;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "whatsAppSystemPrompt" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Customers table: Multi-tenant workspace reference and channel
        BEGIN
          ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'MESSENGER';
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Conversations table: Channel (MESSENGER / WHATSAPP)
        BEGIN
          ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'MESSENGER';
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Payment transactions table: Coupons & discounts
        BEGIN
          ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION DEFAULT 0;
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Escalation rules table: Hit tracking
        BEGIN
          ALTER TABLE "escalation_rules" ADD COLUMN IF NOT EXISTS "hitsCount" INTEGER DEFAULT 0;
        EXCEPTION
          WHEN others THEN NULL;
        END;
      END $$;
    `);

    // 2. Create coupons table if it does not exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
        "discountValue" DOUBLE PRECISION NOT NULL,
        "maxDiscount" DOUBLE PRECISION,
        "minOrderAmount" DOUBLE PRECISION DEFAULT 0,
        "applicablePlan" TEXT DEFAULT 'ALL',
        "usageLimit" INTEGER,
        "usedCount" INTEGER NOT NULL DEFAULT 0,
        "expiresAt" TIMESTAMP(3),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
    `);

    // 3. Create system_settings table if it does not exist (Durable Persistence)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
      );
    `);

    // 4. Performance Indexes for Sub-5ms Queries, Safe Sorting, and Join Acceleration
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_conversations_page_updated" ON "conversations"("facebookPageId", "updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_conversations_page_status" ON "conversations"("facebookPageId", "status");
      CREATE INDEX IF NOT EXISTS "idx_conversations_updated_at" ON "conversations"("updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON "messages"("conversationId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_customers_page_updated" ON "customers"("facebookPageId", "updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_customers_phone" ON "customers"("phoneNumber");
      CREATE INDEX IF NOT EXISTS "idx_customers_workspace" ON "customers"("workspaceId");
      CREATE INDEX IF NOT EXISTS "idx_orders_customer_created" ON "orders"("customerId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("status");
      CREATE INDEX IF NOT EXISTS "idx_products_workspace_stock" ON "products"("workspaceId", "inStock");
      CREATE INDEX IF NOT EXISTS "idx_facebook_pages_workspace" ON "facebook_pages"("workspaceId");
    `);

    // Auto-promote workspace owners and configured/fallback admin emails to isAdmin
    try {
      const explicitAdmin = process.env.ADMIN_EMAIL || config.adminEmail;
      const fallbackAdmins = ["shohag@burhan.com", "admin@mogent.tech"];
      const adminEmails = Array.from(
        new Set([
          ...(explicitAdmin ? [explicitAdmin.toLowerCase().trim()] : []),
          ...fallbackAdmins,
        ])
      );

      await prisma.user.updateMany({
        where: {
          OR: [
            { memberships: { some: { role: "OWNER" } } },
            { email: { in: adminEmails } },
          ],
        },
        data: { isAdmin: true },
      });
    } catch {}

    // 5. Auto-hydrate Redis & runtime config from PostgreSQL system_settings
    try {
      const allSettings = await prisma.systemSetting.findMany();
      if (allSettings && allSettings.length > 0) {
        console.log(`📦 Hydrating ${allSettings.length} system settings from PostgreSQL into Redis & memory...`);
        for (const item of allSettings) {
          try {
            await redisConnection.set(item.key, item.value);

            // Hydrate runtime config object
            const parsed = JSON.parse(item.value);
            if (item.key === "mogent:meta_developer_config") {
              if (parsed.appId) config.facebook.appId = parsed.appId;
              if (parsed.appSecret) config.facebook.appSecret = parsed.appSecret;
              if (parsed.verifyToken) config.facebook.verifyToken = parsed.verifyToken;
              if (parsed.defaultModel) config.aiProxy.defaultModel = parsed.defaultModel;
            } else if (item.key === "mogent:telegram_master_config") {
              if (parsed.botToken) config.telegram.botToken = parsed.botToken;
            }
          } catch (itemErr: any) {
            console.warn(`Failed hydrating setting ${item.key}:`, itemErr.message);
          }
        }
        console.log("✅ System settings successfully hydrated into Redis & memory!");
      }
    } catch (hydrErr: any) {
      console.warn("⚠️ System settings hydration notice:", hydrErr.message);
    }

    console.log("✅ PostgreSQL database schema & performance indexes synchronized successfully!");
  } catch (err: any) {
    console.warn("⚠️ PostgreSQL schema auto-sync notice:", err.message);
  }
}

// -----------------------------------------------------------------------------
// 4. AUTOMATIC TELEGRAM BOT WEBHOOK REGISTRATION
// -----------------------------------------------------------------------------
async function syncTelegramWebhook() {
  try {
    let token = process.env.TELEGRAM_BOT_TOKEN || config.telegram.botToken || "";
    try {
      const redisVal = await redisConnection.get("mogent:telegram_master_config");
      if (redisVal) {
        const parsed = JSON.parse(redisVal);
        if (parsed.botToken) token = parsed.botToken;
      }
    } catch {}

    if (token && token.trim()) {
      console.log("🤖 Ensuring Telegram Master Bot Webhook is active...");
      const apiBaseUrl = process.env.API_BASE_URL || "https://api.mogent.tech";
      const webhookUrl = `${apiBaseUrl}/webhook/telegram`;
      const hookRes = await fetch(
        `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`,
        { signal: AbortSignal.timeout(5000) }
      );
      const hookJson = (await hookRes.json()) as any;
      if (hookJson.ok) {
        console.log(`✅ Telegram Webhook successfully connected to ${webhookUrl}`);
      } else {
        console.warn("⚠️ Telegram setWebhook response:", hookJson);
      }
    }
  } catch (err: any) {
    console.warn("Telegram Webhook auto-init notice:", err.message);
  }
}

// -----------------------------------------------------------------------------
// 5. START BACKGROUND BULLMQ WORKERS & RUN AUTO-SYNC
// -----------------------------------------------------------------------------
console.log("\n🚀 Starting BullMQ Background Workers...");
const messageWorker = startMessageWorker();
const telegramWorker = startTelegramWorker();

// Trigger self-healing database schema sync & Telegram webhook registration
syncDatabaseSchema();
syncTelegramWebhook();

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
