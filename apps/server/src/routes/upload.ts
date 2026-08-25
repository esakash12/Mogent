import { Hono } from "hono";
import { storageService } from "../services/storage";

export const uploadRouter = new Hono();

// POST /api/upload - Upload Image to Cloudflare R2 / S3
uploadRouter.post("/", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";

    // 1. JSON Base64 Payload
    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      const { base64, filename, mimeType } = body;

      if (!base64) {
        return c.json({ success: false, error: "Base64 data is required" }, 400);
      }

      const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleanBase64, "base64");
      const name = filename || `upload-${Date.now()}.jpg`;
      const mime = mimeType || "image/jpeg";

      const result = await storageService.uploadImage(buffer, name, mime);
      return c.json({ success: true, data: result });
    }

    // 2. Multipart Form Data
    if (contentType.includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const file = body["file"];

      if (!file || typeof file === "string") {
        return c.json({ success: false, error: "File is required in 'file' field" }, 400);
      }

      const buffer = Buffer.from(await (file as File).arrayBuffer());
      const filename = (file as File).name || `upload-${Date.now()}.jpg`;
      const mimeType = (file as File).type || "image/jpeg";

      const result = await storageService.uploadImage(buffer, filename, mimeType);
      return c.json({ success: true, data: result });
    }

    return c.json({ success: false, error: "Unsupported Content-Type. Use multipart/form-data or application/json" }, 400);
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json({ success: false, error: error.message || "Failed to upload image" }, 500);
  }
});
