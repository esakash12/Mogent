import crypto from "crypto";
import { Hono } from "hono";
import { config } from "../config";
import { redisConnection } from "../redis";
import { incomingMessagesQueue } from "../queue/message-queue";
import { FacebookWebhookBody, ProcessMessageJobPayload, decryptToken } from "@mogent/shared";
import { prisma, MessageSender, MessageStatus, AiMode } from "@mogent/database";
import { storageService } from "../services/storage";

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

function verifyMetaSignature(signatureHeader: string | undefined, rawBody: string, appSecret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const signature = signatureHeader.substring(7);
  try {
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"));
  } catch {
    return false;
  }
}

// Helper to handle incoming Facebook Webhook events
const handleIngest = async (c: any) => {
  try {
    let body: FacebookWebhookBody;
    let rawBody: string = "";

    try {
      rawBody = (c as any).get?.("rawBody") || (await c.req.text());
    } catch {}

    const appSecret = (config.facebook.appSecret || process.env.FACEBOOK_APP_SECRET || "").trim();
    if (appSecret && rawBody) {
      const sig = c.req.header("X-Hub-Signature-256") || c.req.header("x-hub-signature-256");
      if (sig) {
        const isValid = verifyMetaSignature(sig, rawBody, appSecret);
        if (!isValid) {
          console.warn("❌ [Facebook Webhook] Invalid X-Hub-Signature-256 signature");
          return c.text("Forbidden: Invalid Signature", 403);
        }
      }
    }

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

        // Determine media attachments & check for Facebook stickers / likes
        let mediaType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "FILE" = "TEXT";
        let mediaUrl: string | undefined = undefined;
        let attachmentFileName: string | undefined = undefined;
        let messageText = message.text || "";

        if (message.attachments && message.attachments.length > 0) {
          const firstAttachment = message.attachments[0];
          const rawType = (firstAttachment.type || "").toUpperCase();
          const isSticker = Boolean((firstAttachment.payload as any)?.sticker_id) || rawType === "STICKER";

          if (isSticker) {
            mediaType = "TEXT";
            mediaUrl = undefined;
            if (!messageText) {
              messageText = "👍";
            }
          } else if (["IMAGE", "AUDIO", "VIDEO", "FILE", "FALLBACK"].includes(rawType)) {
            const isDoc = rawType === "FILE" || rawType === "FALLBACK" || (firstAttachment.payload?.url || "").toLowerCase().includes(".pdf");
            mediaType = (isDoc ? "FILE" : rawType === "IMAGE" ? "IMAGE" : "FILE") as any;
            const tempUrl = firstAttachment.payload?.url;
            if (tempUrl) {
              try {
                const ext = isDoc ? "pdf" : rawType === "IMAGE" ? "jpg" : "dat";
                attachmentFileName = (firstAttachment.payload as any)?.title || `document_${Date.now()}.${ext}`;
                const dlRes = await fetch(tempUrl, {
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                  },
                });
                if (dlRes.ok) {
                  const buf = Buffer.from(await dlRes.arrayBuffer());
                  const r2 = await storageService.uploadFile(
                    buf,
                    attachmentFileName || `attachment_${Date.now()}.${isDoc ? "pdf" : "jpg"}`,
                    dlRes.headers.get("content-type") || (isDoc ? "application/pdf" : "image/jpeg"),
                    "inbox"
                  );
                  mediaUrl = r2.url;
                } else {
                  mediaUrl = tempUrl;
                }
              } catch {
                mediaUrl = tempUrl;
              }
            }
            if (!messageText) {
              messageText = isDoc ? `[Document: ${attachmentFileName || "file.pdf"}]` : rawType === "IMAGE" ? "[Image]" : "[Attachment]";
            }
          }
        }

        const jobPayload: ProcessMessageJobPayload = {
          pageId,
          senderPsid,
          mid: mid || `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          text: messageText,
          timestamp: event.timestamp || Date.now(),
          mediaType,
          mediaUrl,
          fileName: attachmentFileName,
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
      if (!masterBotToken || !chatId) {
        console.warn("Cannot send Telegram reply: Missing masterBotToken or chatId", { masterBotToken: Boolean(masterBotToken), chatId });
        return;
      }
      try {
        const res = await fetch(`https://api.telegram.org/bot${masterBotToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: "Markdown" }),
        });
        const json = await res.json();
        if (!json.ok) {
          console.warn("Telegram sendMessage response not OK:", json);
          // Retry without Markdown if formatting caused error
          await fetch(`https://api.telegram.org/bot${masterBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: replyText.replace(/[*_`]/g, "") }),
          });
        }
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
      const eligiblePlans = ["PRO", "ENTERPRISE", "BUSINESS", "GROWTH"];
      const planUpper = (workspace.plan || "FREE").toUpperCase();
      const isEligible =
        eligiblePlans.includes(planUpper) ||
        Boolean(workspace.planExpiresAt && new Date(workspace.planExpiresAt) > new Date());

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

// -----------------------------------------------------------------------------
// 3. WHATSAPP CLOUD API / TWILIO WEBHOOKS
// -----------------------------------------------------------------------------

// Helper to resolve target workspace for incoming WhatsApp webhook events
async function resolveWhatsAppWorkspace(
  phoneNumberId?: string,
  displayPhone?: string,
  wabaId?: string
): Promise<string | null> {
  const cleanPhone = displayPhone ? displayPhone.replace(/\D/g, "") : "";

  // 1. Check Redis reverse lookup caches
  if (phoneNumberId) {
    try {
      const cached = await redisConnection.get(`mogent:wa_phone_id_to_ws:${phoneNumberId}`);
      if (cached) return cached;
    } catch {}
  }

  if (cleanPhone) {
    try {
      const cached = await redisConnection.get(`mogent:wa_phone_to_ws:${cleanPhone}`);
      if (cached) return cached;
    } catch {}
  }

  // 2. Auto-scan existing Redis whatsapp configs (Auto-resolves already configured workspaces)
  try {
    const keys = await redisConnection.keys("mogent:whatsapp_config:*");
    for (const key of keys) {
      if (key.endsWith(":default")) continue;
      const raw = await redisConnection.get(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const wsId = key.replace("mogent:whatsapp_config:", "");
          const parsedPhone = (parsed.phoneNumber || "").replace(/\D/g, "");
          const parsedPhoneId = parsed.phoneNumberId;
          const parsedWabaId = parsed.wabaId;

          const matchPhoneId = Boolean(phoneNumberId && parsedPhoneId && parsedPhoneId === phoneNumberId);
          const matchPhone = Boolean(
            cleanPhone &&
            parsedPhone &&
            (cleanPhone === parsedPhone || cleanPhone.endsWith(parsedPhone) || parsedPhone.endsWith(cleanPhone))
          );
          const matchWaba = Boolean(wabaId && parsedWabaId && parsedWabaId === wabaId);

          if (matchPhoneId || matchPhone || matchWaba) {
            // Cache reverse mappings for 7 days for fast future lookups
            if (phoneNumberId) {
              await redisConnection.set(`mogent:wa_phone_id_to_ws:${phoneNumberId}`, wsId, "EX", 7 * 86400);
            }
            if (cleanPhone) {
              await redisConnection.set(`mogent:wa_phone_to_ws:${cleanPhone}`, wsId, "EX", 7 * 86400);
            }
            return wsId;
          }
        } catch {}
      }
    }
  } catch (scanErr) {
    console.warn("Failed scanning WhatsApp configs in Redis:", scanErr);
  }

  // 3. Check Workspace DB records by whatsAppNumber
  if (cleanPhone) {
    try {
      const last10 = cleanPhone.slice(-10);
      const ws = await prisma.workspace.findFirst({
        where: {
          whatsAppNumber: { contains: last10 },
        },
        select: { id: true },
      });
      if (ws) {
        if (phoneNumberId) {
          await redisConnection.set(`mogent:wa_phone_id_to_ws:${phoneNumberId}`, ws.id, "EX", 7 * 86400);
        }
        if (cleanPhone) {
          await redisConnection.set(`mogent:wa_phone_to_ws:${cleanPhone}`, ws.id, "EX", 7 * 86400);
        }
        return ws.id;
      }
    } catch {}
  }

  // 4. Safe single-tenant fallback to first workspace in DB
  try {
    const ws = await prisma.workspace.findFirst({ select: { id: true } });
    if (ws) {
      if (phoneNumberId) {
        await redisConnection.set(`mogent:wa_phone_id_to_ws:${phoneNumberId}`, ws.id, "EX", 7 * 86400);
      }
      return ws.id;
    }
  } catch {}

  return null;
}

// Helper to retrieve WhatsApp access token across Redis, PostgreSQL system_settings, and DB records
async function getWhatsAppAccessToken(targetWorkspaceId?: string): Promise<string | null> {
  // 1. Check Redis for target workspace
  if (targetWorkspaceId) {
    try {
      const raw = await redisConnection.get(`mogent:whatsapp_config:${targetWorkspaceId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.accessToken) return parsed.accessToken;
      }
    } catch {}
  }

  // 2. Check Redis for default config
  try {
    const rawDefault = await redisConnection.get("mogent:whatsapp_config:default");
    if (rawDefault) {
      const parsed = JSON.parse(rawDefault);
      if (parsed.accessToken) return parsed.accessToken;
    }
  } catch {}

  // 3. Check PostgreSQL system_settings for target workspace
  if (targetWorkspaceId) {
    try {
      const dbSetting = await prisma.systemSetting.findUnique({
        where: { key: `mogent:whatsapp_config:${targetWorkspaceId}` },
      });
      if (dbSetting?.value) {
        const parsed = JSON.parse(dbSetting.value);
        if (parsed.accessToken) {
          await redisConnection.set(`mogent:whatsapp_config:${targetWorkspaceId}`, dbSetting.value).catch(() => {});
          return parsed.accessToken;
        }
      }
    } catch {}
  }

  // 4. Check PostgreSQL system_settings for default
  try {
    const dbDefault = await prisma.systemSetting.findUnique({
      where: { key: "mogent:whatsapp_config:default" },
    });
    if (dbDefault?.value) {
      const parsed = JSON.parse(dbDefault.value);
      if (parsed.accessToken) return parsed.accessToken;
    }
  } catch {}

  // 5. Scan any mogent:whatsapp_config:* keys in Redis
  try {
    const keys = await redisConnection.keys("mogent:whatsapp_config:*");
    for (const k of keys) {
      const val = await redisConnection.get(k);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed.accessToken) return parsed.accessToken;
        } catch {}
      }
    }
  } catch {}

  // 6. Check PostgreSQL systemSetting for any whatsapp config
  try {
    const anySetting = await prisma.systemSetting.findFirst({
      where: { key: { startsWith: "mogent:whatsapp_config:" } },
    });
    if (anySetting?.value) {
      const parsed = JSON.parse(anySetting.value);
      if (parsed.accessToken) return parsed.accessToken;
    }
  } catch {}

  // 7. Check FacebookPage table for any WhatsApp page token
  try {
    const waPage = await prisma.facebookPage.findFirst({
      where: {
        OR: [
          { category: "WhatsApp" },
          { name: { contains: "WhatsApp", mode: "insensitive" } },
        ],
        NOT: { encryptedAccessToken: "direct_whatsapp" },
      },
    });
    if (waPage?.encryptedAccessToken) {
      const token = decryptToken(waPage.encryptedAccessToken, waPage.tokenIv, waPage.tokenTag, config.tokenEncryptionKey);
      if (token) return token;
    }
  } catch {}

  return process.env.WHATSAPP_ACCESS_TOKEN || null;
}

// Helper to perform Two-Step Authenticated Media Download from Meta WhatsApp Graph API
async function downloadAndStoreWhatsAppMedia(
  mediaId: string,
  filename: string,
  defaultMimeType: string,
  accessToken: string
): Promise<{ url: string; mimeType: string } | null> {
  try {
    const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

    // Step (a): GET media metadata from Graph API with Bearer token
    const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": browserUserAgent,
        Accept: "application/json",
      },
    });
    if (!metaRes.ok) {
      console.warn(`WhatsApp media metadata fetch failed (${metaRes.status}): ${metaRes.statusText}`);
      return null;
    }
    const metaData = await metaRes.json();
    if (!metaData || !metaData.url) {
      console.warn("No download URL in WhatsApp media metadata:", metaData);
      return null;
    }

    const downloadUrl = metaData.url;
    const mimeType = metaData.mime_type || defaultMimeType;

    // Step (b): GET binary file from media URL ALSO with Bearer token & browser User-Agent
    const fileRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": browserUserAgent,
        Accept: "*/*",
      },
    });
    if (!fileRes.ok) {
      console.warn(`WhatsApp media binary download failed (${fileRes.status}): ${fileRes.statusText}`);
      return null;
    }

    const buffer = Buffer.from(await fileRes.arrayBuffer());

    // Upload to Cloudflare R2 (or graceful fallback to data URL)
    const uploadRes = await storageService.uploadFile(buffer, filename, mimeType, "inbox");
    return {
      url: uploadRes.url,
      mimeType,
    };
  } catch (err: any) {
    console.warn("Graceful fallback in downloadAndStoreWhatsAppMedia:", err.message);
    return null;
  }
}

// Verification Handshake
webhookRouter.get("/whatsapp", handleVerify);

// Ingestion of WhatsApp messages
webhookRouter.post("/whatsapp", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));

    // WhatsApp Cloud API payload format
    if (body.object === "whatsapp_business_account" || body.entry) {
      for (const entry of body.entry || []) {
        const wabaId = entry.id;
        for (const change of entry.changes || []) {
          const value = change.value;
          if (value?.messages) {
            const contacts = value.contacts || [];
            const contactMap: Record<string, string> = {};
            contacts.forEach((ct: any) => {
              if (ct.wa_id) {
                contactMap[ct.wa_id] = ct.profile?.name || "WhatsApp Customer";
              }
            });

            const phoneNumberId = value.metadata?.phone_number_id;
            const displayPhone = value.metadata?.display_phone_number;
            const cleanDisplayPhone = displayPhone ? displayPhone.replace(/\D/g, "") : "";

            // Strictly resolve the exact workspace for this WhatsApp phone number
            const targetWorkspaceId = await resolveWhatsAppWorkspace(
              phoneNumberId,
              cleanDisplayPhone,
              wabaId
            );

            if (!targetWorkspaceId) {
              console.warn("⚠️ [WhatsApp Webhook] No matching workspace found for WhatsApp phone:", cleanDisplayPhone || phoneNumberId);
              continue;
            }

            // Retrieve workspace WhatsApp access token for media downloading
            const waAccessToken = await getWhatsAppAccessToken(targetWorkspaceId);

            // Find or create dedicated page strictly scoped to targetWorkspaceId
            let page = await prisma.facebookPage.findFirst({
              where: {
                workspaceId: targetWorkspaceId,
                OR: [
                  { category: "WhatsApp" },
                  { name: { contains: "WhatsApp", mode: "insensitive" } },
                ],
              },
            });

            if (!page) {
              page = await prisma.facebookPage.findFirst({
                where: { workspaceId: targetWorkspaceId },
              });
            }

            if (!page) {
              page = await prisma.facebookPage.create({
                data: {
                  workspaceId: targetWorkspaceId,
                  name: "WhatsApp Official",
                  pageId: `wa_page_${targetWorkspaceId}_${phoneNumberId || Date.now()}`,
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

            for (const msg of value.messages) {
              const fromPhone = msg.from; // e.g. "8801700000000"
              const msgType = msg.type || "text";
              let text = msg.text?.body || msg.caption || "";
              let mediaType: "TEXT" | "IMAGE" | "FILE" = "TEXT";
              let mediaUrl: string | undefined = undefined;
              let attachmentFileName: string | undefined = undefined;

              if (msgType === "image" && msg.image) {
                mediaType = "IMAGE";
                text = msg.image.caption || text;
                const mediaId = msg.image.id;
                attachmentFileName = `whatsapp_img_${Date.now()}.jpg`;

                if (mediaId && waAccessToken) {
                  const stored = await downloadAndStoreWhatsAppMedia(
                    mediaId,
                    attachmentFileName || `whatsapp_img_${Date.now()}.jpg`,
                    msg.image.mime_type || "image/jpeg",
                    waAccessToken
                  );
                  if (stored) {
                    mediaUrl = stored.url;
                  }
                }
                if (!text) {
                  text = "[Image]";
                }
              } else if (msgType === "document" && msg.document) {
                mediaType = "FILE";
                text = msg.document.caption || text;
                const mediaId = msg.document.id;
                attachmentFileName = msg.document.filename || `document_${Date.now()}.pdf`;

                if (mediaId && waAccessToken) {
                  const stored = await downloadAndStoreWhatsAppMedia(
                    mediaId,
                    attachmentFileName || `document_${Date.now()}.pdf`,
                    msg.document.mime_type || "application/pdf",
                    waAccessToken
                  );
                  if (stored) {
                    mediaUrl = stored.url;
                  }
                }
                if (!text) {
                  text = `[Document: ${attachmentFileName}]`;
                }
              }

              const contactName = contactMap[fromPhone] || `+${fromPhone}`;
              const targetPsid = `wa_${fromPhone}`;

              if (page && (text || mediaUrl)) {
                // Strict deduplication: Search for existing customer across the ENTIRE workspace
                let customer = await prisma.customer.findFirst({
                  where: {
                    facebookPage: { workspaceId: targetWorkspaceId },
                    OR: [{ psid: targetPsid }, { phoneNumber: fromPhone }],
                  },
                });

                if (!customer) {
                  customer = await prisma.customer.create({
                    data: {
                      facebookPageId: page.id, // Use the resolved WhatsApp page
                      psid: targetPsid,
                      firstName: contactName,
                      phoneNumber: fromPhone,
                      channel: "WHATSAPP",
                      tags: ["WHATSAPP_LEAD"],
                    },
                  });
                } else {
                  // If customer already exists under another page in this workspace, we unify everything under that page!
                  page = await prisma.facebookPage.findUnique({ where: { id: customer.facebookPageId } }) || page;
                  const updateData: any = { channel: "WHATSAPP" };
                  if (contactName && contactName !== `+${fromPhone}` && (!customer.firstName || customer.firstName === "WhatsApp Tester" || customer.firstName.startsWith("+"))) {
                    updateData.firstName = contactName;
                  }
                  await prisma.customer.update({
                    where: { id: customer.id },
                    data: updateData,
                  });
                }

                let conversation = await prisma.conversation.findFirst({
                  where: { customerId: customer.id, facebookPageId: page.id },
                });

                if (!conversation) {
                  conversation = await prisma.conversation.create({
                    data: {
                      facebookPageId: page.id,
                      customerId: customer.id,
                      status: "OPEN",
                      channel: "WHATSAPP",
                    },
                  });
                } else {
                  await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                      channel: "WHATSAPP",
                      updatedAt: new Date(),
                      lastCustomerMessageAt: new Date(Number(msg.timestamp) * 1000 || Date.now()),
                    },
                  });
                }

                const messageMid = msg.id || `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

                // Safely save Customer Message without unique mid collision
                const existingMsg = await prisma.message.findUnique({
                  where: { mid: messageMid },
                });

                if (!existingMsg) {
                  await prisma.message.create({
                    data: {
                      conversationId: conversation.id,
                      mid: messageMid,
                      sender: MessageSender.CUSTOMER,
                      senderId: targetPsid,
                      content: text,
                      mediaType: mediaType as any,
                      mediaUrl: mediaUrl,
                      fileName: attachmentFileName,
                      status: MessageStatus.DELIVERED,
                    },
                  });
                } else if (mediaUrl && !existingMsg.mediaUrl) {
                  await prisma.message.update({
                    where: { id: existingMsg.id },
                    data: {
                      mediaUrl,
                      mediaType: mediaType as any,
                      fileName: attachmentFileName || existingMsg.fileName,
                      content: text || existingMsg.content,
                    },
                  });
                }

                // Enqueue for Gemini AI Auto-Response if not in human takeover
                if (!conversation.isHumanControl && page.aiMode !== "OFF") {
                  await incomingMessagesQueue.add("process-whatsapp-message", {
                    pageId: page.pageId,
                    senderPsid: targetPsid,
                    senderId: targetPsid,
                    recipientId: page.pageId,
                    mid: messageMid,
                    messageId: messageMid,
                    text,
                    mediaType,
                    mediaUrl,
                    fileName: attachmentFileName,
                    timestamp: Number(msg.timestamp) * 1000 || Date.now(),
                    customerProfile: {
                      first_name: contactName,
                      last_name: "",
                      id: targetPsid,
                    },
                  } as any);
                }
              }
            }
          }
        }
      }
    }

    return c.json({ status: "success" });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    return c.json({ status: "error", error: err.message }, 500);
  }
});
