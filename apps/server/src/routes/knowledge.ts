import { Hono } from "hono";
import { prisma, KnowledgeType } from "@mogent/database";

export const knowledgeRouter = new Hono();

// GET /api/knowledge - List knowledge items and WhatsApp config for workspace
knowledgeRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let where: any = {};
    let workspace: any = null;

    if (workspaceId) {
      where = { workspaceId };
      workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    }

    if (!workspace) {
      workspace = await prisma.workspace.findFirst();
    }

    const items = await prisma.knowledgeBase.findMany({
      where,
      orderBy: { priority: "desc" },
    });

    return c.json({
      success: true,
      data: {
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          category: i.category || "PRODUCT_CATALOG",
          content: i.content,
          priority: i.priority,
          isActive: i.isActive,
        })),
        whatsAppProtocol: {
          mode: workspace?.whatsAppMode || "ON_DEMAND",
          number: workspace?.whatsAppNumber || "",
          hotline: workspace?.hotlineNumber || "",
          address: workspace?.officeAddress || "",
          prefillText: workspace?.whatsAppPrefillText || "Hello! I saw your products on Facebook and want to place an order.",
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge - Add knowledge base entry
knowledgeRouter.post("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { title, category, content } = body;

    if (!title || !content) {
      return c.json({ success: false, error: "Title and content are required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const created = await prisma.knowledgeBase.create({
      data: {
        workspaceId: targetWorkspaceId,
        title: title.trim(),
        category: category || "FAQ",
        content: content.trim(),
        priority: 5,
        type: KnowledgeType.FAQ,
      },
    });

    return c.json({ success: true, data: created });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge/whatsapp - Save WhatsApp and Contact sharing protocol
knowledgeRouter.post("/whatsapp", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { mode, number, hotline, address, prefillText } = body;

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const updated = await prisma.workspace.update({
      where: { id: targetWorkspaceId },
      data: {
        whatsAppMode: mode || "ON_DEMAND",
        whatsAppNumber: number || null,
        hotlineNumber: hotline || null,
        officeAddress: address || null,
        whatsAppPrefillText: prefillText || null,
      },
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/knowledge/:id - Delete knowledge item
knowledgeRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.knowledgeBase.delete({ where: { id } });
    return c.json({ success: true, message: "Deleted" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
