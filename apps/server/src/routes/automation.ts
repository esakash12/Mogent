import { Hono } from "hono";
import { prisma, EscalationReason } from "@mogent/database";

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
