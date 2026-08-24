import { GeminiAiResponse } from "@mogent/shared";

export interface GenerateChatReplyInput {
  systemPrompt: string;
  knowledgeBaseContext?: string[];
  history: Array<{
    role: "user" | "model";
    content: string;
    mediaUrl?: string;
    mediaType?: "image" | "audio" | "file";
  }>;
  latestMessage: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
  };
  temperature?: number;
  model?: string;
}

export class AiProxyClient {
  private proxyUrl: string;
  private masterKey: string;

  constructor(
    proxyUrl: string = process.env.AI_PROXY_URL || "http://localhost:5000",
    masterKey: string = process.env.MOGENT_AI_MASTER_KEY || "shohag_ai_master_secret_2026"
  ) {
    this.proxyUrl = proxyUrl.replace(/\/$/, "");
    this.masterKey = masterKey;
  }

  /**
   * Calls the standalone AI Proxy Gateway with the master key.
   * Behind the scenes, the proxy rotates 8 Gemini keys and handles rate-limits.
   */
  public async generateReply(input: GenerateChatReplyInput): Promise<{
    data: GeminiAiResponse;
    meta: {
      usedKeyMasked: string;
      attempts: number;
      durationMs: number;
    };
  }> {
    const endpoint = `${this.proxyUrl}/v1/chat/generate`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.masterKey}`,
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI Proxy Error (${res.status}): ${errorText}`);
    }

    const payload: any = await res.json();
    if (!payload.success) {
      throw new Error(payload.error || "Unknown AI Proxy failure");
    }

    return {
      data: payload.data,
      meta: payload.meta,
    };
  }

  /**
   * Checks the health and active keys count of the AI Proxy.
   */
  public async checkHealth(): Promise<any> {
    const res = await fetch(`${this.proxyUrl}/v1/health`);
    return res.json();
  }
}
