import { Hono } from "hono";
import { config } from "../config";
import { redisConnection } from "../redis";
import { incomingMessagesQueue } from "../queue/message-queue";
import { FacebookWebhookBody, ProcessMessageJobPayload } from "@mogent/shared";
import { prisma } from "@mogent/database";

export const webhookRouter = new Hono();

// Helper to verify Facebook webhook token
const handleVerify = async (c: any) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode !== "subscribe") {
    return c.text("Forbidden: Invalid Hub Mode", 403);
  }

  // Check against config, default token, or Redis custom token
  let redisConfigToken = null;
  try {
    const raw = await redisConnection.get("mogent:meta_developer_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      redisConfigToken = parsed.verifyToken;
    }
  } catch {}

  const validTokens = [
    config.facebook.verifyToken,
    "mogent_fb_verify_token_secure",
    redisConfigToken,
  ].filter(Boolean);

  if (token && validTokens.includes(token)) {
    console.log("✅ Facebook Webhook Handshake verified successfully with challenge:", challenge);
    return c.text(challenge || "", 200);
  }

  // Also check if token matches any page's verifyToken in DB
  if (token) {
    const page = await prisma.facebookPage.findFirst({
      where: { verifyToken: token },
    });
    if (page) {
      console.log(`✅ Webhook verified via Page [${page.name}] verify token.`);
      return c.text(challenge || "", 200);
    }
  }

  console.warn(`❌ Facebook Webhook verification token mismatch. Received: "${token}"`);
  return c.text("Forbidden: Verification Token Mismatch", 403);
};

// Helper to handle incoming Facebook Webhook events
const handleIngest = async (c: any) => {
  try {
    let body: FacebookWebhookBody;

    let rawBody: any = null;
    try {
      rawBody = (c as any).get?.("rawBody");
    } catch {}

    if (rawBody && typeof rawBody === "string") {
      body = JSON.parse(rawBody);
    } else {
      body = await c.req.json();
    }

    if (body.object !== "page") {
      return c.text("Not Found", 404);
    }

    // Process all entries in the webhook batch
    for (const entry of body.entry || []) {
      const pageId = entry.id;

      for (const event of entry.messaging || []) {
        const senderPsid = event.sender?.id;
        const message = event.message;

        // Skip echo messages or messages without valid sender
        if (!senderPsid || !message || (message as any).is_echo) {
          continue;
        }

        const mid = message.mid;

        // Deduplication check via Redis
        if (mid) {
          const deduplicationKey = `fb:mid:${mid}`;
          const isDuplicate = await redisConnection.set(
            deduplicationKey,
            "1",
            "EX",
            600,
            "NX"
          );

          if (!isDuplicate) {
            console.log(`⚡ Duplicate Facebook message ignored: [${mid}]`);
            continue;
          }
        }

        // Determine media attachments
        let mediaType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "FILE" = "TEXT";
        let mediaUrl: string | undefined = undefined;

        if (message.attachments && message.attachments.length > 0) {
          const firstAttachment = message.attachments[0];
          const rawType = firstAttachment.type.toUpperCase();
          if (["IMAGE", "AUDIO", "VIDEO", "FILE"].includes(rawType)) {
            mediaType = rawType as any;
          }
          mediaUrl = firstAttachment.payload?.url;
        }

        const jobPayload: ProcessMessageJobPayload = {
          pageId,
          senderPsid,
          mid: mid || `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          text: message.text || "",
          timestamp: event.timestamp || Date.now(),
          mediaType,
          mediaUrl,
        };

        // Dispatch job to BullMQ queue
        await incomingMessagesQueue.add("process-message", jobPayload, {
          removeOnComplete: true,
          removeOnFail: 100,
        });

        console.log(`📥 [Webhook] Dispatched message from ${senderPsid} (Page: ${pageId}) to BullMQ.`);
      }
    }

    return c.text("EVENT_RECEIVED", 200);
  } catch (error: any) {
    console.error("❌ Webhook Ingestion Error:", error);
    return c.text("Internal Server Error", 500);
  }
};

// -----------------------------------------------------------------------------
// MOUNT ON BOTH "/" AND "/facebook" FOR MAXIMUM COMPATIBILITY
// -----------------------------------------------------------------------------
webhookRouter.get("/", handleVerify);
webhookRouter.get("/facebook", handleVerify);
webhookRouter.post("/", handleIngest);
webhookRouter.post("/facebook", handleIngest);

// -----------------------------------------------------------------------------
// TELEGRAM MASTER BOT WEBHOOK (1-Click Deep Link Pairing & Plan Gating)
// -----------------------------------------------------------------------------
webhookRouter.post("/telegram", async (c) => {
  try {
    const update = await c.req.json();
    const msg = update.message;
    if (!msg || !msg.text) return c.json({ ok: true });

    const chatId = msg.chat?.id;
    const text = msg.text.trim();
    const fromName = msg.from?.first_name || "Merchant";

    // Fetch Master Bot Token from Redis or Config
    let masterBotToken = config.telegram.botToken;
    try {
      const redisVal = await redisConnection.get("mogent:telegram_master_config");
      if (redisVal) {
        const parsed = JSON.parse(redisVal);
        if (parsed.botToken) masterBotToken = parsed.botToken;
      }
    } catch {}

    const sendReply = async (replyText: string) => {
      if (!masterBotToken || !chatId) return;
      try {
        await fetch(`https://api.telegram.org/bot${masterBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: "Markdown" }),
        });
      } catch (err) {
        console.error("Telegram Webhook reply failed:", err);
      }
    };

    // Check for /start or /link parameter, e.g. "/start mg_ws_cm123" or "/link mg_ws_cm123"
    let linkKey: string | null = null;
    if (text.startsWith("/start ")) {
      linkKey = text.replace("/start ", "").trim();
    } else if (text.startsWith("/link ")) {
      linkKey = text.replace("/link ", "").trim();
    } else if (text.startsWith("mg_ws_")) {
      linkKey = text.trim();
    }

    if (linkKey) {
      // Find workspace by ID, slug, or strip "mg_ws_" prefix
      const cleanWsId = linkKey.replace(/^mg_ws_/, "");
      const workspace = await prisma.workspace.findFirst({
        where: {
          OR: [{ id: cleanWsId }, { slug: cleanWsId }, { id: linkKey }],
        },
      });

      if (!workspace) {
        await sendReply("❌ দুঃখিত! এই কানেকশন কি (Link Key)-এর সাথে কোনো Mogent Workspace পাওয়া যায়নি। দয়া করে আপনার ড্যাশবোর্ড থেকে সঠিক লিংক ব্যবহার করুন।");
        return c.json({ ok: true });
      }

      // Check Plan Gating
      const eligiblePlans = ["PRO", "ENTERPRISE"];
      const isEligible = eligiblePlans.includes(workspace.plan.toUpperCase());

      if (!isEligible) {
        await sendReply(
          `⚠️ *আপগ্রেড প্রয়োজন!*\n\nপ্রিয় ${fromName}, আপনার শপ *${workspace.name}* বর্তমানে *${workspace.plan}* প্ল্যানে রয়েছে।\n\nটেলিগ্রাম ইনস্ট্যান্ট কাস্টমার এসকেলেশন ও অর্ডার নোটিফিকেশন সুবিধা পেতে দয়া করে ড্যাশবোর্ড থেকে *Pro* অথবা *Enterprise* প্ল্যানে আপগ্রেড করুন। 🚀`
        );
        return c.json({ ok: true });
      }

      // Upsert TelegramConfig for Workspace
      const existingConfig = await prisma.telegramConfig.findFirst({
        where: { workspaceId: workspace.id },
      });

      if (existingConfig) {
        await prisma.telegramConfig.update({
          where: { id: existingConfig.id },
          data: {
            chatId: String(chatId),
            botToken: masterBotToken,
            isActive: true,
          },
        });
      } else {
        await prisma.telegramConfig.create({
          data: {
            workspaceId: workspace.id,
            chatId: String(chatId),
            botToken: masterBotToken,
            isActive: true,
          },
        });
      }

      await sendReply(
        `✅ *অভিনন্দন!*\n\nআপনার ফেসবুক পেজ/শপ *${workspace.name}* এর সাথে Mogent Alert Bot সফলভাবে কানেক্ট হয়েছে।\n\nএখন থেকে কোনো কাস্টমার ক্ষোভ প্রকাশ করলে, হিউম্যান সহায়তা চাইলে বা নতুন অর্ডার প্লেস করলে সাথে সাথে আপনি এখানে নোটিফিকেশন পেয়ে যাবেন! 🎉`
      );
      return c.json({ ok: true });
    }

    if (text === "/start" || text === "/help") {
      await sendReply(
        `🤖 *স্বাগতম Mogent Alert Bot-এ!*\n\nআপনার ফেসবুক পেজের সাথে এই বটটি কানেক্ট করতে আপনার Mogent ড্যাশবোর্ড (Integrations -> Telegram)-এ গিয়ে *Connect Telegram* বাটনে ক্লিক করুন অথবা কানেকশন কি দিয়ে \`/link <YOUR_KEY>\` মেসেজ পাঠান।`
      );
      return c.json({ ok: true });
    }

    if (text === "/status") {
      const activeConfigs = await prisma.telegramConfig.findMany({
        where: { chatId: String(chatId), isActive: true },
        include: { workspace: true },
      });

      if (activeConfigs.length > 0) {
        const wsNames = activeConfigs.map((c) => `• *${c.workspace.name}* (${c.workspace.plan} Plan)`).join("\n");
        await sendReply(`📱 *কানেক্টেড পেজসমূহ:*\n\n${wsNames}\n\nআপনার এলার্ট সার্ভিস সক্রিয় রয়েছে! ✅`);
      } else {
        await sendReply(`⚠️ বর্তমানে কোনো পেজ এই টেলিগ্রাম অ্যাকাউন্টের সাথে কানেক্টেড নেই। ড্যাশবোর্ড থেকে কানেক্ট করুন।`);
      }
      return c.json({ ok: true });
    }

    return c.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram Webhook processing error:", err);
    return c.json({ ok: true }); // Always return 200 to Telegram
  }
});
