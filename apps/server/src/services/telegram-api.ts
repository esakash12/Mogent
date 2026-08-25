import { config } from "../config";
import { SendTelegramAlertPayload } from "@mogent/shared";

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export class TelegramApiService {
  /**
   * Sends an escalation alert to the business owner or manager's Telegram group/channel.
   */
  public async sendEscalationAlert(
    botToken: string,
    chatId: string,
    payload: SendTelegramAlertPayload
  ): Promise<boolean> {
    const token = botToken || config.telegram.botToken || "8784653620:AAF2Y-Hy3De5YLZ7WFqPVhzE26kHeitddoY";
    if (!token || !chatId) {
      console.warn("⚠️ Telegram Bot Token or Chat ID missing. Skipping alert.", { token: Boolean(token), chatId });
      return false;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const urgencyHeader =
      payload.urgency === "CRITICAL"
        ? "🚨🚨 <b>[CRITICAL HUMAN TAKEOVER ALERT]</b>"
        : "⚠️ <b>[HUMAN TAKEOVER REQUIRED]</b>";

    const customerName = escapeHtml(payload.customerName || "Customer");
    const customerPsid = escapeHtml(payload.customerPsid);
    const reason = escapeHtml(payload.reason || "Human Moderator Requested");
    const snippet = escapeHtml(payload.messageSnippet || "[No Message Content]");

    const htmlMessage = `
${urgencyHeader}
<b>Mogent Escalation Protocol</b>

👤 <b>Customer:</b> ${customerName} (<code>${customerPsid}</code>)
📌 <b>Reason:</b> <code>${reason}</code>
💬 <b>Last Message:</b>
<i>"${snippet}"</i>

⚡ <b>Action Required:</b> A human manager/moderator needs to take over this conversation.
🔗 <b>Inbox:</b> <a href="https://mogent.tech/dashboard/inbox">Click here to Takeover</a>
    `.trim();

    const plainMessage = `
[MOGENT ESCALATION ALERT]
Customer: ${payload.customerName || "Customer"} (${payload.customerPsid})
Reason: ${payload.reason || "Human Takeover Needed"}
Last Message: "${payload.messageSnippet}"

Action Required: Please open Mogent Inbox (https://mogent.tech/dashboard/inbox) to assist the customer.
    `.trim();

    try {
      // 1. Try sending with HTML Formatting
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMessage,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        console.log(`📣 Telegram Escalation Alert delivered to chat [${chatId}].`);
        return true;
      }

      console.warn("Telegram HTML sendMessage failed, falling back to Plain Text:", json);

      // 2. Fallback to Plain Text without parse_mode
      const fallbackRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainMessage,
        }),
      });

      const fallbackJson = await fallbackRes.json();
      if (fallbackJson.ok) {
        console.log(`📣 Telegram Escalation Alert delivered via Plain Text fallback to chat [${chatId}].`);
        return true;
      }

      console.error("Telegram Plain Text send failed:", fallbackJson);
      return false;
    } catch (err: any) {
      console.error("Failed to send Telegram alert:", err.message);
      return false;
    }
  }
}

export const telegramApi = new TelegramApiService();
