import dotenv from "dotenv";

import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB) || 0,
  },

  // AI Proxy Gateway
  aiProxy: {
    url: process.env.AI_PROXY_URL || "http://localhost:5000",
    masterKey: process.env.MOGENT_AI_MASTER_KEY || "shohag_ai_master_secret_2026",
    defaultModel: process.env.DEFAULT_GEMINI_MODEL || "gemini-2.0-flash",
  },

  // Facebook Graph API
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || "",
    appSecret: process.env.FACEBOOK_APP_SECRET || "",
    verifyToken: process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN || "mogent_fb_verify_token_secure",
    graphVersion: process.env.FACEBOOK_GRAPH_API_VERSION || "v20.0",
  },

  // Security Encryption & JWT
  tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || "shohag_mogent_secret_encryption_32chars_key!",
  jwtSecret: process.env.JWT_SECRET || "mogent_super_secure_jwt_secret_2026_shohag",
  adminSecret: process.env.ADMIN_SECRET || "mogent_super_admin_pass_2026",

  // Telegram Alerts
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  },
};
