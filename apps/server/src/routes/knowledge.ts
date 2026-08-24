import { Hono } from "hono";
import { prisma, KnowledgeType } from "@mogent/database";

export const knowledgeRouter = new Hono();

// GET /api/knowledge - List knowledge items and WhatsApp config
knowledgeRouter.get("/", async (c) => {
  try {
    const workspace = await prisma.workspace.findFirst();
    const items = await prisma.knowledgeBase.findMany({
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
          number: workspace?.whatsAppNumber || "+8801819234567",
          hotline: workspace?.hotlineNumber || "09612345678",
          address: workspace?.officeAddress || "Level 4, House 12, Road 4, Dhanmondi, Dhaka",
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
  try {
    const body = await c.req.json();
    const { title, category, content } = body;

    if (!title || !content) {
      return c.json({ success: false, error: "Title and content are required" }, 400);
    }

    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const created = await prisma.knowledgeBase.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        category: category || "FAQ",
        content: content.trim(),
        priority: 5,
        isActive: true,
      },
    });

    return c.json({ success: true, data: created });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/knowledge/:id - Delete knowledge item
knowledgeRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.knowledgeBase.delete({ where: { id } });
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge/whatsapp - Update WhatsApp sharing protocol
knowledgeRouter.post("/whatsapp", async (c) => {
  try {
    const body = await c.req.json();
    const { mode, number, hotline, address, prefillText } = body;

    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        whatsAppMode: mode,
        whatsAppNumber: number,
        hotlineNumber: hotline,
        officeAddress: address,
        whatsAppPrefillText: prefillText,
      },
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
