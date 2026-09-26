import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { redisConnection } from "../redis";
import { prisma } from "@mogent/database";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface UploadResult {
  url: string;
  key: string;
  provider: "CLOUDFLARE_R2" | "LOCAL_SERVER";
  filename: string;
  mimeType: string;
  size: number;
}

export class StorageService {
  /**
   * Uploads an image, PDF or document buffer to Cloudflare R2
   * If R2 is not configured or unavailable, seamlessly saves to local public uploads
   * and returns a 100% valid HTTP/HTTPS URL. Zero data URLs policy.
   */
  public async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string = "image/jpeg",
    folder: string = "inbox"
  ): Promise<UploadResult> {
    const size = buffer.length;

    // 1. Fetch Cloudflare R2 credentials from Redis, PostgreSQL, or Environment
    let cfConfig: any = null;
    try {
      const raw = await redisConnection.get("mogent:cloudflare_r2_config");
      if (raw) {
        cfConfig = JSON.parse(raw);
      } else {
        const dbSetting = await prisma.systemSetting.findUnique({
          where: { key: "mogent:cloudflare_r2_config" },
        });
        if (dbSetting?.value) {
          cfConfig = JSON.parse(dbSetting.value);
          try {
            await redisConnection.set("mogent:cloudflare_r2_config", dbSetting.value);
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn("StorageService R2 config lookup notice:", err.message);
    }

    const accountId = cfConfig?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = cfConfig?.accessKeyId || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = cfConfig?.secretAccessKey || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = cfConfig?.bucketName || process.env.CLOUDFLARE_R2_BUCKET_NAME || "mogent-assets";
    const publicDomain = (cfConfig?.publicDomain || process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

    const cleanExt = filename.includes(".")
      ? filename.split(".").pop()?.toLowerCase() || "dat"
      : mimeType.includes("pdf")
      ? "pdf"
      : mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
      ? "webp"
      : "jpg";

    const safeBaseName = filename.includes(".")
      ? filename.substring(0, filename.lastIndexOf(".")).replace(/[^a-zA-Z0-9_-]/g, "_")
      : "file";

    const uniqueKey = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeBaseName}.${cleanExt}`;

    // 2. Try Cloudflare R2 first if credentials exist
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
            ContentDisposition: mimeType.includes("pdf") ? `inline; filename="${filename}"` : undefined,
          })
        );

        const url = publicDomain
          ? `${publicDomain}/${uniqueKey}`
          : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${uniqueKey}`;

        return {
          url,
          key: uniqueKey,
          provider: "CLOUDFLARE_R2",
          filename,
          mimeType,
          size,
        };
      } catch (err: any) {
        console.error("Cloudflare R2 Upload error, falling back to local static serving:", err.message);
      }
    }

    // 3. Fallback to Local Public Server Storage (guaranteed valid HTTP/HTTPS URL)
    try {
      const uploadsDir = path.join(process.cwd(), "uploads", folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(process.cwd(), "uploads", uniqueKey);
      fs.writeFileSync(filePath, buffer);

      const apiBaseUrl = (
        process.env.API_BASE_URL ||
        process.env.PUBLIC_API_URL ||
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "https://api.mogent.tech"
      ).replace(/\/$/, "");

      const url = `${apiBaseUrl}/uploads/${uniqueKey}`;

      return {
        url,
        key: uniqueKey,
        provider: "LOCAL_SERVER",
        filename,
        mimeType,
        size,
      };
    } catch (localErr: any) {
      console.error("Local storage fallback failure:", localErr);
      throw new Error(`Failed to store uploaded file: ${localErr.message}`);
    }
  }

  /**
   * Uploads an image buffer (backward compatibility)
   */
  public async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string = "image/jpeg"
  ): Promise<UploadResult> {
    return this.uploadFile(buffer, filename, mimeType, "products");
  }
}

export const storageService = new StorageService();
