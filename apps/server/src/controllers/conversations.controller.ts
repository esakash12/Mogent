import { Context } from "hono";
import { ConversationService } from "../services/conversation-service";

export class ConversationsController {
  /**
   * GET /api/conversations - List conversations for active workspace
   */
  static async list(c: Context) {
    const workspaceId = c.req.header("x-workspace-id");
    const filterPageId = c.req.query("pageId");

    try {
      const data = await ConversationService.listConversations({ workspaceId, filterPageId });
      return c.json({ success: true, data });
    } catch (error: any) {
      console.error("List conversations error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  /**
   * GET /api/conversations/:id/messages - Get message history
   */
  static async getMessages(c: Context) {
    const { id } = c.req.param();
    try {
      const data = await ConversationService.getMessages(id);
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  /**
   * POST /api/conversations/:id/messages - Send message
   */
  static async sendMessage(c: Context) {
    const { id } = c.req.param();
    try {
      const body = await c.req.json();
      const { text } = body;

      if (!text || !text.trim()) {
        return c.json({ success: false, error: "Text required" }, 400);
      }

      const data = await ConversationService.sendMessage({ conversationId: id, text: text.trim() });
      return c.json({ success: true, data });
    } catch (error: any) {
      console.error("Manual send error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  /**
   * POST /api/conversations/:id/toggle-mode - Switch between AI & Human control
   */
  static async toggleMode(c: Context) {
    const { id } = c.req.param();
    try {
      const body = await c.req.json();
      const { isHumanControl } = body;
      const conversation = await ConversationService.toggleMode(id, isHumanControl);
      return c.json({ success: true, data: conversation });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  /**
   * POST /api/conversations/:id/complete-sale - Mark conversation completed
   */
  static async completeSale(c: Context) {
    const { id } = c.req.param();
    try {
      const conversation = await ConversationService.markSaleCompleted(id);
      return c.json({ success: true, data: conversation });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }

  /**
   * POST /api/conversations/whatsapp/start - Start or find an active WhatsApp conversation
   */
  static async startWhatsApp(c: Context) {
    const workspaceId = c.req.header("x-workspace-id");

    try {
      const body = await c.req.json().catch(() => ({}));
      const { phoneNumber, name, initialMessage, facebookPageId } = body;

      if (!phoneNumber || !phoneNumber.trim()) {
        return c.json({ success: false, error: "Phone number is required to start a WhatsApp conversation." }, 400);
      }

      const data = await ConversationService.startWhatsAppConversation({
        phoneNumber,
        name,
        initialMessage,
        facebookPageId,
        workspaceId,
      });

      return c.json({
        success: true,
        message: "WhatsApp conversation active",
        data,
      });
    } catch (err: any) {
      console.error("WhatsApp start conversation error:", err);
      return c.json({ success: false, error: err.message || "Failed to start WhatsApp conversation." }, 500);
    }
  }
}
