import { Hono } from "hono";
import { verify } from "hono/jwt";
import { prisma, EscalationReason } from "@mogent/database";
import { redisConnection } from "../redis";
import { telegramApi } from "../services/telegram-api";
import { config } from "../config";

export const automationRouter = new Hono();

// GET /api/automation/rules - List all rules
automationRouter.get("/rules", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: true, data: [] });
    }

    const rules = await prisma.escalationRule.findMany({
      where: { workspaceId: targetWorkspaceId },
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: rules.map((r) => ({
        id: r.id,
        name: r.name,
        reason: r.reason,
        keywords: r.keywords,
        action: "TRANSFER_HUMAN",
        isActive: r.isActive,
        hitsCount: 0,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/automation/rules - Create a new rule
automationRouter.post("/rules", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { name, keywords, reason } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, error: "Rule name is required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const created = await prisma.escalationRule.create({
      data: {
        workspaceId: targetWorkspaceId,
        name: name.trim(),
        reason: (reason as EscalationReason) || EscalationReason.CUSTOM_KEYWORD,
        keywords: Array.isArray(keywords) ? keywords : [keywords].filter(Boolean),
        isActive: true,
      },
    });

    return c.json({ success: true, data: created });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /api/automation/rules/:id - Toggle rule active state
automationRouter.patch("/rules/:id", async (c) => {
  const { id } = c.req.param();

  try {
    const body = await c.req.json();
    const { isActive } = body;

    const updated = await prisma.escalationRule.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/automation/rules/:id - Delete rule
automationRouter.delete("/rules/:id", async (c) => {
  const { id } = c.req.param();

  try {
    await prisma.escalationRule.delete({ where: { id } });
    return c.json({ success: true, message: "Rule deleted successfully" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// TELEGRAM 1-CLICK CONNECTION & STATUS (Plan-Gated)
// -----------------------------------------------------------------------------

// Helper function to resolve target workspace ID accurately from headers / JWT
async function resolveWorkspaceId(c: any): Promise<string | null> {
  const workspaceHeader = c.req.header("x-workspace-id");
  if (workspaceHeader && workspaceHeader.trim()) {
    return workspaceHeader.trim();
  }

  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = (await verify(authHeader.substring(7), config.jwtSecret, "HS256")) as any;
      if (payload?.workspaceId) return payload.workspaceId;
      if (payload?.userId) {
        const mem = await prisma.workspaceMember.findFirst({
          where: { userId: payload.userId },
        });
        if (mem) return mem.workspaceId;
      }
    } catch {}
  }

  const defaultWs = await prisma.workspace.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  return defaultWs?.id || null;
}

// GET /api/automation/telegram - Get workspace telegram config and connection key
automationRouter.get("/telegram", async (c) => {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(c);
    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No active workspace found" }, 404);
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: targetWorkspaceId },
    });

    if (!workspace) {
      return c.json({ success: false, error: "Workspace not found" }, 404);
    }

    // Get Master Bot Username
    let botUsername = "MogentAlertBot";
    try {
      const redisVal = await redisConnection.get("mogent:telegram_master_config");
      if (redisVal) {
        const parsed = JSON.parse(redisVal);
        if (parsed.botUsername) botUsername = parsed.botUsername.replace(/^@/, "");
      }
    } catch {}

    const planUpper = (workspace.plan || "FREE").toUpperCase();
    const isPlanEligible =
      ["PRO", "ENTERPRISE", "BUSINESS", "GROWTH"].includes(planUpper) ||
      Boolean(workspace.planExpiresAt && new Date(workspace.planExpiresAt) > new Date());

    const tgConfig = await prisma.telegramConfig.findFirst({
      where: { workspaceId: workspace.id },
    });

    const connectionKey = `mg_ws_${workspace.id}`;
    const deepLink = `https://t.me/${botUsername}?start=${connectionKey}`;

    return c.json({
      success: true,
      data: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        plan: workspace.plan,
        isPlanEligible,
        botUsername,
        connectionKey,
        deepLink,
        isConnected: Boolean(tgConfig?.isActive && tgConfig?.chatId),
        chatId: tgConfig?.chatId || null,
        notifyOnEscalation: tgConfig?.notifyOnEscalation ?? true,
        notifyOnNewOrder: tgConfig?.notifyOnNewOrder ?? true,
        notifyOnNegativeReview: tgConfig?.notifyOnNegativeReview ?? true,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/automation/telegram/disconnect - Disconnect Telegram
automationRouter.post("/telegram/disconnect", async (c) => {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(c);
    if (!targetWorkspaceId) return c.json({ success: false, error: "No workspace found" }, 404);

    await prisma.telegramConfig.updateMany({
      where: { workspaceId: targetWorkspaceId },
      data: { isActive: false },
    });

    return c.json({ success: true, message: "Telegram alerts disconnected" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/automation/telegram/test - Send Test Alert
automationRouter.post("/telegram/test", async (c) => {
  try {
    const targetWorkspaceId = await resolveWorkspaceId(c);
    if (!targetWorkspaceId) return c.json({ success: false, error: "No workspace found" }, 404);

    const [workspace, tgConfig] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: targetWorkspaceId } }),
      prisma.telegramConfig.findFirst({ where: { workspaceId: targetWorkspaceId, isActive: true } }),
    ]);

    if (!tgConfig || !tgConfig.chatId) {
      return c.json({ success: false, error: "Telegram is not connected yet for this workspace" }, 400);
    }

    let botToken = tgConfig.botToken || config.telegram.botToken;
    try {
      const redisVal = await redisConnection.get("mogent:telegram_master_config");
      if (redisVal) {
        const parsed = JSON.parse(redisVal);
        if (parsed.botToken) botToken = parsed.botToken;
      }
    } catch {}

    const success = await telegramApi.sendEscalationAlert(botToken, tgConfig.chatId, {
      workspaceId: targetWorkspaceId,
      pageId: "test_page_123",
      conversationId: "test_conv_123",
      customerPsid: "9988776655",
      customerName: "Shohag (Test Customer)",
      reason: "TEST_NOTIFICATION",
      messageSnippet: "ভাইয়া এই প্রডাক্ট কি এখনো স্টকে আছে? আমি ১টা নিতে চাচ্ছি।",
      urgency: "HIGH",
    });

    if (success) {
      return c.json({ success: true, message: "Test alert delivered to Telegram successfully!" });
    } else {
      return c.json({ success: false, error: "Failed to dispatch Telegram message. Check Bot Token." }, 500);
    }
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
