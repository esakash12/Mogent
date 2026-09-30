import { Hono } from "hono";
import { prisma, AiMode, MessageSender, MessageStatus } from "@mogent/database";
import { encryptToken, decryptToken } from "@mogent/shared";
import { config } from "../config";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth";

export const pagesRouter = new Hono();

// Enforce authentication across pages management
pagesRouter.use("*", authMiddleware);

// -----------------------------------------------------------------------------
// 1. GET ALL FACEBOOK PAGES FOR WORKSPACE
// -----------------------------------------------------------------------------
pagesRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    if (!workspaceId) {
      return c.json({ success: true, data: [] });
    }

    const pages = await prisma.facebookPage.findMany({
      where: { workspaceId },
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
    const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id") || body.workspaceId;

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return c.json({ success: false, error: "No Facebook pages selected" }, 400);
    }

    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
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
          workspaceId,
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
    const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id") || body.workspaceId;

    if (!accessToken || !accessToken.trim()) {
      return c.json({ success: false, error: "Access Token is required" }, 400);
    }

    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
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

    // Auto-subscribe page to webhook in Meta with robust response verification
    let isWebSubscribed = false;
    let subscribeMetaError = "";
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v20.0/${pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${cleanToken}`,
        { method: "POST" }
      );
      const subData = (await subRes.json().catch(() => null)) as any;
      if (subData?.success === true) {
        isWebSubscribed = true;
      } else if (subData?.error) {
        subscribeMetaError = subData.error.message || "Meta Webhook subscription rejected by Facebook";
        console.warn(`[Page Connect] Meta Webhook Subscribe failed for page ${pageId}:`, subData.error);
      }
    } catch (subErr: any) {
      subscribeMetaError = subErr.message;
      console.warn("Auto-subscribe webhook error:", subErr.message);
    }

    // Encrypt the Access Token using AES-256-GCM
    const { encryptedData, iv, tag } = encryptToken(cleanToken, config.tokenEncryptionKey);
    const verifyToken = `mogent_${crypto.randomBytes(12).toString("hex")}`;

    const validAiMode = Object.values(AiMode).includes(aiMode) ? aiMode : AiMode.AUTO;

    const page = await prisma.facebookPage.upsert({
      where: { pageId: pageId.trim() },
      update: {
        workspaceId,
        name: name.trim(),
        encryptedAccessToken: encryptedData,
        tokenIv: iv,
        tokenTag: tag,
        systemPrompt: systemPrompt?.trim() || "You are a polite AI customer service executive.",
        aiMode: validAiMode,
        category: category || "E-Commerce",
        isActive: true,
        webhookSubscribed: isWebSubscribed,
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
        webhookSubscribed: isWebSubscribed,
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
        webhookStatus: isWebSubscribed ? "SUBSCRIBED" : "PENDING",
        webhookError: subscribeMetaError || undefined,
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
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const page = await prisma.facebookPage.findFirst({
      where: {
        id,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    if (!page) {
      return c.json({ success: false, error: "Page not found or access denied" }, 404);
    }

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
      where: { id: page.id },
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
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const page = await prisma.facebookPage.findFirst({
      where: {
        id,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    if (!page) {
      return c.json({ success: false, error: "Page not found or access denied" }, 404);
    }

    await prisma.facebookPage.delete({
      where: { id: page.id },
    });
    return c.json({ success: true, message: "Page disconnected successfully" });
  } catch (error: any) {
    console.error("Error deleting page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 7.1 DIAGNOSE PAGE CONNECTION & META WEBHOOK STATUS
// -----------------------------------------------------------------------------
pagesRouter.post("/:id/diagnose", async (c) => {
  const { id } = c.req.param();
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const page = await prisma.facebookPage.findFirst({
      where: {
        id,
        ...(workspaceId ? { workspaceId } : {}),
      },
      include: { workspace: true },
    });

    if (!page) {
      return c.json({ success: false, error: "Page not found or access denied" }, 404);
    }

    const issues: string[] = [];
    const actionableSteps: string[] = [];

    // 1. Check DB Settings
    if (!page.isActive) {
      issues.push("পেজটি Mogent ড্যাশবোর্ডে নিষ্ক্রিয় (Inactive) রয়েছে।");
      actionableSteps.push("ড্যাশবোর্ডে পেজটির 'সক্রিয়' টগলটি চালু করুন।");
    }

    if (page.aiMode === "OFF") {
      issues.push("পেজটির AI Mode বর্তমানে 'OFF' করা আছে।");
      actionableSteps.push("AI Mode টি 'AUTO' অথবা 'HYBRID' করুন।");
    }

    // 2. Decrypt Access Token
    let token = "";
    try {
      token = decryptToken(
        page.encryptedAccessToken,
        page.tokenIv,
        page.tokenTag,
        config.tokenEncryptionKey
      );
    } catch (e: any) {
      return c.json(
        {
          success: false,
          error: "অ্যাক্সেস টোকেন ডিক্রিপ্ট করা সম্ভব হয়নি। অনুগ্রহ করে পেজটি পুনরায় কানেক্ট করুন।",
        },
        400
      );
    }

    if (!token) {
      return c.json(
        {
          success: false,
          error: "পেজের অ্যাক্সেস টোকেন পাওয়া যায়নি।",
        },
        400
      );
    }

    // 3. Test Graph API /me (Token Validity & Token Type)
    let tokenValid = false;
    let tokenType: "PAGE" | "USER" | "UNKNOWN" = "UNKNOWN";
    let metaPageName = "";
    let metaId = "";
    let tokenError = "";

    try {
      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me?access_token=${token}&fields=id,name,category`
      );
      const meData = (await meRes.json()) as any;

      if (meData?.id) {
        tokenValid = true;
        metaId = meData.id;
        metaPageName = meData.name || "";

        if (meData.category || meData.id === page.pageId) {
          tokenType = "PAGE";
        } else {
          // If ID doesn't match pageId and has no category, it's very likely a User Token!
          tokenType = "USER";
        }
      } else if (meData?.error) {
        tokenError = meData.error.message || "Meta token validation failed";
        issues.push(`ফেসবুক টোকেন ইনভ্যালিড বা মেয়াদ শেষ: ${tokenError}`);
        actionableSteps.push("নতুন Page Access Token নিয়ে পেজটি আবার রি-কানেক্ট করুন।");
      }
    } catch (err: any) {
      issues.push(`Meta Graph API কানেক্ট করতে সমস্যা: ${err.message}`);
    }

    // If token is a USER token instead of PAGE token
    if (tokenValid && tokenType === "USER" && metaId !== page.pageId) {
      issues.push("⚠️ এটি একটি ফেসবুক ইউজার টোকেন (User Token), পেজ টোকেন নয়! ইউজার টোকেন দিয়ে পেজে কোনো অটো-রিপ্লাই বা মেসেজ সিন করা যায় না।");
      actionableSteps.push("Meta Graph API Explorer বা Business Manager থেকে উক্ত পেজের 'Page Access Token' সিলেক্ট করে জেনারেট করুন।");
    }

    // 4. Check Permissions (/me/permissions)
    let hasMessagingPermission = false;
    let grantedPermissions: string[] = [];
    try {
      const permRes = await fetch(
        `https://graph.facebook.com/v20.0/me/permissions?access_token=${token}`
      );
      const permData = (await permRes.json()) as any;
      if (Array.isArray(permData?.data)) {
        grantedPermissions = permData.data
          .filter((p: any) => p.status === "granted")
          .map((p: any) => p.permission);

        hasMessagingPermission = grantedPermissions.includes("pages_messaging");
        if (!hasMessagingPermission) {
          issues.push("টোকেনে 'pages_messaging' পারমিশন অনুমোদিত (granted) নেই।");
          actionableSteps.push("টোকেন জেনারেট করার সময় 'pages_messaging', 'pages_manage_metadata', 'pages_read_engagement' পারমিশন সিলেক্ট করুন।");
        }
      }
    } catch {}

    // 5. Check Subscribed Apps (Meta Webhook Subscription)
    let isWebhookSubscribed = false;
    let subscribedFields: string[] = [];
    let autoFixAttempted = false;
    let autoFixSuccess = false;

    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v20.0/${page.pageId}/subscribed_apps?access_token=${token}`
      );
      const subData = (await subRes.json()) as any;
      if (Array.isArray(subData?.data) && subData.data.length > 0) {
        const appSub = subData.data[0];
        subscribedFields = appSub.subscribed_fields || [];
        if (subscribedFields.includes("messages")) {
          isWebhookSubscribed = true;
        }
      }
    } catch {}

    // If not subscribed to messages, attempt AUTO-FIX right now
    if (!isWebhookSubscribed && tokenValid) {
      autoFixAttempted = true;
      try {
        const fixRes = await fetch(
          `https://graph.facebook.com/v20.0/${page.pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${token}`,
          { method: "POST" }
        );
        const fixData = (await fixRes.json().catch(() => null)) as any;
        if (fixData?.success === true) {
          autoFixSuccess = true;
          isWebhookSubscribed = true;
          subscribedFields = ["messages", "messaging_postbacks", "message_reads", "message_deliveries"];
          await prisma.facebookPage.update({
            where: { id: page.id },
            data: { webhookSubscribed: true },
          });
        } else if (fixData?.error) {
          issues.push(`মেটা অটো-সাবস্ক্রিপশন ব্যর্থ: ${fixData.error.message}`);
        }
      } catch (fixErr: any) {
        issues.push(`মেটা সাবস্ক্রিপশন রিকোয়েস্ট ফেইল্ড: ${fixErr.message}`);
      }
    }

    if (!isWebhookSubscribed) {
      issues.push("ফেসবুক পেজটি মেটা অ্যাপের সাথে সাবস্ক্রাইব করা নেই (Subscribed Apps missing)। ফলে ফেসবুক কোনো মেসেজ ইভেন্ট Mogent-এ পাঠাচ্ছে না।");
      actionableSteps.push("নিচের 'Webhook Re-Subscribe' বাটনে ক্লিক করে পেজটি মেটা অ্যাপের সাথে লিঙ্ক করুন।");
    }

    // 6. Meta App Mode Guidance (Development vs Live Mode)
    actionableSteps.push(
      "📌 মেটা রুল: আপনার Meta App যদি 'In Development' মোডে থাকে, তবে শুধুমাত্র যে ফেসবুক অ্যাকাউন্টকে Meta App-এর 'App Roles -> Roles -> Developers / Testers' হিসেবে যুক্ত করা হয়েছে, শুধুমাত্র সেই অ্যাকাউন্ট থেকে পাঠানো মেসেজেই অটো-রিপ্লাই ও সিন কাজ করবে। সাধারণ কাস্টমারদের জন্য কাজ করাতে হলে অ্যাপটিকে 'Live Mode'-এ নিতে হবে অথবা আপনার টেস্ট আইডিকে Tester হিসেবে যুক্ত করতে হবে।"
    );

    return c.json({
      success: true,
      data: {
        pageId: page.pageId,
        pageName: page.name,
        isActive: page.isActive,
        aiMode: page.aiMode,
        tokenValid,
        tokenType,
        metaPageName,
        metaId,
        isTokenMatchingPage: metaId === page.pageId,
        hasMessagingPermission,
        grantedPermissions,
        isWebhookSubscribed,
        subscribedFields,
        autoFixAttempted,
        autoFixSuccess,
        webhookCallbackUrl: "https://api.mogent.tech/webhook/facebook",
        verifyToken: config.facebook.verifyToken,
        issues,
        actionableSteps,
      },
    });
  } catch (error: any) {
    console.error("Error diagnosing Facebook page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 7.2 FORCE RE-SUBSCRIBE WEBHOOK TO META
// -----------------------------------------------------------------------------
pagesRouter.post("/:id/resubscribe", async (c) => {
  const { id } = c.req.param();
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const page = await prisma.facebookPage.findFirst({
      where: {
        id,
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    if (!page) {
      return c.json({ success: false, error: "Page not found or access denied" }, 404);
    }

    let token = "";
    try {
      token = decryptToken(
        page.encryptedAccessToken,
        page.tokenIv,
        page.tokenTag,
        config.tokenEncryptionKey
      );
    } catch {
      return c.json({ success: false, error: "Failed to decrypt token" }, 400);
    }

    const subRes = await fetch(
      `https://graph.facebook.com/v20.0/${page.pageId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${token}`,
      { method: "POST" }
    );
    const subData = (await subRes.json().catch(() => null)) as any;

    if (subData?.success === true) {
      await prisma.facebookPage.update({
        where: { id: page.id },
        data: { webhookSubscribed: true },
      });
      return c.json({
        success: true,
        message: "সফলভাবে মেটা ওয়েবহুক সাবস্ক্রাইব করা হয়েছে! এখন মেসেজ আদান-প্রদান চালু থাকবে।",
        data: subData,
      });
    } else {
      const errMsg = subData?.error?.message || "Meta Webhook subscription failed";
      return c.json(
        {
          success: false,
          error: errMsg,
          metaError: subData?.error,
        },
        400
      );
    }
  } catch (error: any) {
    console.error("Error resubscribing webhook:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 8. GET WHATSAPP CONFIGURATION
// -----------------------------------------------------------------------------
pagesRouter.get("/whatsapp/config", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        whatsAppNumber: true,
        whatsAppPhoneNumberId: true,
        whatsAppWabaId: true,
        whatsAppAccessToken: true,
        whatsAppAutoReply: true,
      },
    });

    let saved: any = {
      phoneNumber: ws?.whatsAppNumber || "",
      phoneNumberId: ws?.whatsAppPhoneNumberId || "",
      wabaId: ws?.whatsAppWabaId || "",
      accessToken: ws?.whatsAppAccessToken || "",
      autoReplyEnabled: ws?.whatsAppAutoReply ?? true,
    };

    if (!saved.accessToken && !saved.phoneNumberId) {
      // Fallback to PostgreSQL system_settings table for this workspace
      const dbSetting = await prisma.systemSetting.findUnique({
        where: { key: `mogent:whatsapp_config:${workspaceId}` },
      });
      if (dbSetting?.value) {
        try {
          const parsed = JSON.parse(dbSetting.value);
          saved = { ...saved, ...parsed };
        } catch {}
      }
    }

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
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const { phoneNumber, phoneNumberId, wabaId, accessToken, autoReplyEnabled } = body;

    const cleanPhone = (phoneNumber || "").trim();
    const cleanPhoneId = (phoneNumberId || "").trim();
    const cleanWabaId = (wabaId || "").trim();
    const cleanToken = (accessToken || "").trim();
    const autoReply = autoReplyEnabled ?? true;

    // 100% Persistent in PostgreSQL Workspace Record
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        whatsAppNumber: cleanPhone || null,
        whatsAppPhoneNumberId: cleanPhoneId || null,
        whatsAppWabaId: cleanWabaId || null,
        whatsAppAccessToken: cleanToken || null,
        whatsAppAutoReply: autoReply,
      },
    });

    const configData = {
      phoneNumber: cleanPhone,
      phoneNumberId: cleanPhoneId,
      wabaId: cleanWabaId,
      accessToken: cleanToken,
      autoReplyEnabled: autoReply,
      updatedAt: new Date().toISOString(),
    };

    // Also persist in system_settings for redundancy
    await prisma.systemSetting.upsert({
      where: { key: `mogent:whatsapp_config:${workspaceId}` },
      update: { value: JSON.stringify(configData) },
      create: { key: `mogent:whatsapp_config:${workspaceId}`, value: JSON.stringify(configData) },
    }).catch(() => {});

    try {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          whatsAppNumber: configData.phoneNumber || undefined,
        },
      });
    } catch {}

    // Auto-create or ensure dedicated WhatsApp facebookPage exists for this workspace
    try {
      const existingPage = await prisma.facebookPage.findFirst({
        where: {
          workspaceId,
          OR: [
            { category: "WhatsApp" },
            { name: { contains: "WhatsApp", mode: "insensitive" } },
          ],
        },
      });
      if (!existingPage) {
        await prisma.facebookPage.create({
          data: {
            workspaceId,
            name: "WhatsApp Official",
            pageId: `wa_page_${workspaceId}_${configData.phoneNumberId || Date.now()}`,
            encryptedAccessToken: "direct_whatsapp",
            tokenIv: "000000000000000000000000",
            tokenTag: "00000000000000000000000000000000",
            category: "WhatsApp",
            verifyToken: "mogent_fb_verify_token_secure",
            aiMode: AiMode.AUTO,
            systemPrompt: "You are a professional WhatsApp AI assistant.",
          },
        });
      }
    } catch (pageErr: any) {
      console.warn("Auto-create WhatsApp facebookPage warning:", pageErr.message);
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
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const { testPhone } = body;

    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { whatsAppPhoneNumberId: true, whatsAppAccessToken: true, whatsAppNumber: true },
    });

    const saved = {
      phoneNumberId: ws?.whatsAppPhoneNumberId || "",
      accessToken: ws?.whatsAppAccessToken || "",
      phoneNumber: ws?.whatsAppNumber || "",
    };

    if (!saved.phoneNumberId || !saved.accessToken) {
      const dbSetting = await prisma.systemSetting.findUnique({
        where: { key: `mogent:whatsapp_config:${workspaceId}` },
      });
      if (dbSetting?.value) {
        try {
          const parsed = JSON.parse(dbSetting.value);
          if (parsed.phoneNumberId) saved.phoneNumberId = parsed.phoneNumberId;
          if (parsed.accessToken) saved.accessToken = parsed.accessToken;
          if (parsed.phoneNumber) saved.phoneNumber = parsed.phoneNumber;
        } catch {}
      }
    }

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
        ? await prisma.facebookPage.findFirst({
            where: {
              workspaceId,
              OR: [
                { category: "WhatsApp" },
                { name: { contains: "WhatsApp", mode: "insensitive" } },
              ],
            },
          }) || await prisma.facebookPage.findFirst({ where: { workspaceId } })
        : null) || await prisma.facebookPage.findFirst();

      if (page) {
        const targetPsid = `wa_${cleanPhone}`;
        let customer = await prisma.customer.findFirst({
          where: {
            OR: [
              { workspaceId: page.workspaceId },
              { facebookPageId: page.id },
              { facebookPage: { workspaceId: page.workspaceId } },
            ],
            AND: [
              {
                OR: [{ psid: targetPsid }, { phoneNumber: cleanPhone }],
              },
            ],
          },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              workspaceId: page.workspaceId,
              facebookPageId: page.id,
              psid: targetPsid,
              firstName: "WhatsApp Tester",
              phoneNumber: cleanPhone,
              channel: "WHATSAPP",
              tags: ["WHATSAPP_TEST", "VERIFIED"],
            },
          });
        } else {
          const updateData: any = { channel: "WHATSAPP" };
          if (!customer.workspaceId) {
            updateData.workspaceId = page.workspaceId;
          }
          await prisma.customer.update({
            where: { id: customer.id },
            data: updateData,
          });
        }

        let conv = await prisma.conversation.findFirst({
          where: {
            customerId: customer.id,
            channel: "WHATSAPP",
            OR: [
              { workspaceId: page.workspaceId },
              { facebookPageId: page.id },
            ],
          },
          orderBy: { updatedAt: "desc" },
        });

        if (!conv) {
          conv = await prisma.conversation.create({
            data: {
              workspaceId: page.workspaceId,
              facebookPageId: page.id,
              customerId: customer.id,
              status: "OPEN",
              channel: "WHATSAPP",
            },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              workspaceId: conv.workspaceId || page.workspaceId,
              channel: "WHATSAPP",
              updatedAt: new Date(),
            },
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

// POST /api/pages/purge-data - Danger Zone: Purge workspace conversations, contacts, and knowledge
pagesRouter.post("/purge-data", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    const pages = await prisma.facebookPage.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const pageIds = pages.map((p) => p.id);

    let deletedConversationsCount = 0;
    let deletedCustomersCount = 0;
    let deletedKnowledgeCount = 0;

    if (pageIds.length > 0) {
      const convDelete = await prisma.conversation.deleteMany({
        where: { facebookPageId: { in: pageIds } },
      });
      deletedConversationsCount = convDelete.count;

      const custDelete = await prisma.customer.deleteMany({
        where: { facebookPageId: { in: pageIds } },
      });
      deletedCustomersCount = custDelete.count;
    }

    const kbDelete = await prisma.knowledgeBase.deleteMany({
      where: { workspaceId },
    });
    deletedKnowledgeCount = kbDelete.count;

    return c.json({
      success: true,
      message: "Workspace data purged successfully!",
      data: {
        deletedConversationsCount,
        deletedCustomersCount,
        deletedKnowledgeCount,
      },
    });
  } catch (error: any) {
    console.error("Purge workspace data error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

