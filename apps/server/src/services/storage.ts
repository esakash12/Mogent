import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { redisConnection } from "../redis";
import crypto from "crypto";

export interface UploadResult {
  url: string;
  key: string;
  provider: "CLOUDFLARE_R2" | "DATA_URL";
}

export class StorageService {
  /**
   * Uploads an image buffer or file to Cloudflare R2 (or fallback to data URL / local storage)
   */
  public async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string = "image/jpeg"
  ): Promise<UploadResult> {
    // 1. Fetch Cloudflare R2 credentials from Redis or Environment
    let cfConfig: any = null;
    try {
      const raw = await redisConnection.get("mogent:cloudflare_r2_config");
      if (raw) {
        cfConfig = JSON.parse(raw);
      }
    } catch {}

    const accountId = cfConfig?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = cfConfig?.accessKeyId || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = cfConfig?.secretAccessKey || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = cfConfig?.bucketName || process.env.CLOUDFLARE_R2_BUCKET_NAME || "mogent-assets";
    const publicDomain = (cfConfig?.publicDomain || process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

    const cleanExt = filename.includes(".") ? filename.split(".").pop() : "jpg";
    const uniqueKey = `products/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${cleanExt}`;

    // If Cloudflare R2 is configured
    if (accountId && accessKeyId && secretAccessKey) {
      try {
        const s3Client = new S3Client({
          region: "auto",
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: uniqueKey,
            Body: buffer,
            ContentType: mimeType,
          })
        );

        const url = publicDomain
          ? `${publicDomain}/${uniqueKey}`
          : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${uniqueKey}`;

        return {
          url,
          key: uniqueKey,
          provider: "CLOUDFLARE_R2",
        };
      } catch (err) {
        console.error("Cloudflare R2 Upload error:", err);
      }
    }

    // Fallback: Return data URL so image works seamlessly even without R2 setup
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      url: dataUrl,
      key: uniqueKey,
      provider: "DATA_URL",
    };
  }
}

export const storageService = new StorageService();
