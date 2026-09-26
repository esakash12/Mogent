import { Hono } from "hono";
import { prisma, KnowledgeType } from "@mogent/database";
import { redisConnection } from "../redis";
import { config } from "../config";
import { AiProxyClient } from "../ai-client";
import { authMiddleware } from "../middleware/auth";

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

export const knowledgeRouter = new Hono();

// Enforce auth on knowledge routes
knowledgeRouter.use("*", authMiddleware);

// GET /api/knowledge - List knowledge items, system prompt, and WhatsApp config for workspace
knowledgeRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const pageId = c.req.query("pageId");

  try {
    if (!workspaceId) {
      return c.json({ success: true, data: [] });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const targetWsId = workspace?.id;

    if (!targetWsId) {
      return c.json({ success: true, data: [] });
    }

    let targetPage: any = null;
    if (pageId && pageId !== "ALL") {
      targetPage = await prisma.facebookPage.findFirst({
        where: { id: pageId, workspaceId: targetWsId },
      });
    } else {
      targetPage = await prisma.facebookPage.findFirst({
        where: { workspaceId: targetWsId, isActive: true },
        orderBy: { createdAt: "desc" },
      });
    }

    const items = await prisma.knowledgeBase.findMany({
      where: { workspaceId: targetWsId },
      orderBy: { priority: "desc" },
    });

    let wpPrompt = targetWsId ? await redisConnection.get(`mogent:whatsapp_system_prompt:${targetWsId}`) : null;
    if (!wpPrompt) {
      wpPrompt = await redisConnection.get("mogent:whatsapp_system_prompt:default");
    }

    const aboutItem = items.find((i) => i.category === "ABOUT_BUSINESS");
    let aboutData = {
      businessName: workspace?.name || targetPage?.businessName || "My Online Store",
      tagline: "Quality Products with Fast Nationwide Delivery",
      description: targetPage?.businessDescription || "We are a trusted Bangladeshi e-commerce brand offering genuine premium apparel and accessories.",
    };
    if (aboutItem) {
      try {
        const parsed = JSON.parse(aboutItem.content);
        aboutData = { ...aboutData, ...parsed };
      } catch {}
    }

    const kycItem = items.find((i) => i.category === "KYC_FIELDS");
    let kycFields = [
      { id: "name", label: "Customer Full Name", description: "Mandatory for shipping label", required: true },
      { id: "phone", label: "Mobile Phone Number", description: "Required for courier OTP and call", required: true },
      { id: "address", label: "Full Delivery Address", description: "House, Road, Area details", required: true },
      { id: "city", label: "District / City", description: "Inside or Outside Dhaka detection", required: true },
      { id: "note", label: "Special Delivery Instructions", description: "Optional customer note", required: false },
    ];
    if (kycItem) {
      try {
        const parsed = JSON.parse(kycItem.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          kycFields = parsed;
        }
      } catch {}
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
        aboutData,
        kycFields,
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
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { systemPrompt, businessName, pageId, whatsappPrompt } = body;

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
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

    // Save WhatsApp prompt separately to Redis strictly scoped by workspaceId
    if (whatsappPrompt !== undefined) {
      const cleanWp = (whatsappPrompt || "").trim();
      await redisConnection.set(`mogent:whatsapp_system_prompt:${targetWorkspaceId}`, cleanWp);
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
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: true, prompt: "" });
  }

  try {
    const raw = await redisConnection.get(`mogent:whatsapp_system_prompt:${workspaceId}`);
    return c.json({ success: true, prompt: raw || "" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge/whatsapp-prompt
knowledgeRouter.post("/whatsapp-prompt", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const cleanPrompt = (body.prompt || "").trim();
    await redisConnection.set(`mogent:whatsapp_system_prompt:${workspaceId}`, cleanPrompt);
    return c.json({ success: true, message: "WhatsApp prompt saved successfully!", prompt: cleanPrompt });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge - Add knowledge base entry
knowledgeRouter.post("/", async (c) => {
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { title, category, content } = body;

    if (!title || !content) {
      return c.json({ success: false, error: "Title and content are required" }, 400);
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
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

// POST /api/knowledge/about - Save Business & Brand About Info
knowledgeRouter.post("/about", async (c) => {
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { businessName, tagline, description } = body;

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    const aboutPayload = {
      businessName: (businessName || "").trim() || "My Online Store",
      tagline: (tagline || "").trim(),
      description: (description || "").trim(),
    };

    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        category: "ABOUT_BUSINESS",
      },
    });

    if (existing) {
      await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: {
          title: `About ${aboutPayload.businessName}`,
          content: JSON.stringify(aboutPayload),
        },
      });
    } else {
      await prisma.knowledgeBase.create({
        data: {
          workspaceId: targetWorkspaceId,
          title: `About ${aboutPayload.businessName}`,
          category: "ABOUT_BUSINESS",
          content: JSON.stringify(aboutPayload),
          priority: 8,
          type: KnowledgeType.POLICY,
        },
      });
    }

    if (aboutPayload.businessName) {
      await prisma.workspace.update({
        where: { id: targetWorkspaceId },
        data: { name: aboutPayload.businessName },
      });
      await prisma.facebookPage.updateMany({
        where: { workspaceId: targetWorkspaceId },
        data: {
          businessName: aboutPayload.businessName,
          businessDescription: aboutPayload.description || null,
        },
      });
    }

    return c.json({
      success: true,
      message: "Business information saved successfully!",
      data: aboutPayload,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/knowledge/kyc - Save Order Capture KYC Fields
knowledgeRouter.post("/kyc", async (c) => {
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { fields } = body;

    if (!Array.isArray(fields)) {
      return c.json({ success: false, error: "Fields array is required" }, 400);
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        category: "KYC_FIELDS",
      },
    });

    if (existing) {
      await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: {
          title: "Order Capture KYC Fields",
          content: JSON.stringify(fields),
        },
      });
    } else {
      await prisma.knowledgeBase.create({
        data: {
          workspaceId: targetWorkspaceId,
          title: "Order Capture KYC Fields",
          category: "KYC_FIELDS",
          content: JSON.stringify(fields),
          priority: 8,
          type: KnowledgeType.POLICY,
        },
      });
    }

    return c.json({
      success: true,
      message: "Order Capture KYC settings saved successfully!",
      data: fields,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Helper for extracting readable text from HTML
function extractCleanText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Website Content";

  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ")
    .replace(/<(?:p|div|h[1-6]|li|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  const text = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return { title, text: text.slice(0, 15000) };
}

// POST /api/knowledge/crawl - Real Website AI Scraper & Knowledge Indexer
knowledgeRouter.post("/crawl", async (c) => {
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return c.json({ success: false, error: "Valid URL is required" }, 400);
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    const formattedUrl = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      return c.json({ success: false, error: `Website responded with HTTP status ${res.status}` }, 400);
    }

    const rawContent = await res.text();
    let { title, text } = extractCleanText(rawContent);

    if (!text || text.length < 20) {
      text = `Website source: ${formattedUrl}\nExtracted summary: Page indexed for AI reference.`;
    }

    const existing = await prisma.knowledgeBase.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        category: "WEBSITE_CRAWL",
        title: formattedUrl,
      },
    });

    let record: any;
    const contentToStore = `[Source URL: ${formattedUrl}]\n[Page Title: ${title}]\n\n${text}`;

    if (existing) {
      record = await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: {
          content: contentToStore,
          priority: 6,
          updatedAt: new Date(),
        },
      });
    } else {
      record = await prisma.knowledgeBase.create({
        data: {
          workspaceId: targetWorkspaceId,
          title: formattedUrl,
          category: "WEBSITE_CRAWL",
          content: contentToStore,
          priority: 6,
          type: KnowledgeType.DOCUMENT,
        },
      });
    }

    return c.json({
      success: true,
      message: `Website content indexed successfully (${text.length} characters parsed)!`,
      data: {
        id: record.id,
        url: formattedUrl,
        title,
        textLength: text.length,
        pagesCount: 1,
        snippet: text.slice(0, 250) + "...",
        createdAt: record.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Crawler error:", error);
    return c.json({ success: false, error: error.message || "Failed to crawl target website" }, 500);
  }
});

// POST /api/knowledge/whatsapp - Save WhatsApp and Contact sharing protocol
knowledgeRouter.post("/whatsapp", async (c) => {
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { mode, number, hotline, address, prefillText } = body;

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
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
  const targetWorkspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { message, history, channel } = body;

    if (!message) {
      return c.json({ success: false, error: "Message is required" }, 400);
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
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
        reply: replyText,
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


