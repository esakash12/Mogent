import { Hono } from "hono";
import { prisma, AiMode } from "@mogent/database";
import { encryptToken } from "@mogent/shared";
import { config } from "../config";
import crypto from "crypto";

export const pagesRouter = new Hono();

// -----------------------------------------------------------------------------
// 1. GET ALL FACEBOOK PAGES FOR WORKSPACE
// -----------------------------------------------------------------------------
pagesRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const pages = await prisma.facebookPage.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: pages.map((p) => ({
        id: p.id,
        name: p.name,
        pageId: p.pageId,
        category: p.category || "Online Store",
        aiMode: p.aiMode,
        webhookStatus: p.webhookSubscribed ? "SUBSCRIBED" : "PENDING",
        systemPrompt: p.systemPrompt || "You are a polite AI customer service executive.",
        temperature: p.aiTemperature,
        isActive: p.isActive,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching pages:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. GET PUBLIC FACEBOOK APP CONFIG & WEBHOOK INFO
// -----------------------------------------------------------------------------
pagesRouter.get("/facebook/config", async (c) => {
  return c.json({
    success: true,
    data: {
      appId: config.facebook.appId || process.env.FACEBOOK_APP_ID || "",
      webhookUrl: "https://api.mogent.tech/webhook/facebook",
      verifyToken: config.facebook.verifyToken || "mogent_fb_verify_token_secure",
      privacyUrl: "https://mogent.tech/privacy",
      termsUrl: "https://mogent.tech/terms",
      dataDeletionUrl: "https://mogent.tech/data-deletion",
    },
  });
});

// -----------------------------------------------------------------------------
// 3. INSPECT PAGE TOKEN (GRAPH API AUTO-DETECTION)
// -----------------------------------------------------------------------------
pagesRouter.post("/inspect-token", async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token || !token.trim()) {
      return c.json({ success: false, error: "Access token is required" }, 400);
    }

    const cleanToken = token.trim();

    // Call Meta Graph API /me
    const graphRes = await fetch(
      `https://graph.facebook.com/v20.0/me?access_token=${cleanToken}&fields=id,name,category,link,picture{url}`
    );
    const graphData = await graphRes.json();

    if (graphData.error) {
      return c.json({
        success: false,
        error: graphData.error.message || "Invalid Facebook Page Access Token",
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        pageId: graphData.id,
        name: graphData.name,
        category: graphData.category || "E-Commerce",
        picture: graphData.picture?.data?.url || null,
        link: graphData.link || null,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message || "Failed to inspect token" }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. OAUTH BATCH CONNECT (1-CLICK FACEBOOK LOGIN)
// -----------------------------------------------------------------------------
pagesRouter.post("/facebook/oauth-connect", async (c) => {
  try {
    const body = await c.req.json();
    const { pages } = body; // Array of { id, name, accessToken, category }
    let workspaceId = c.req.header("x-workspace-id") || body.workspaceId;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return c.json({ success: false, error: "No Facebook pages selected" }, 400);
    }

    if (!workspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      workspaceId = defaultWs?.id;
    }

    if (!workspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const connectedPages = [];

    for (const p of pages) {
      if (!p.id || !p.accessToken) continue;

      // 1. Auto-subscribe app to Page Webhook via Graph API
      try {
        await fetch(
          `https://graph.facebook.com/v20.0/${p.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${p.accessToken}`,
          { method: "POST" }
        );
      } catch (subErr) {
        console.warn(`[OAuth Webhook Subscribe] Error on page ${p.id}:`, subErr);
      }

      // 2. Encrypt token
      const { encryptedData, iv, tag } = encryptToken(p.accessToken.trim(), config.tokenEncryptionKey);
      const verifyToken = `mogent_${crypto.randomBytes(12).toString("hex")}`;

      const saved = await prisma.facebookPage.upsert({
        where: { pageId: p.id.trim() },
        update: {
          name: p.name?.trim() || "Facebook Page",
          category: p.category || "E-Commerce",
          encryptedAccessToken: encryptedData,
          tokenIv: iv,
          tokenTag: tag,
          isActive: true,
          webhookSubscribed: true,
        },
        create: {
          workspaceId,
          pageId: p.id.trim(),
          name: p.name?.trim() || "Facebook Page",
          category: p.category || "E-Commerce",
          encryptedAccessToken: encryptedData,
          tokenIv: iv,
          tokenTag: tag,
          verifyToken,
          webhookSubscribed: true,
          aiMode: AiMode.AUTO,
          systemPrompt: "You are a polite AI customer service executive.",
          aiTemperature: 0.3,
          isActive: true,
        },
      });

      connectedPages.push({
        id: saved.id,
        name: saved.name,
        pageId: saved.pageId,
        category: saved.category,
        aiMode: saved.aiMode,
        webhookStatus: "SUBSCRIBED",
      });
    }

    return c.json({
      success: true,
      message: `Successfully connected ${connectedPages.length} Facebook Page(s)!`,
      data: connectedPages,
    });
  } catch (error: any) {
    console.error("Error in OAuth batch connect:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 5. CONNECT SINGLE PAGE (MANUAL WITH AUTO-DETECT)
// -----------------------------------------------------------------------------
pagesRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    let { name, pageId, accessToken, systemPrompt, aiMode, category } = body;
    let workspaceId = c.req.header("x-workspace-id") || body.workspaceId;

    if (!accessToken || !accessToken.trim()) {
      return c.json({ success: false, error: "Access Token is required" }, 400);
    }

    const cleanToken = accessToken.trim();

    // Auto-detect Page ID and Name from Graph API if missing
    if (!pageId || !name) {
      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/v20.0/me?access_token=${cleanToken}&fields=id,name,category`
        );
        const graphData = await graphRes.json();
        if (graphData && graphData.id) {
          if (!pageId) pageId = graphData.id;
          if (!name) name = graphData.name;
          if (!category) category = graphData.category;
        }
      } catch (detectErr) {
        console.warn("Auto-detect failed:", detectErr);
      }
    }

    if (!pageId || !name) {
      return c.json({ success: false, error: "Could not auto-detect Page Name or Page ID. Please check the token." }, 400);
    }

    // Auto-subscribe page to webhook in Meta
    try {
      await fetch(
        `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${cleanToken}`,
        { method: "POST" }
      );
    } catch (subErr) {
      console.warn("Auto-subscribe webhook error:", subErr);
    }

    if (!workspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      workspaceId = defaultWs?.id;
    }

    if (!workspaceId) {
      const newWs = await prisma.workspace.create({
        data: { name: "Default Workspace", slug: "default-ws" },
      });
      workspaceId = newWs.id;
    }

    // Encrypt the Access Token using AES-256-GCM
    const { encryptedData, iv, tag } = encryptToken(cleanToken, config.tokenEncryptionKey);
    const verifyToken = `mogent_${crypto.randomBytes(12).toString("hex")}`;

    const validAiMode = Object.values(AiMode).includes(aiMode) ? aiMode : AiMode.AUTO;

    const page = await prisma.facebookPage.upsert({
      where: { pageId: pageId.trim() },
      update: {
        name: name.trim(),
        encryptedAccessToken: encryptedData,
        tokenIv: iv,
        tokenTag: tag,
        systemPrompt: systemPrompt?.trim() || "You are a polite AI customer service executive.",
        aiMode: validAiMode,
        category: category || "E-Commerce",
        isActive: true,
        webhookSubscribed: true,
      },
      create: {
        workspaceId,
        pageId: pageId.trim(),
        name: name.trim(),
        category: category || "E-Commerce",
        encryptedAccessToken: encryptedData,
        tokenIv: iv,
        tokenTag: tag,
        verifyToken,
        webhookSubscribed: true,
        aiMode: validAiMode,
        systemPrompt: systemPrompt?.trim() || "You are a polite AI customer service executive.",
        aiTemperature: 0.3,
        isActive: true,
      },
    });

    return c.json({
      success: true,
      data: {
        id: page.id,
        name: page.name,
        pageId: page.pageId,
        category: page.category,
        aiMode: page.aiMode,
        webhookStatus: "SUBSCRIBED",
        systemPrompt: page.systemPrompt,
        temperature: page.aiTemperature,
      },
    });
  } catch (error: any) {
    console.error("Error connecting Facebook page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 6. UPDATE PAGE SETTINGS (AI Mode, System Prompt, Temperature)
// -----------------------------------------------------------------------------
pagesRouter.patch("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const { aiMode, systemPrompt, temperature, businessName, businessDescription, isActive } = body;

    const updateData: any = {};
    if (aiMode && Object.values(AiMode).includes(aiMode)) updateData.aiMode = aiMode;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (temperature !== undefined) updateData.aiTemperature = Number(temperature);
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.facebookPage.update({
      where: { id },
      data: updateData,
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 7. DELETE PAGE
// -----------------------------------------------------------------------------
pagesRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.facebookPage.delete({
      where: { id },
    });
    return c.json({ success: true, message: "Page disconnected successfully" });
  } catch (error: any) {
    console.error("Error deleting page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 8. GET WHATSAPP CONFIGURATION
// -----------------------------------------------------------------------------
import { redisConnection } from "../redis";

pagesRouter.get("/whatsapp/config", async (c) => {
  const workspaceId = c.req.header("x-workspace-id") || "default";
  try {
    let raw = await redisConnection.get(`mogent:whatsapp_config:${workspaceId}`);
    if (!raw && workspaceId !== "default") {
      raw = await redisConnection.get("mogent:whatsapp_config:default");
    }
    const saved = raw ? JSON.parse(raw) : {};

    return c.json({
      success: true,
      data: {
        phoneNumber: saved.phoneNumber || "",
        phoneNumberId: saved.phoneNumberId || "",
        wabaId: saved.wabaId || "",
        accessToken: saved.accessToken || "",
        autoReplyEnabled: saved.autoReplyEnabled ?? true,
        webhookUrl: "https://api.mogent.tech/api/webhook/whatsapp",
        verifyToken: "mogent_fb_verify_token_secure",
        isConnected: Boolean(saved.phoneNumberId && saved.accessToken),
      },
    });
  } catch (error: any) {
    console.error("Error fetching WhatsApp config:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 9. SAVE WHATSAPP CONFIGURATION
// -----------------------------------------------------------------------------
pagesRouter.post("/whatsapp/config", async (c) => {
  const workspaceId = c.req.header("x-workspace-id") || "default";
  try {
    const body = await c.req.json();
    const { phoneNumber, phoneNumberId, wabaId, accessToken, autoReplyEnabled } = body;

    const configData = {
      phoneNumber: (phoneNumber || "").trim(),
      phoneNumberId: (phoneNumberId || "").trim(),
      wabaId: (wabaId || "").trim(),
      accessToken: (accessToken || "").trim(),
      autoReplyEnabled: autoReplyEnabled ?? true,
      updatedAt: new Date().toISOString(),
    };

    await Promise.all([
      redisConnection.set(
        `mogent:whatsapp_config:${workspaceId}`,
        JSON.stringify(configData)
      ),
      redisConnection.set(
        "mogent:whatsapp_config:default",
        JSON.stringify(configData)
      ),
    ]);

    if (workspaceId && workspaceId !== "default") {
      try {
        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            whatsAppNumber: configData.phoneNumber || undefined,
          },
        });
      } catch {}
    }

    return c.json({
      success: true,
      message: "WhatsApp configuration saved successfully!",
      data: configData,
    });
  } catch (error: any) {
    console.error("Error saving WhatsApp config:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 10. TEST WHATSAPP CONNECTION / MESSAGE
// -----------------------------------------------------------------------------
pagesRouter.post("/whatsapp/test", async (c) => {
  const workspaceId = c.req.header("x-workspace-id") || "default";
  try {
    const body = await c.req.json();
    const { testPhone } = body;

    let raw = await redisConnection.get(`mogent:whatsapp_config:${workspaceId}`);
    if (!raw && workspaceId !== "default") {
      raw = await redisConnection.get("mogent:whatsapp_config:default");
    }
    const saved = raw ? JSON.parse(raw) : {};

    if (!saved.phoneNumberId || !saved.accessToken) {
      return c.json({
        success: false,
        error: "Phone Number ID এবং Access Token সংরক্ষণ করা হয়নি। অনুগ্রহ করে আগে সেটিংস সেভ করুন।",
      }, 400);
    }

    const cleanPhone = (testPhone || saved.phoneNumber || "").replace(/\D/g, "");
    if (!cleanPhone) {
      return c.json({
        success: false,
        error: "টেস্ট করার জন্য একটি কাস্টমার ফোন নম্বর লিখুন।",
      }, 400);
    }

    // Call WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${saved.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${saved.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: {
            body: "🎉 [Mogent AI] অভিনন্দন! আপনার WhatsApp Cloud API সফলভাবে কানেক্ট হয়েছে।",
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      let friendlyError = data.error.message || "Meta API Error";
      if (friendlyError.includes("Unsupported post request") || friendlyError.includes("does not exist")) {
        friendlyError = `Meta Error: Phone Number ID '${saved.phoneNumberId}' টি কাজ করছে না। নিশ্চিত করুন আপনি WABA ID না দিয়ে Phone Number ID দিয়েছেন এবং Meta Business Settings -> System Users -> 'Assign Assets'-এ WhatsApp Account যুক্ত করে Manage পারমিশন দিয়েছেন।`;
      } else if (data.error.code === 190) {
        friendlyError = "Meta Error: Access Token টি সঠিক নয় বা মেয়াদোত্তীর্ণ। Business Manager System User থেকে তৈরি পার্মানেন্ট টোকেন ব্যবহার করুন।";
      }
      return c.json({
        success: false,
        error: friendlyError,
      }, 400);
    }

    // Also record the test message in DB so it immediately appears in the Mogent Inbox
    try {
      const page = (workspaceId && workspaceId !== "default"
        ? await prisma.facebookPage.findFirst({ where: { workspaceId } })
        : null) || await prisma.facebookPage.findFirst();

      if (page) {
        const targetPsid = `wa_${cleanPhone}`;
        let customer = await prisma.customer.findFirst({
          where: {
            facebookPageId: page.id,
            OR: [{ psid: targetPsid }, { phoneNumber: cleanPhone }],
          },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              facebookPageId: page.id,
              psid: targetPsid,
              firstName: "WhatsApp Tester",
              phoneNumber: cleanPhone,
              channel: "WHATSAPP",
              tags: ["WHATSAPP_TEST", "VERIFIED"],
            },
          });
        } else {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { channel: "WHATSAPP" },
          });
        }

        let conv = await prisma.conversation.findFirst({
          where: { customerId: customer.id, facebookPageId: page.id },
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              facebookPageId: page.id,
              customerId: customer.id,
              status: "OPEN",
              channel: "WHATSAPP",
            },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: { channel: "WHATSAPP", updatedAt: new Date() },
          });
        }

        await prisma.message.create({
          data: {
            conversationId: conv.id,
            sender: MessageSender.HUMAN_AGENT,
            content: "🎉 [Mogent AI] অভিনন্দন! আপনার WhatsApp Cloud API সফলভাবে কানেক্ট হয়েছে।",
            status: MessageStatus.SENT,
          },
        });
      }
    } catch (dbErr: any) {
      console.warn("Failed to record test WhatsApp message in DB:", dbErr.message);
    }

    return c.json({
      success: true,
      message: `টেস্ট মেসেজ সফলভাবে ${cleanPhone} নম্বরে পাঠানো হয়েছে!`,
      data,
    });
  } catch (error: any) {
    console.error("Error sending test WhatsApp message:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

