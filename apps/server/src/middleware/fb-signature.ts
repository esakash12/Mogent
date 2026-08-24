import crypto from "crypto";
import { MiddlewareHandler } from "hono";
import { config } from "../config";

/**
 * Validates the Facebook x-hub-signature-256 header against the raw request body.
 * Prevents spoofed or unauthorized webhook calls.
 */
export const verifyFacebookSignature: MiddlewareHandler = async (c, next) => {
  // If app secret is not set in development, bypass signature check
  if (!config.facebook.appSecret) {
    return next();
  }

  const signatureHeader = c.req.header("x-hub-signature-256");
  if (!signatureHeader) {
    console.warn("⚠️ Webhook missing x-hub-signature-256 header.");
    return c.text("Forbidden: Missing signature", 403);
  }

  const rawBody = await c.req.text();
  const expectedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", config.facebook.appSecret)
      .update(rawBody, "utf8")
      .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature))) {
    console.error("❌ Invalid Webhook Signature detected!");
    return c.text("Forbidden: Invalid signature", 403);
  }

  // Restore raw body for subsequent middleware / handlers
  c.set("rawBody" as any, rawBody);
  await next();
};
