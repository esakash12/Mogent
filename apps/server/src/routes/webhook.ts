import { Hono } from "hono";
import { config } from "../config";
import { redisConnection } from "../redis";
import { incomingMessagesQueue } from "../queue/message-queue";
import { FacebookWebhookBody, ProcessMessageJobPayload } from "@mogent/shared";

export const webhookRouter = new Hono();

// -----------------------------------------------------------------------------
// 1. FACEBOOK WEBHOOK HANDSHAKE (GET)
// -----------------------------------------------------------------------------
webhookRouter.get("/facebook", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode === "subscribe" && token === config.facebook.verifyToken) {
    console.log("✅ Facebook Webhook Handshake verified successfully!");
    return c.text(challenge || "", 200);
  }

  console.warn("❌ Facebook Webhook verification token mismatch.");
  return c.text("Forbidden: Verification Token Mismatch", 403);
});

// -----------------------------------------------------------------------------
// 2. FACEBOOK WEBHOOK INGESTION (POST)
// -----------------------------------------------------------------------------
webhookRouter.post("/facebook", async (c) => {
  try {
    let body: FacebookWebhookBody;

    // Retrieve raw or parsed body
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

        // ---------------------------------------------------------------------
        // IDEMPOTENCY / DEDUPLICATION CHECK (Redis)
        // Prevents Facebook retry storms from triggering duplicate AI generations
        // ---------------------------------------------------------------------
        if (mid) {
          const deduplicationKey = `fb:mid:${mid}`;
          const isDuplicate = await redisConnection.set(
            deduplicationKey,
            "1",
            "EX",
            600, // 10 minutes TTL
            "NX" // Only set if it does NOT already exist
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
          text: message.text,
          mediaType,
          mediaUrl,
          timestamp: event.timestamp || Date.now(),
        };

        // Push to BullMQ for background worker execution
        await incomingMessagesQueue.add("process-fb-message", jobPayload, {
          jobId: mid, // Unique Job ID to guarantee queue-level idempotency
        });

        console.log(`📥 Ingested & Queued message from customer [${senderPsid}] on Page [${pageId}]`);
      }
    }

    // Always respond 200 OK immediately to satisfy Facebook's timeout requirements
    return c.text("EVENT_RECEIVED", 200);
  } catch (err: any) {
    console.error("Error processing Facebook Webhook:", err);
    // Return 200 even on error to prevent Facebook webhook storming
    return c.text("EVENT_RECEIVED", 200);
  }
});
