import { config } from "../config";
import { SendTelegramAlertPayload } from "@mogent/shared";

export class TelegramApiService {
  /**
   * Sends an escalation alert to the business owner or manager's Telegram group/channel.
   */
  public async sendEscalationAlert(
    botToken: string,
    chatId: string,
    payload: SendTelegramAlertPayload
  ): Promise<boolean> {
    const token = botToken || config.telegram.botToken;
    if (!token || !chatId) {
      console.warn("⚠️ Telegram Bot Token or Chat ID missing. Skipping alert.");
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const urgencyEmoji =
      payload.urgency === "CRITICAL" ? "🚨🚨 [CRITICAL ALERT]" : "⚠️ [ATTENTION REQUIRED]";

    const messageText = `
${urgencyEmoji}
*Mogent AI Escalation Notice*

👤 *Customer:* ${payload.customerName || "Customer"} (\`${payload.customerPsid}\`)
📌 *Reason:* ${payload.reason}
💬 *Last Message:*
_"${payload.messageSnippet.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")}"_

⚡ *Action Required:* A human manager needs to take over this conversation.
    `.trim();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "MarkdownV2",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Telegram API Error:", errorText);
        return false;
      }

      console.log(`📣 Telegram Escalation Alert sent successfully to chat [${chatId}].`);
      return true;
    } catch (err) {
      console.error("Failed to send Telegram alert:", err);
      return false;
    }
  }
}

export const telegramApi = new TelegramApiService();
