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
  thinking: z.string().describe("Internal analysis of customer intention, tone, and knowledge context"),
  replyText: z.string().describe("Polite, helpful, and natural response for the customer in their language"),
  sentimentScore: z.number().min(-1).max(1).describe("-1 is angry/frustrated, 0 is neutral, +1 is happy/satisfied"),
  shouldEscalate: z.boolean().describe("Whether a human manager must step in immediately"),
  escalationReason: z.string().optional().describe("Why escalation is necessary"),
  extractedLeadInfo: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    deliveryAddress: z.string().optional(),
    orderIntent: z.boolean().optional(),
  }).optional(),
});
