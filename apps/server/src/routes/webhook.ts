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
