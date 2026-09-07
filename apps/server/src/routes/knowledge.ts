import { Hono } from "hono";
import { prisma, KnowledgeType } from "@mogent/database";
import { redisConnection } from "../redis";
import { config } from "../config";
import { AiProxyClient } from "../ai-client";

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

export const knowledgeRouter = new Hono();

// GET /api/knowledge - List knowledge items, system prompt, and WhatsApp config for workspace
knowledgeRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  const pageId = c.req.query("pageId");

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

    let targetPage: any = null;
    if (pageId && pageId !== "ALL") {
      targetPage = await prisma.facebookPage.findUnique({
        where: { id: pageId },
      });
    } else if (targetWsId) {
      targetPage = await prisma.facebookPage.findFirst({
        where: { workspaceId: targetWsId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
    } else {
      targetPage = await prisma.facebookPage.findFirst({ where: { isActive: true } });
    }

    const items = await prisma.knowledgeBase.findMany({
      where: targetWsId ? { workspaceId: targetWsId } : where,
      orderBy: { priority: "desc" },
    });

    let wpPrompt = targetWsId ? await redisConnection.get(`mogent:whatsapp_system_prompt:${targetWsId}`) : null;
    if (!wpPrompt) {
      wpPrompt = await redisConnection.get("mogent:whatsapp_system_prompt:default");
    }

    return c.json({
      success: true,
      data: {
        pageId: targetPage?.id || "ALL",
        pageName: targetPage?.name || "",
        systemPrompt: targetPage?.systemPrompt || "",
        whatsappPrompt: wpPrompt || "",
        businessName: targetPage?.businessName || targetPage?.name || workspace?.name || "",
        businessDescription: targetPage?.businessDescription || "",
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
    const { systemPrompt, businessName, pageId, whatsappPrompt } = body;

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    if (systemPrompt !== undefined) {
      if (pageId && pageId !== "ALL") {
        // Update specific page
        await prisma.facebookPage.update({
          where: { id: pageId },
          data: {
            systemPrompt: (systemPrompt || "").trim() || null,
            businessName: (businessName || "").trim() || null,
          },
        });
      } else {
        // Update all Facebook Pages under this workspace
        await prisma.facebookPage.updateMany({
          where: { workspaceId: targetWorkspaceId },
          data: {
            systemPrompt: (systemPrompt || "").trim() || null,
            businessName: (businessName || "").trim() || null,
          },
        });
      }
    }

    // Save WhatsApp prompt separately to Redis
    if (whatsappPrompt !== undefined) {
      const cleanWp = (whatsappPrompt || "").trim();
      await Promise.all([
        redisConnection.set(`mogent:whatsapp_system_prompt:${targetWorkspaceId}`, cleanWp),
        redisConnection.set("mogent:whatsapp_system_prompt:default", cleanWp),
      ]);
    }

    return c.json({
      success: true,
      message: "Custom System Prompt saved successfully!",
      data: { systemPrompt, whatsappPrompt, businessName, pageId },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/knowledge/whatsapp-prompt
knowledgeRouter.get("/whatsapp-prompt", async (c) => {
  const workspaceId = c.req.header("x-workspace-id") || "default";
  try {
    let raw = await redisConnection.get(`mogent:whatsapp_system_prompt:${workspaceId}`);
    if (!raw && workspaceId !== "default") {
      raw = await redisConnection.get("mogent:whatsapp_system_prompt:default");
    }
    return c.json({ success: true, prompt: raw || "" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge/whatsapp-prompt
knowledgeRouter.post("/whatsapp-prompt", async (c) => {
  const workspaceId = c.req.header("x-workspace-id") || "default";
  try {
    const body = await c.req.json();
    const cleanPrompt = (body.prompt || "").trim();
    await Promise.all([
      redisConnection.set(`mogent:whatsapp_system_prompt:${workspaceId}`, cleanPrompt),
      redisConnection.set("mogent:whatsapp_system_prompt:default", cleanPrompt),
    ]);
    return c.json({ success: true, message: "WhatsApp prompt saved successfully!", prompt: cleanPrompt });
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
    const { message, history, channel } = body;

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
      ? await prisma.workspace.findUnique({
          where: { id: targetWorkspaceId },
          include: { facebookPages: true },
        })
      : null;

    const primaryPage = workspace?.facebookPages?.[0];

    const isWhatsApp = channel === "WHATSAPP";
    let systemPrompt = "";

    if (isWhatsApp) {
      let wpPrompt = targetWorkspaceId
        ? await redisConnection.get(`mogent:whatsapp_system_prompt:${targetWorkspaceId}`)
        : null;
      if (!wpPrompt) {
        wpPrompt = await redisConnection.get("mogent:whatsapp_system_prompt:default");
      }
      systemPrompt =
        wpPrompt?.trim() ||
        `আপনি "${primaryPage?.businessName || workspace?.name || "আমাদের শপ"}" এর একজন বাস্তব অভিজ্ঞ সেলস এক্সপার্ট ও শপ ওনার।
কাস্টমার মাত্রই WhatsApp এ নক দিয়েছে। আপনার কাজ হলো তার প্রশ্নের সরাসরি ও অত্যন্ত ছোট (১-২ বাক্যে) উত্তর দেওয়া এবং ধাপে ধাপে কথা বলে অর্ডার ক্লোজ করা।`;
    } else {
      systemPrompt =
        primaryPage?.systemPrompt ||
        `আপনি "${primaryPage?.businessName || workspace?.name || "আমাদের শপ"}" এর একজন অভিজ্ঞ, অত্যন্ত আন্তরিক ও চটপটে বাস্তব মানব বিক্রয় প্রতিনিধি/মডারেটর (Sales Representative)।`;
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
      channel: isWhatsApp ? "WHATSAPP" : "MESSENGER",
    });

    let replyText = aiRes.data.replyText;
    let button: { title: string; url: string } | null = null;

    if (!isWhatsApp && workspace?.whatsAppNumber && replyText) {
      const rawNumber = workspace.whatsAppNumber.trim();
      let cleanDigits = rawNumber.replace(/[^\d]/g, "");
      if (cleanDigits.startsWith("01") && cleanDigits.length === 11) {
        cleanDigits = `88${cleanDigits}`;
      }
      const textParam = workspace.whatsAppPrefillText
        ? `?text=${encodeURIComponent(workspace.whatsAppPrefillText)}`
        : "";
      const waUrl = `https://wa.me/${cleanDigits}${textParam}`;

      if (workspace.whatsAppMode === "ALWAYS") {
        button = {
          title: "WhatsApp এ চ্যাট",
          url: waUrl,
        };
      } else if (
        workspace.whatsAppMode === "ON_DEMAND" &&
        (replyText.includes(rawNumber) ||
          replyText.toLowerCase().includes("whatsapp") ||
          message.toLowerCase().includes("whatsapp") ||
          message.includes("নাম্বার") ||
          message.includes("কন্টাক্ট"))
      ) {
        button = {
          title: "WhatsApp এ চ্যাট",
          url: waUrl,
        };
      }
    }

    return c.json({
      success: true,
      data: {
        replyText,
        button,
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


