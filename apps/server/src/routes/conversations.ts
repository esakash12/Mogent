import { Hono } from "hono";
import { ConversationsController } from "../controllers/conversations.controller";

export const conversationsRouter = new Hono();

// GET /api/conversations - List conversations for active workspace
conversationsRouter.get("/", ConversationsController.list);

// POST /api/conversations/whatsapp/start - Start or find an active WhatsApp conversation
conversationsRouter.post("/whatsapp/start", ConversationsController.startWhatsApp);

// GET /api/conversations/:id/messages - Get message history
conversationsRouter.get("/:id/messages", ConversationsController.getMessages);

// POST /api/conversations/:id/messages - Send message
conversationsRouter.post("/:id/messages", ConversationsController.sendMessage);

// POST /api/conversations/:id/toggle-mode - Switch between AI & Human control
conversationsRouter.post("/:id/toggle-mode", ConversationsController.toggleMode);

// POST /api/conversations/:id/complete-sale - Mark conversation sale completed
conversationsRouter.post("/:id/complete-sale", ConversationsController.completeSale);
