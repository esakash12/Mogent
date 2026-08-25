import { Hono } from "hono";
import { prisma, KnowledgeType } from "@mogent/database";
import { config } from "../config";
import { AiProxyClient } from "../ai-client";

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

export const knowledgeRouter = new Hono();

// GET /api/knowledge - List knowledge items, system prompt, and WhatsApp config for workspace
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

    const targetWsId = workspace?.id;

    const [items, page] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where: targetWsId ? { workspaceId: targetWsId } : where,
        orderBy: { priority: "desc" },
      }),
      targetWsId
        ? prisma.facebookPage.findFirst({
            where: { workspaceId: targetWsId, isActive: true },
            orderBy: { createdAt: "desc" },
          })
        : prisma.facebookPage.findFirst({ where: { isActive: true } }),
    ]);

    return c.json({
      success: true,
      data: {
        systemPrompt: page?.systemPrompt || "",
        businessName: page?.businessName || page?.name || workspace?.name || "",
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

// POST /api/knowledge/system-prompt - Save Custom System Prompt & Persona
knowledgeRouter.post("/system-prompt", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { systemPrompt, businessName } = body;

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    // Update all Facebook Pages under this workspace
    await prisma.facebookPage.updateMany({
      where: { workspaceId: targetWorkspaceId },
      data: {
        systemPrompt: (systemPrompt || "").trim() || null,
        businessName: (businessName || "").trim() || null,
      },
    });

    return c.json({
      success: true,
      message: "Custom System Prompt saved successfully!",
      data: { systemPrompt, businessName },
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

// POST /api/knowledge/playground - Test AI generation in studio sandbox
knowledgeRouter.post("/playground", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { message, history } = body;

    if (!message) {
      return c.json({ success: false, error: "Message is required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    // Fetch knowledge base context
    const knowledgeItems = targetWorkspaceId
      ? await prisma.knowledgeBase.findMany({
          where: { workspaceId: targetWorkspaceId, isActive: true },
          orderBy: { priority: "desc" },
          take: 15,
        })
      : [];

    const knowledgeContext = knowledgeItems.map(
      (k) => `[${k.type} - ${k.title}]: ${k.content}`
    );

    const workspace = targetWorkspaceId
      ? await prisma.workspace.findUnique({ where: { id: targetWorkspaceId } })
      : null;

    let systemPrompt = `You are a polite, helpful AI sales & customer support executive for "${workspace?.name || "Our Store"}".
Respond accurately based on the business knowledge base in a natural, polite tone.
If information is not found in knowledge base, kindly inform the user or suggest connecting with a manager.`;

    if (workspace?.whatsAppNumber) {
      systemPrompt += `\nBusiness WhatsApp: ${workspace.whatsAppNumber}`;
    }
    if (workspace?.hotlineNumber) {
      systemPrompt += `\nHotline: ${workspace.hotlineNumber}`;
    }
    if (workspace?.officeAddress) {
      systemPrompt += `\nAddress: ${workspace.officeAddress}`;
    }

    const aiRes = await aiClient.generateReply({
      systemPrompt,
      knowledgeBaseContext: knowledgeContext,
      history: (history || []).map((h: any) => ({
        role: h.role === "user" ? "user" : "model",
        content: h.content,
      })),
      latestMessage: {
        text: message,
      },
      temperature: 0.7,
      model: config.aiProxy.defaultModel,
    });

    return c.json({
      success: true,
      data: {
        replyText: aiRes.data.replyText,
        thinking: aiRes.data.thinking,
        sentimentScore: aiRes.data.sentimentScore,
      },
    });
  } catch (error: any) {
    console.error("Playground error:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to generate AI reply",
    }, 500);
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


