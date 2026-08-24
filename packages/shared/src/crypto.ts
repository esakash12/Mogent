import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Encrypts sensitive credentials (like Facebook Page Access Tokens, Telegram Bot Tokens)
 * using AES-256-GCM.
 */
export function encryptToken(text: string, secretKey: string): {
  encryptedData: string;
  iv: string;
  tag: string;
} {
  // Ensure the key is 32 bytes
  const key = crypto.createHash("sha256").update(secretKey).digest();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    tag: tag,
  };
}

/**
 * Decrypts AES-256-GCM encrypted tokens.
 */
export function decryptToken(
  encryptedData: string,
  ivHex: string,
  tagHex: string,
  secretKey: string
): string {
  const key = crypto.createHash("sha256").update(secretKey).digest();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
