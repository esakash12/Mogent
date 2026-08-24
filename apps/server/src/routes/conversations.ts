import { Hono } from "hono";
import { prisma, MessageSender, MessageStatus } from "@mogent/database";

export const conversationsRouter = new Hono();

// GET /api/conversations - List conversations for active workspace
conversationsRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let pagesWhere: any = {};
    if (workspaceId) {
      pagesWhere = { workspaceId };
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true },
    });
    const pageIds = pages.map((p) => p.id);

    if (pageIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const list = await prisma.conversation.findMany({
      where: { facebookPageId: { in: pageIds } },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return c.json({
      success: true,
      data: list.map((conv) => ({
        id: conv.id,
        customerName: `${conv.customer.firstName || ""} ${conv.customer.lastName || ""}`.trim() || "Facebook Customer",
        psid: conv.customer.psid,
        avatar: (conv.customer.firstName?.[0] || "C") + (conv.customer.lastName?.[0] || "U"),
        status: conv.status,
        isHumanControl: conv.isHumanControl,
        sentiment: conv.customer.sentimentScore ?? 0.8,
        phone: conv.customer.phoneNumber,
        address: conv.customer.deliveryAddress,
        lastMessage: conv.messages[0]?.content || "No messages yet",
        lastTime: conv.messages[0] ? new Date(conv.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
        tag: conv.customer.tags[0] || "General Inquiry",
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/conversations/:id/messages - Get message history
conversationsRouter.get("/:id/messages", async (c) => {
  const { id } = c.req.param();
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    return c.json({
      success: true,
      data: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        thinking: m.thinkingProcess,
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/conversations/:id/messages - Send message
conversationsRouter.post("/:id/messages", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { text } = body;

  if (!text) {
    return c.json({ success: false, error: "Text required" }, 400);
  }

  try {
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        sender: MessageSender.HUMAN_AGENT,
        content: text,
        status: MessageStatus.DELIVERED,
      },
    });

    return c.json({
      success: true,
      data: {
        id: message.id,
        sender: message.sender,
        text: message.content,
        time: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/conversations/:id/toggle-mode - Switch between AI & Human control
conversationsRouter.post("/:id/toggle-mode", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { isHumanControl } = body;

  try {
    const updated = await prisma.conversation.update({
      where: { id },
      data: { isHumanControl: Boolean(isHumanControl) },
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
