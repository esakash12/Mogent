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
