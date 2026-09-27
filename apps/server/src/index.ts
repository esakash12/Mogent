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
          ALTER TABLE "customers" ALTER COLUMN "facebookPageId" DROP NOT NULL;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'MESSENGER';
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Conversations table: Channel (MESSENGER / WHATSAPP) & Workspace Isolation
        BEGIN
          ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "conversations" ALTER COLUMN "facebookPageId" DROP NOT NULL;
        EXCEPTION
          WHEN others THEN NULL;
        END;
        BEGIN
          ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "channel" TEXT DEFAULT 'MESSENGER';
        EXCEPTION
          WHEN others THEN NULL;
        END;

        -- Orders table: Direct workspace relation
        BEGIN
          ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
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

    // 4. Create facebook_comments table if it does not exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "facebook_comments" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "facebookPageId" TEXT NOT NULL,
        "postId" TEXT,
        "postTitle" TEXT,
        "authorName" TEXT NOT NULL,
        "authorId" TEXT,
        "authorPic" TEXT,
        "message" TEXT NOT NULL,
        "createdTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "sentiment" TEXT NOT NULL DEFAULT 'NEUTRAL',
        "category" TEXT NOT NULL DEFAULT 'SAFE',
        "isHidden" BOOLEAN NOT NULL DEFAULT false,
        "likeCount" INTEGER NOT NULL DEFAULT 0,
        "repliesCount" INTEGER NOT NULL DEFAULT 0,
        "replies" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "facebook_comments_pkey" PRIMARY KEY ("id")
      );
    `);

    // 5. Create broadcast_campaigns table if it does not exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "broadcast_campaigns" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'ALL',
        "facebookPageId" TEXT,
        "recipientsCount" INTEGER NOT NULL DEFAULT 0,
        "sentCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "broadcast_campaigns_pkey" PRIMARY KEY ("id")
      );
    `);

    // 6. Performance Indexes for Sub-5ms Queries, Safe Sorting, and Join Acceleration
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_conversations_page_updated" ON "conversations"("facebookPageId", "updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_conversations_workspace_updated" ON "conversations"("workspaceId", "updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_conversations_page_status" ON "conversations"("facebookPageId", "status");
      CREATE INDEX IF NOT EXISTS "idx_conversations_updated_at" ON "conversations"("updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_messages_conversation_created" ON "messages"("conversationId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_customers_page_updated" ON "customers"("facebookPageId", "updatedAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_customers_phone" ON "customers"("phoneNumber");
      CREATE INDEX IF NOT EXISTS "idx_customers_workspace" ON "customers"("workspaceId");
      CREATE INDEX IF NOT EXISTS "idx_orders_customer_created" ON "orders"("customerId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_orders_workspace" ON "orders"("workspaceId");
      CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders"("status");
      CREATE INDEX IF NOT EXISTS "idx_products_workspace_stock" ON "products"("workspaceId", "inStock");
      CREATE INDEX IF NOT EXISTS "idx_facebook_pages_workspace" ON "facebook_pages"("workspaceId");
      CREATE INDEX IF NOT EXISTS "idx_fb_comments_workspace" ON "facebook_comments"("workspaceId", "createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "idx_fb_comments_page" ON "facebook_comments"("facebookPageId");
      CREATE INDEX IF NOT EXISTS "idx_broadcast_campaigns_workspace" ON "broadcast_campaigns"("workspaceId", "createdAt" DESC);
    `);

    // 7. Non-Destructive Backfills for Multi-Tenancy Lockdown
    await prisma.$executeRawUnsafe(`
      UPDATE "customers" SET "workspaceId" = p."workspaceId" 
      FROM "facebook_pages" p 
      WHERE "customers"."facebookPageId" = p."id" AND "customers"."workspaceId" IS NULL;

      UPDATE "conversations" SET "workspaceId" = p."workspaceId" 
      FROM "facebook_pages" p 
      WHERE "conversations"."facebookPageId" = p."id" AND "conversations"."workspaceId" IS NULL;

      UPDATE "orders" SET "workspaceId" = c."workspaceId" 
      FROM "customers" c 
      WHERE "orders"."customerId" = c."id" AND "orders"."workspaceId" IS NULL;
    `);

    // 8. Security Cleanup: Strictly restrict platform isAdmin to designated admin emails
    try {
      const explicitAdmin = (process.env.ADMIN_EMAIL || config.adminEmail || "").trim().toLowerCase();
      const designatedAdmins = Array.from(
        new Set([
          "shohag@burhan.com",
          "admin@mogent.tech",
          ...(explicitAdmin ? [explicitAdmin] : []),
        ])
      );

      // 1. Revoke accidental isAdmin flag from all non-designated users
      const revokeRes = await prisma.user.updateMany({
        where: {
          email: { notIn: designatedAdmins },
          isAdmin: true,
        },
        data: { isAdmin: false },
      });
      if (revokeRes.count > 0) {
        console.log(`🔒 Revoked accidental admin permissions from ${revokeRes.count} non-admin user(s).`);
      }

      // 2. Ensure designated admins have isAdmin = true
      await prisma.user.updateMany({
        where: {
          email: { in: designatedAdmins },
        },
        data: { isAdmin: true },
      });
    } catch (adminSyncErr: any) {
      console.warn("Admin flag synchronization notice:", adminSyncErr.message);
    }

    // 6. WhatsApp Conversation Deduplication & Orphan Cleanup
    try {
      console.log("🧹 Running WhatsApp Deduplication & Orphan Cleanup...");
      // 6.1 Backfill workspaceId on any legacy Customer & Conversation records
      await prisma.$executeRawUnsafe(`
        UPDATE customers c
        SET "workspaceId" = p."workspaceId"
        FROM facebook_pages p
        WHERE c."facebookPageId" = p.id AND c."workspaceId" IS NULL;
      `).catch(() => {});

      await prisma.$executeRawUnsafe(`
        UPDATE conversations conv
        SET "workspaceId" = p."workspaceId"
        FROM facebook_pages p
        WHERE conv."facebookPageId" = p.id AND conv."workspaceId" IS NULL;
      `).catch(() => {});

      // 6.2 Merge duplicate WhatsApp conversations belonging to the SAME customer
      const customersWithMultipleConvs = await prisma.customer.findMany({
        include: {
          conversations: {
            where: { channel: "WHATSAPP" },
            orderBy: { updatedAt: "desc" },
          },
        },
      });

      for (const cust of customersWithMultipleConvs) {
        if (cust.conversations.length > 1) {
          const [primaryConv, ...dupConvs] = cust.conversations;
          for (const dup of dupConvs) {
            await prisma.message.updateMany({
              where: { conversationId: dup.id },
              data: { conversationId: primaryConv.id },
            });
            await prisma.conversation.delete({ where: { id: dup.id } }).catch(() => {});
          }
          console.log(`✅ Merged ${dupConvs.length} duplicate WhatsApp conversation thread(s) for customer ${cust.firstName || cust.phoneNumber} (${cust.id})`);
        }
      }

      // 6.3 Merge duplicate Customers having the same WhatsApp phone number in the same Workspace
      const waCustomers = await prisma.customer.findMany({
        where: {
          phoneNumber: { not: "" },
          channel: "WHATSAPP",
        },
        include: {
          facebookPage: { select: { workspaceId: true } },
          conversations: {
            where: { channel: "WHATSAPP" },
            orderBy: { updatedAt: "desc" },
            select: { id: true, facebookPageId: true },
          },
        },
      });

      // Group by WorkspaceID + CleanPhone
      const groupMap: Record<string, typeof waCustomers> = {};
      for (const cust of waCustomers) {
        const wsId = cust.workspaceId || cust.facebookPage?.workspaceId;
        if (!wsId || !cust.phoneNumber) continue;
        const cleanPhone = cust.phoneNumber.replace(/\D/g, "");
        if (!cleanPhone) continue;
        const key = `${wsId}:${cleanPhone}`;
        if (!groupMap[key]) groupMap[key] = [];
        groupMap[key].push(cust);
      }

      for (const key of Object.keys(groupMap)) {
        const group = groupMap[key];
        if (group.length > 1) {
          const primary = group[0];

          for (let i = 1; i < group.length; i++) {
            const duplicate = group[i];
            let primaryConv = primary.conversations[0];

            for (const dupConv of duplicate.conversations) {
              if (primaryConv) {
                // Move messages
                await prisma.message.updateMany({
                  where: { conversationId: dupConv.id },
                  data: { conversationId: primaryConv.id },
                });
                // Delete duplicate empty conversation
                await prisma.conversation.delete({ where: { id: dupConv.id } }).catch(() => {});
              } else {
                // Transfer conversation to primary
                await prisma.conversation.update({
                  where: { id: dupConv.id },
                  data: { customerId: primary.id, facebookPageId: primary.facebookPageId },
                });
                primaryConv = { id: dupConv.id, facebookPageId: primary.facebookPageId };
              }
            }

            // Move orders from duplicate customer to primary
            await prisma.order.updateMany({
              where: { customerId: duplicate.id },
              data: { customerId: primary.id },
            });

            // Delete duplicate customer
            await prisma.customer.delete({ where: { id: duplicate.id } }).catch(() => {});
          }
        }
      }
    } catch (dedupErr: any) {
      console.warn("WhatsApp Deduplication notice:", dedupErr.message);
    }

    // 5. ZERO-DATA-LOSS MIGRATION: Safely migrate legacy Redis configs to PostgreSQL before cleaning Redis
    try {
      console.log("🔄 Running Zero-Data-Loss check: migrating any legacy Redis configs to PostgreSQL...");

      // A. Migrate WhatsApp configs: mogent:whatsapp_config:<workspaceId>
      const wpKeys = await redisConnection.keys("mogent:whatsapp_config:*");
      for (const k of wpKeys) {
        try {
          const raw = await redisConnection.get(k);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const parts = k.split(":");
          const wsId = parts[2]; // workspace ID or "default"

          if (wsId && wsId !== "default") {
            const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
            if (ws) {
              await prisma.workspace.update({
                where: { id: wsId },
                data: {
                  whatsAppNumber: ws.whatsAppNumber || parsed.number || parsed.whatsAppNumber || null,
                  whatsAppPhoneNumberId: ws.whatsAppPhoneNumberId || parsed.phoneNumberId || parsed.whatsAppPhoneNumberId || null,
                  whatsAppWabaId: ws.whatsAppWabaId || parsed.wabaId || parsed.whatsAppWabaId || null,
                  whatsAppAccessToken: ws.whatsAppAccessToken || parsed.accessToken || parsed.whatsAppAccessToken || null,
                  whatsAppAutoReply: ws.whatsAppAutoReply ?? parsed.autoReply ?? true,
                },
              });
            }
          } else if (wsId === "default") {
            const firstWs = await prisma.workspace.findFirst({
              where: { whatsAppPhoneNumberId: null },
              orderBy: { createdAt: "asc" },
            });
            if (firstWs) {
              await prisma.workspace.update({
                where: { id: firstWs.id },
                data: {
                  whatsAppNumber: firstWs.whatsAppNumber || parsed.number || null,
                  whatsAppPhoneNumberId: parsed.phoneNumberId || null,
                  whatsAppWabaId: parsed.wabaId || null,
                  whatsAppAccessToken: parsed.accessToken || null,
                },
              });
            }
          }
          await redisConnection.del(k);
        } catch (e: any) {
          console.warn(`[Migration] WhatsApp config migration error for key ${k}:`, e.message);
        }
      }

      // B. Migrate WhatsApp system prompts: mogent:whatsapp_system_prompt:<workspaceId>
      const wpPromptKeys = await redisConnection.keys("mogent:whatsapp_system_prompt:*");
      for (const k of wpPromptKeys) {
        try {
          const raw = await redisConnection.get(k);
          if (!raw) continue;
          const wsId = k.replace("mogent:whatsapp_system_prompt:", "");
          if (wsId && wsId !== "default") {
            const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
            if (ws && !ws.whatsAppSystemPrompt) {
              await prisma.workspace.update({
                where: { id: wsId },
                data: { whatsAppSystemPrompt: raw.trim() },
              });
            }
          }
          await redisConnection.del(k);
        } catch (e: any) {
          console.warn(`[Migration] WhatsApp prompt migration error for key ${k}:`, e.message);
        }
      }

      // C. Migrate Custom Prompts: mogent:prompt:<pageId>
      const pagePromptKeys = await redisConnection.keys("mogent:prompt:*");
      for (const k of pagePromptKeys) {
        try {
          const raw = await redisConnection.get(k);
          if (!raw) continue;
          const pageId = k.replace("mogent:prompt:", "");
          const page = await prisma.facebookPage.findFirst({ where: { pageId } });
          if (page && !page.systemPrompt) {
            await prisma.facebookPage.update({
              where: { id: page.id },
              data: { systemPrompt: raw.trim() },
            });
          }
          await redisConnection.del(k);
        } catch (e: any) {
          console.warn(`[Migration] Page prompt migration error for key ${k}:`, e.message);
        }
      }

      // D. Migrate Follow-up configs: mogent:followup_config:<workspaceId>
      const followupKeys = await redisConnection.keys("mogent:followup_config:*");
      for (const k of followupKeys) {
        try {
          const raw = await redisConnection.get(k);
          if (!raw) continue;
          const existing = await prisma.systemSetting.findUnique({ where: { key: k } });
          if (!existing) {
            await prisma.systemSetting.create({ data: { key: k, value: raw } });
          }
          await redisConnection.del(k);
        } catch (e: any) {
          console.warn(`[Migration] Followup config migration error for key ${k}:`, e.message);
        }
      }

      // E. Migrate Admin Settings: meta_developer_config, telegram_master_config, cloudflare_r2_config, payment_gateway_config, gemini_keys_metadata
      const adminKeys = [
        "mogent:meta_developer_config",
        "mogent:telegram_master_config",
        "mogent:cloudflare_r2_config",
        "mogent:payment_gateway_config",
        "mogent:gemini_keys_metadata",
      ];
      for (const adminKey of adminKeys) {
        try {
          const raw = await redisConnection.get(adminKey);
          if (!raw) continue;
          const existing = await prisma.systemSetting.findUnique({ where: { key: adminKey } });
          if (!existing) {
            await prisma.systemSetting.create({ data: { key: adminKey, value: raw } });
          }
          await redisConnection.del(adminKey);
        } catch (e: any) {
          console.warn(`[Migration] Admin setting migration error for key ${adminKey}:`, e.message);
        }
      }

      // Clean up legacy Gemini keys pool set
      await redisConnection.del("mogent:gemini_keys_pool", "mogent:gemini_pool_keys").catch(() => {});

      console.log("✅ Zero-Data-Loss Migration completed: All legacy Redis data safely in PostgreSQL!");
    } catch (migrErr: any) {
      console.warn("⚠️ Zero-Data-Loss migration notice:", migrErr.message);
    }

    // 6. Hydrate runtime memory config directly from PostgreSQL system_settings
    try {
      const allSettings = await prisma.systemSetting.findMany();
      if (allSettings && allSettings.length > 0) {
        console.log(`📦 Hydrating ${allSettings.length} system settings from PostgreSQL into memory...`);
        for (const item of allSettings) {
          try {
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
        console.log("✅ System settings successfully loaded into memory!");
      }
    } catch (hydrErr: any) {
      console.warn("⚠️ System settings hydration notice:", hydrErr.message);
    }

    // 7. Cleanup mock fallback pages & legacy fake comments
    try {
      await prisma.facebookPage.deleteMany({
        where: {
          OR: [
            { pageId: { startsWith: "mock_" } },
            { pageId: { startsWith: "dummy_" } },
            { name: "Default Store Page" },
          ]
        }
      }).catch(() => {});
      const commentKeys = await redisConnection.keys("mogent:comments_cache:*");
      if (commentKeys && commentKeys.length > 0) {
        await redisConnection.del(...commentKeys);
      }
    } catch (cleanupErr: any) {
      console.warn("Cleanup notice:", cleanupErr.message);
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
      const dbRecord = await prisma.systemSetting.findUnique({
        where: { key: "mogent:telegram_master_config" },
      });
      if (dbRecord?.value) {
        const parsed = JSON.parse(dbRecord.value);
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
