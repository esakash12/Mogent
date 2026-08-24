import { GeminiKeyRotator } from "./key-rotator";
import { GeminiAiResponse, GeminiAiResponseSchema } from "@mogent/shared";

export interface ChatHistoryMessage {
  role: "user" | "model";
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "file";
}

export interface GenerateAiReplyOptions {
  model?: string;
  systemPrompt: string;
  knowledgeBaseContext?: string[];
  history: ChatHistoryMessage[];
  latestMessage: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
  };
  temperature?: number;
}

export class GeminiService {
  private rotator: GeminiKeyRotator;
  private defaultModel: string;

  constructor(rotator: GeminiKeyRotator, defaultModel: string = "gemini-2.0-flash") {
    this.rotator = rotator;
    this.defaultModel = defaultModel;
  }

  /**
   * Dispatches the prompt to Gemini with automatic failover across rotated keys.
   */
  public async generateReply(options: GenerateAiReplyOptions): Promise<{
    result: GeminiAiResponse;
    usedKeyMasked: string;
    attempts: number;
  }> {
    const model = options.model || this.defaultModel;
    const maxRetries = 8;
    let attempts = 0;
    const errors: string[] = [];

    while (attempts < maxRetries) {
      const activeKey = await this.rotator.getNextActiveKey();
      if (!activeKey) {
        throw new Error("❌ All Gemini API keys are exhausted or in cooldown. Please check your quota.");
      }

      attempts++;

      try {
        const response = await this.callGeminiApi(activeKey.key, model, options);
        await this.rotator.markSuccess(activeKey.key);

        return {
          result: response,
          usedKeyMasked: activeKey.maskedKey,
          attempts,
        };
      } catch (err: any) {
        const errorMessage = err?.message || String(err);
        errors.push(`Key [${activeKey.maskedKey}]: ${errorMessage}`);

        // Check for Rate Limit (HTTP 429) or Quota Exceeded
        if (
          errorMessage.includes("429") ||
          errorMessage.includes("RESOURCE_EXHAUSTED") ||
          errorMessage.includes("Quota exceeded")
        ) {
          await this.rotator.markRateLimited(activeKey.key);
          console.warn(`🔄 Auto-switching to next key due to rate limit: ${errorMessage}`);
          continue; // Try next key immediately
        }

        // If daily limit permanent exhausted
        if (errorMessage.includes("BILLING_DISABLED") || errorMessage.includes("API_KEY_INVALID")) {
          await this.rotator.markExhausted(activeKey.key);
          continue;
        }

        console.error(`⚠️ API Error on key [${activeKey.maskedKey}]: ${errorMessage}`);
      }
    }

    throw new Error(`Failed to generate response after ${attempts} attempts across keys:\n${errors.join("\n")}`);
  }

  private async callGeminiApi(
    apiKey: string,
    rawModel: string,
    options: GenerateAiReplyOptions
  ): Promise<GeminiAiResponse> {
    
    // Map custom display names to actual Google API identifiers
    let model = rawModel;
    if (model.includes("Gemini 3.1 Flash-Lite") || model.includes("Gemini 3.5 Flash Lite")) {
      model = "gemini-2.0-flash-lite-preview-02-05";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Build Context & System Instructions
    let fullSystemInstruction = options.systemPrompt;
    if (options.knowledgeBaseContext && options.knowledgeBaseContext.length > 0) {
      fullSystemInstruction += "\n\n--- BUSINESS KNOWLEDGE BASE ---\n";
      fullSystemInstruction += options.knowledgeBaseContext.join("\n\n");
    }

    fullSystemInstruction += `\n\n--- REQUIRED RESPONSE FORMAT ---
You MUST ALWAYS respond with a valid JSON object strictly matching this schema:
{
  "thinking": "Your internal chain-of-thought analysis of customer request, sentiment, context and strategy",
  "replyText": "The actual polite, friendly, and helpful message to send to the customer",
  "sentimentScore": 0.0, // Float between -1.0 (angry/frustrated) to 1.0 (delighted/satisfied)
  "shouldEscalate": false, // true if user asks for human, threatens, reports major bug, or urgent issue
  "escalationReason": "Optional short reason if shouldEscalate is true",
  "extractedLeadInfo": {
    "phone": "Customer phone if provided",
    "email": "Customer email if provided",
    "deliveryAddress": "Address if ordering",
    "orderIntent": true // true if customer intends to buy
  }
}`;

    // Build Multi-turn Chat Contents
    const contents: any[] = [];

    // Append History
    for (const msg of options.history) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    // Append Latest Message
    const latestParts: any[] = [];
    if (options.latestMessage.text) {
      latestParts.push({ text: options.latestMessage.text });
    }

    // Handle Image / Media if provided
    if (options.latestMessage.mediaUrl && options.latestMessage.mediaType === "image") {
      try {
        const imageRes = await fetch(options.latestMessage.mediaUrl);
        const imageBuffer = await imageRes.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");
        const contentType = imageRes.headers.get("content-type") || "image/jpeg";

        latestParts.push({
          inlineData: {
            mimeType: contentType,
            data: base64Image,
          },
        });
      } catch (mediaErr) {
        console.warn(`Failed to fetch media attachment: ${mediaErr}`);
      }
    }

    contents.push({
      role: "user",
      parts: latestParts.length > 0 ? latestParts : [{ text: "Hello" }],
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: fullSystemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data: any = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Empty response received from Gemini API");
    }

    // Parse and validate with Zod
    try {
      const parsed = JSON.parse(candidateText);
      return GeminiAiResponseSchema.parse(parsed);
    } catch (parseErr) {
      console.warn("Failed to parse strictly structured JSON, fallback extracting:", candidateText);
      return {
        thinking: "Extracted without strict JSON",
        replyText: candidateText,
        sentimentScore: 0.0,
        shouldEscalate: false,
      };
    }
  }
}
