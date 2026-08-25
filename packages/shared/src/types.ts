import { z } from "zod";

// ----------------------------------------------------
// FACEBOOK WEBHOOK TYPES & SCHEMAS
// ----------------------------------------------------

export interface FacebookWebhookEntry {
  id: string; // Page ID
  time: number;
  messaging: Array<{
    sender: { id: string }; // Customer PSID
    recipient: { id: string }; // Page ID
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{
        type: "image" | "audio" | "video" | "file" | "location" | "fallback";
        payload: {
          url?: string;
          coordinates?: { lat: number; long: number };
        };
      }>;
      quick_reply?: {
        payload: string;
      };
      reply_to?: {
        mid: string;
      };
    };
    postback?: {
      title: string;
      payload: string;
      mid?: string;
    };
    delivery?: {
      mids: string[];
      watermark: number;
    };
    read?: {
      watermark: number;
    };
  }>;
}

export interface FacebookWebhookBody {
  object: "page" | string;
  entry: FacebookWebhookEntry[];
}

// ----------------------------------------------------
// BULLMQ QUEUE JOB TYPES
// ----------------------------------------------------

export interface ProcessMessageJobPayload {
  pageId: string;
  senderPsid: string;
  mid: string;
  text?: string;
  mediaType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "FILE";
  mediaUrl?: string;
  timestamp: number;
  rawPayload?: Record<string, unknown>;
}

export interface SendTelegramAlertPayload {
  workspaceId: string;
  pageId: string;
  conversationId: string;
  customerName?: string;
  customerPsid: string;
  reason: string;
  messageSnippet: string;
  urgency: "HIGH" | "MEDIUM" | "CRITICAL";
}

// ----------------------------------------------------
// GEMINI AI THINKING & RESPONSE CONTRACT
// ----------------------------------------------------

export interface GeminiAiResponse {
  thinking: string; // Internal chain-of-thought analysis
  replyText: string; // Exact customer response
  sentimentScore: number; // -1.0 to 1.0
  shouldEscalate: boolean; // Flag to alert human
  escalationReason?: string;
  extractedLeadInfo?: {
    phone?: string;
    email?: string;
    deliveryAddress?: string;
    orderIntent?: boolean;
  };
}

export const GeminiAiResponseSchema = z.object({
  thinking: z.string().nullable().optional().default(""),
  replyText: z.string().describe("Polite, helpful, and natural response for the customer in their language"),
  sentimentScore: z.number().nullable().optional().default(0),
  shouldEscalate: z.boolean().nullable().optional().default(false),
  escalationReason: z.string().nullable().optional(),
  extractedLeadInfo: z.object({
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    deliveryAddress: z.string().nullable().optional(),
    orderIntent: z.boolean().nullable().optional(),
  }).nullable().optional(),
});
