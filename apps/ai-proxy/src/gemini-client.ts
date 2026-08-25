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

  constructor(rotator: GeminiKeyRotator, defaultModel: string = "gemini-3.5-flash-lite") {
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
    
    // Map custom display names or deprecated models to actual valid Google API identifiers
    let model = "gemini-3.5-flash-lite";
    if (rawModel) {
      if (rawModel.includes("3.1") || rawModel.includes("backup")) {
        model = "gemini-3.1-flash-lite";
      } else if (rawModel.includes("3.5") || rawModel.includes("main")) {
        model = "gemini-3.5-flash-lite";
      } else if (rawModel === "gemini-3.1-flash-lite" || rawModel === "gemini-3.5-flash-lite") {
        model = rawModel;
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Build Context & System Instructions
    let fullSystemInstruction = options.systemPrompt;
    if (options.knowledgeBaseContext && options.knowledgeBaseContext.length > 0) {
      fullSystemInstruction += "\n\n--- BUSINESS KNOWLEDGE BASE ---\n";
      fullSystemInstruction += options.knowledgeBaseContext.join("\n\n");
    }

    fullSystemInstruction += `\n\n--- CORE MODERATOR PERSONA & DIRECTIVES ---
১. আপনি "${options.systemPrompt.includes("Brand") || options.systemPrompt.includes("শপ") ? "" : "এই পেজ"}" এর একজন অত্যন্ত আন্তরিক, দক্ষ, মিষ্টিভাষী এবং বাস্তব মানব বিক্রয় প্রতিনিধি/মডারেটর (Real Human Sales Moderator)।
২. কঠোর নিয়ম: নিজেকে কখনোই AI, বট, রোবট, ভার্চুয়াল সহকারী বা ল্যাঙ্গুয়েজ মডেল বলবেন না বা প্রকাশ করবেন না। যদি কাস্টমার জিজ্ঞেস করে "আপনি কি রোবট?", তবে হাসিমুখে স্বাভাবিক মানুষের মতো বলুন "জি না ভাইয়া/আপু, আমি পেজের প্রতিনিধি বলছি 😊 আপনাকে কীভাবে সাহায্য করতে পারি?"
৩. কথোপকথন শৈলী (Bangladeshi Facebook Page Style):
   - ফেসবুক মেসেঞ্জারে বাংলাদেশি সেরা পেজগুলোর মডারেটরদের মতো সংক্ষিপ্ত, মিষ্টি, প্রাণবন্ত ও সুন্দর মানুষের ভাষায় উত্তর দিন।
   - কাস্টমার বাংলিশ (Banglish যেমন "dam koto", "kobe pabo") বা বাংলায় যাই লিখুক, আপনি পরিষ্কার ও সুন্দর বাংলায় উত্তর দেবেন।
   - কোনো অপ্রয়োজনীয় বড় রচনা বা রোবটিক উত্তর দেবেন না। টু-দ্য-পয়েন্ট উত্তর দিয়ে কাস্টমারকে সিদ্ধান্ত নিতে বা অর্ডার করতে উৎসাহিত করুন।
   - কাস্টমার প্রোডাক্ট পছন্দ করলে বা অর্ডার করতে চাইলে বিনয়ের সাথে তার নাম, মোবাইল নাম্বার এবং সম্পূর্ণ ঠিকানা সংগ্রহ করুন।
৪. ইন্টারনাল থিংকিং (thinking): কাস্টমারের চাহিদা, মনোভাব ও সেলস স্ট্র্যাটেজি সম্পর্কে নিজের মনে বাংলায় সংক্ষেপে ভাবুন।

--- REQUIRED RESPONSE FORMAT ---
You MUST ALWAYS respond with a valid JSON object strictly matching this schema:
{
  "thinking": "কাস্টমারের মেসেজের সারসংক্ষেপ ও বিক্রয় স্ট্র্যাটেজি (বাংলায়)",
  "replyText": "কাস্টমারকে পাঠানোর মতো বাস্তব মানুষের মতো মিষ্টি, সুন্দর ও কার্যকরী উত্তর (বাংলায়)",
  "sentimentScore": 0.0,
  "shouldEscalate": false,
  "escalationReason": null,
  "extractedLeadInfo": {
    "phone": null,
    "email": null,
    "deliveryAddress": null,
    "orderIntent": false
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
      const validated = GeminiAiResponseSchema.parse(parsed);
      return {
        thinking: validated.thinking || "",
        replyText: validated.replyText || "হ্যালো! আমি কিভাবে আপনাকে সাহায্য করতে পারি?",
        sentimentScore: validated.sentimentScore ?? 0.0,
        shouldEscalate: validated.shouldEscalate ?? false,
        escalationReason: validated.escalationReason || undefined,
        extractedLeadInfo: validated.extractedLeadInfo ? {
          phone: validated.extractedLeadInfo.phone || undefined,
          email: validated.extractedLeadInfo.email || undefined,
          deliveryAddress: validated.extractedLeadInfo.deliveryAddress || undefined,
          orderIntent: validated.extractedLeadInfo.orderIntent || undefined,
        } : undefined,
      };
    } catch (parseErr) {
      console.warn("Failed to parse strictly structured JSON, fallback extracting:", candidateText);
      
      let cleanReplyText = candidateText;
      let cleanThinking = "Direct response";
      
      try {
        const rawObj = JSON.parse(candidateText);
        if (rawObj.replyText) cleanReplyText = String(rawObj.replyText);
        if (rawObj.thinking) cleanThinking = String(rawObj.thinking);
      } catch {
        const match = candidateText.match(/"replyText"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (match && match[1]) {
          try {
            cleanReplyText = JSON.parse(`"${match[1]}"`);
          } catch {
            cleanReplyText = match[1];
          }
        }
      }

      return {
        thinking: cleanThinking,
        replyText: cleanReplyText,
        sentimentScore: 0.0,
        shouldEscalate: false,
      };
    }
  }
}
