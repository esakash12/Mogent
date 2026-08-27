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
   * Dispatches the prompt to Gemini with automatic failover across rotated keys and models.
   */
  public async generateReply(options: GenerateAiReplyOptions): Promise<{
    result: GeminiAiResponse;
    usedKeyMasked: string;
    attempts: number;
  }> {
    const modelHierarchy = [
      options.model || this.defaultModel || "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemma-4-31b"
    ];
    
    // Deduplicate models preserving order
    const orderedModels = Array.from(new Set(modelHierarchy));
    const maxRetries = 9;
    let attempts = 0;
    const errors: string[] = [];

    for (const currentModel of orderedModels) {
      let modelAttempts = 0;
      while (modelAttempts < 3 && attempts < maxRetries) {
        const activeKey = await this.rotator.getNextActiveKey();
        if (!activeKey) {
          throw new Error("❌ All Gemini API keys are exhausted or in cooldown. Please check your quota.");
        }

        attempts++;
        modelAttempts++;

        try {
          const response = await this.callGeminiApi(activeKey.key, currentModel, options);
          await this.rotator.markSuccess(activeKey.key);

          return {
            result: response,
            usedKeyMasked: activeKey.maskedKey,
            attempts,
          };
        } catch (err: any) {
          const errorMessage = err?.message || String(err);
          errors.push(`[${currentModel}] Key [${activeKey.maskedKey}]: ${errorMessage}`);

          // Check for Rate Limit (HTTP 429) or Quota Exceeded
          if (
            errorMessage.includes("429") ||
            errorMessage.includes("RESOURCE_EXHAUSTED") ||
            errorMessage.includes("Quota exceeded")
          ) {
            await this.rotator.markRateLimited(activeKey.key);
            console.warn(`🔄 Rate limit on model [${currentModel}]. Switching key/model.`);
            continue;
          }

          // If daily limit permanent exhausted
          if (errorMessage.includes("BILLING_DISABLED") || errorMessage.includes("API_KEY_INVALID")) {
            await this.rotator.markExhausted(activeKey.key);
            continue;
          }

          console.error(`⚠️ API Error on key [${activeKey.maskedKey}]: ${errorMessage}`);
        }
      }
    }

    throw new Error(`Failed to generate response after ${attempts} attempts across models and keys:\n${errors.join("\n")}`);
  }

  private getValidGoogleModels(rawModel: string): string[] {
    const normalized = (rawModel || "").trim().toLowerCase();
    
    // Direct exact matches from Google API
    if (normalized === "gemini-1.5-flash" || normalized === "gemini-1.5-flash-latest") {
      return ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    }
    if (normalized === "gemini-1.5-flash-8b" || normalized === "gemini-1.5-flash-8b-latest") {
      return ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-1.5-pro"];
    }
    if (normalized === "gemini-1.5-pro" || normalized === "gemini-1.5-pro-latest") {
      return ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
    }
    if (normalized.includes("2.0-flash-lite") || normalized === "gemini-2.0-flash-lite") {
      return ["gemini-2.0-flash-lite-preview-02-05", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
    }
    if (normalized.includes("2.0-flash") || normalized === "gemini-2.0-flash") {
      return ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];
    }

    // Custom UI Tiers
    if (normalized === "gemini-3.5-flash-lite" || normalized.includes("3.5")) {
      return ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
    }
    if (normalized === "gemini-3.1-flash-lite" || normalized.includes("3.1")) {
      return ["gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-1.5-pro"];
    }
    if (normalized === "gemma-4-31b" || normalized.includes("gemma")) {
      return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b"];
    }

    // Fallback order
    const list = [rawModel, "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"].filter(Boolean);
    return Array.from(new Set(list));
  }

  private async callGeminiApi(
    apiKey: string,
    rawModel: string,
    options: GenerateAiReplyOptions
  ): Promise<GeminiAiResponse> {
    
    const candidateModels = this.getValidGoogleModels(rawModel);

    // Build Context & System Instructions
    let fullSystemInstruction = `You are an elite, highly empathetic Sales Executive and Messenger Moderator for an online business.

[CRITICAL ROLE ADAPTATION]
Analyze the [Knowledge Base] and [Owner's Custom Prompt] below. Instantly adapt your persona to match the business type (e.g., Digital Subscriptions, Physical Goods, Tech Services). Use vocabulary and examples relevant ONLY to this specific business.

[HUMAN OPERATOR / STORE MANAGER OVERRIDE]
CRITICAL: The chat history contains previous messages. Messages sent by human managers/moderators are marked as [মানব প্রতিনিধি/মালিক].
If a human representative has previously offered a custom discount, specified a price (e.g. reduced or increased), promised delivery time, or made any commitment to the customer, you MUST STRICTLY ADHERE to and respect what the human manager stated. NEVER contradict the human manager's stated price or statement!

[CORE SALES PSYCHOLOGY]
1. Stop Selling, Start Solving: Never list features blindly. Ask 1 relevant open-ended question to understand their true need before pitching.
2. Emotion First, Logic Second: Connect with the customer's goal/pain point emotionally, then validate the price with logical benefits (e.g., time saved, premium quality, warranty).
3. The "Agree First" Rule: If a customer complains (e.g., high price, late delivery), NEVER argue. Agree and validate their concern first ("জি ভাইয়া, আপনি ঠিক বলেছেন..."), then pivot to the unique value of your service.
4. Win-Win Positioning: Frame every offer as a massive win for the customer.
5. The Art of Closing: End your messages with a soft, friendly call-to-action (CTA) (e.g., "তাহলে কি আপনার জন্য এটি কনফার্ম করে দেব?").

[ESCALATION & HUMAN TAKEOVER PROTOCOLS]
You MUST set "shouldEscalate": true and provide a specific "escalationReason" in the following situations:
1. Owner's Custom Rules: If the [Owner's Custom Prompt] below specifies any custom conditions, keywords, or scenarios where an alert, human handoff, or manager notification should happen (e.g., specific budget inquiries, wholesale requests, delivery complaints, angry tone), you MUST immediately set "shouldEscalate": true and write the exact reason.
2. Customer Requests Human / Phone: If the customer asks to speak with a human, agent, moderator, owner, manager, or requests a phone call (e.g., "মানুষের সাথে কথা বলব", "agent den", "human", "call me", "phone number"), you MUST set "shouldEscalate": true and "escalationReason": "Customer requested human / live representative".
3. Out of Scope / Missing Info: If they ask a question NOT covered in the Knowledge Base, DO NOT guess or hallucinate. Say: "ভাইয়া, এই বিষয়টি আমি একটু চেক করে আপনাকে নিশ্চিত করছি।" and set "shouldEscalate": true and "escalationReason": "Missing Info in Knowledge Base".
4. Frustration / Negative Sentiment: If the customer is angry, unsatisfied, or disputing continuously, set "shouldEscalate": true and "escalationReason": "Negative Customer Sentiment / Dispute".

[TONE & FORMATTING RULES]
- Keep it concise: Messenger chats are fast. Keep your responses under 3-4 short sentences. DO NOT write long essays.
- Use spacing: Break lines for readability.
- Empathy: Address users as "ভাইয়া" or "আপু". Use warm, human-like conversational words ("দারুণ", "অবশ্যই", "কোনো সমস্যা নেই").
- Anti-Robot Identity: NEVER reveal yourself as AI, robot, bot, or automated system. Always act as a real human moderator representing the business.

[STRICT DATA GUARDRAILS]
- You are strictly forbidden from offering products, prices, discounts, or policies not present in the [Knowledge Base], unless a human manager explicitly offered it in the chat history above.

[PRIORITY OVERRIDE RULE - THE GOLDEN COMMAND]
The instructions, rules, and data provided in the [Knowledge Base & Owner's Custom Prompt] below are your ULTIMATE AUTHORITY.
If the Owner's custom instructions contradict ANY of the default protocols above, you MUST COMPLETELY IGNORE the default protocol and STRICTLY follow the Owner's instructions.

--- [Knowledge Base & Owner's Custom Prompt] ---
Owner's Custom Persona / Instructions:
${options.systemPrompt}
`;

    if (options.knowledgeBaseContext && options.knowledgeBaseContext.length > 0) {
      fullSystemInstruction += "\n\nStore Knowledge Base & Products:\n";
      fullSystemInstruction += options.knowledgeBaseContext.join("\n\n");
    }

    fullSystemInstruction += `\n\n--- REQUIRED RESPONSE FORMAT ---
You MUST ALWAYS respond with a valid JSON object strictly matching this schema:
{
  "thinking": "কাস্টমারের মেসেজের সারসংক্ষেপ ও বিক্রয় স্ট্র্যাটেজি (বাংলায় সংক্ষেপে ভাবুন)",
  "replyText": "কাস্টমারকে পাঠানোর মতো বাস্তব মানুষের মতো মিষ্টি, সংক্ষিপ্ত ও কনভার্শন-কেন্দ্রিক উত্তর (বাংলায়)",
  "sentimentScore": 0.0,
  "shouldEscalate": false,
  "escalationReason": null,
  "extractedLeadInfo": {
    "phone": null,
    "email": null,
    "deliveryAddress": null,
    "orderIntent": null
  }
}`;

    // Format Multi-Turn Chat History
    const contents: any[] = [];
    if (options.history && options.history.length > 0) {
      for (const msg of options.history) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Latest incoming message
    const currentParts: any[] = [];
    if (options.latestMessage.text) {
      currentParts.push({ text: options.latestMessage.text });
    }
    if (options.latestMessage.mediaUrl) {
      currentParts.push({
        text: `[User attached a ${options.latestMessage.mediaType || "file"}: ${options.latestMessage.mediaUrl}]`,
      });
    }

    if (currentParts.length === 0) {
      currentParts.push({ text: "Hello" });
    }

    contents.push({
      role: "user",
      parts: currentParts,
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

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (res.status === 404) {
          const errorText = await res.text();
          console.warn(`⚠️ Model [${model}] returned 404, trying next fallback model...`);
          lastError = new Error(`HTTP 404: ${errorText}`);
          continue;
        }

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
      } catch (err: any) {
        if (err.message && err.message.includes("404")) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error(`No valid working model found for key across candidates: ${candidateModels.join(", ")}`);
  }
}
