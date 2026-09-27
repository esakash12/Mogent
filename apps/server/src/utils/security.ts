/**
 * Core Security Utilities for Mogent Platform
 * - SSRF Protection: Blocks private, loopback, and cloud metadata IPs
 * - Path Sanitization: Blocks path traversal in folder and file operations
 */

export function validatePublicUrl(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, error: "URL string is required" };
  }

  const clean = urlString.trim();
  const formatted = clean.startsWith("http://") || clean.startsWith("https://") ? clean : `https://${clean}`;

  try {
    const parsed = new URL(formatted);

    // Protocol check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "Only HTTP and HTTPS protocols are allowed" };
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    // 1. Block loopback and local hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".lan")
    ) {
      return { valid: false, error: "Access to internal or loopback addresses is restricted" };
    }

    // 2. Block private IPv4 ranges & cloud metadata
    // - 10.0.0.0/8
    // - 127.0.0.0/8
    // - 169.254.0.0/16 (AWS/GCP/DO cloud metadata & link-local)
    // - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    // - 192.168.0.0/16
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const o1 = Number(ipMatch[1]);
      const o2 = Number(ipMatch[2]);
      const o3 = Number(ipMatch[3]);
      const o4 = Number(ipMatch[4]);

      if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) {
        return { valid: false, error: "Invalid IP address range" };
      }

      if (o1 === 10) return { valid: false, error: "Private IP addresses (10.0.0.0/8) are restricted" };
      if (o1 === 127) return { valid: false, error: "Loopback IP addresses (127.0.0.0/8) are restricted" };
      if (o1 === 169 && o2 === 254) return { valid: false, error: "Cloud metadata and link-local addresses (169.254.0.0/16) are restricted" };
      if (o1 === 192 && o2 === 168) return { valid: false, error: "Private IP addresses (192.168.0.0/16) are restricted" };
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return { valid: false, error: "Private IP addresses (172.16.0.0/12) are restricted" };
      if (o1 === 0) return { valid: false, error: "Invalid IP address (0.0.0.0/8)" };
    }

    // 3. Block IPv6 link-local and unique local addresses
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const rawIpv6 = hostname.slice(1, -1).toLowerCase();
      if (
        rawIpv6 === "::1" ||
        rawIpv6.startsWith("fe80:") ||
        rawIpv6.startsWith("fc00:") ||
        rawIpv6.startsWith("fd00:")
      ) {
        return { valid: false, error: "Private/Local IPv6 addresses are restricted" };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL structure" };
  }
}

export const ALLOWED_UPLOAD_FOLDERS = ["inbox", "products", "attachments", "general"] as const;
export type AllowedUploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];

export function sanitizeUploadFolder(folder?: string | null): AllowedUploadFolder {
  if (!folder || typeof folder !== "string") return "inbox";
  const clean = folder.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
  return ALLOWED_UPLOAD_FOLDERS.includes(clean as AllowedUploadFolder)
    ? (clean as AllowedUploadFolder)
    : "inbox";
}
