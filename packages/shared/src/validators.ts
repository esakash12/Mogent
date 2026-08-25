/**
 * Security & Input Validation Helpers
 */

/**
 * Validates a Bangladeshi mobile phone number.
 * Accepts: "01711223344", "+8801711223344", "8801711223344", "01711-223344", "01711 223344"
 * Operators: Grameenphone/Skitto (017, 013), Banglalink (019, 014), Robi/Airtel (018, 016), Teletalk (015)
 */
export function isValidBdPhone(phone?: string | null): boolean {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = cleanBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(cleaned);
}

/**
 * Cleans and normalizes a phone number to standard 11-digit format (e.g. "01711223344").
 */
export function cleanBdPhone(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/[^0-9+]/g, "").trim();
  if (digits.startsWith("+88")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("88") && digits.length === 13) {
    digits = digits.slice(2);
  }
  return digits;
}

/**
 * Sanitizes generic user input to prevent injection, control characters, and prototype pollution.
 */
export function sanitizeText(text?: string | null, maxLength = 1000): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/\0/g, "") // Remove null bytes
    .trim()
    .slice(0, maxLength);
}
