import { Hono } from "hono";
import { prisma, MessageSender, MessageStatus } from "@mogent/database";
import { facebookApi } from "../services/facebook-api";
import { decryptToken } from "@mogent/shared";
import { config } from "../config";
import { telegramAlertsQueue } from "../queue/message-queue";
import { redisConnection } from "../redis";

export const conversationsRouter = new Hono();

// GET /api/conversations - List conversations for active workspace
conversationsRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  const filterPageId = c.req.query("pageId");

  try {
    let pagesWhere: any = {};
    if (filterPageId && filterPageId !== "ALL") {
      pagesWhere = { id: filterPageId };
    } else if (workspaceId) {
      pagesWhere = { workspaceId };
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true, pageId: true, encryptedAccessToken: true, tokenIv: true, tokenTag: true },
    });
    const pageIds = pages.map((p) => p.id);

    if (pageIds.length === 0) {
      return c.json({ success: true, data: [] });
    }

    const list = await prisma.conversation.findMany({
      where: { facebookPageId: { in: pageIds } },
      include: {
        customer: true,
        facebookPage: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Background One-Time Auto-Healing with Redis Lock (Zero repeated overhead)
    setTimeout(async () => {
      // 1. One-time deep history sync per connected page
      for (const p of pages) {
        const lockKey = `mogent:synced_all_past_profiles:${p.id}`;
        try {
          const isAlreadySynced = await redisConnection.get(lockKey);
          if (!isAlreadySynced) {
            // Set lock for 30 days so this never repeats
            await redisConnection.set(lockKey, "1", "EX", 30 * 24 * 3600);

            const pageToken = decryptToken(
              p.encryptedAccessToken,
              p.tokenIv,
              p.tokenTag,
              config.tokenEncryptionKey
            );

            if (pageToken) {
              // Deep paginate up to 250 past threads to get all participants' full names
              const participantMap = await facebookApi.fetchAllThreadParticipants(pageToken, 250);

              for (const [psid, info] of participantMap.entries()) {
                const existing = await prisma.customer.findFirst({
                  where: { facebookPageId: p.id, psid },
                });

                if (existing && (!existing.firstName || existing.firstName.startsWith("Customer #") || !existing.profilePic)) {
                  let picUrl = existing.profilePic;
                  if (!picUrl) {
                    picUrl = await facebookApi.fetchCustomerPicture(pageToken, psid);
                  }
                  await prisma.customer.update({
                    where: { id: existing.id },
                    data: {
                      firstName: info.firstName || existing.firstName,
                      lastName: info.lastName || existing.lastName,
                      profilePic: picUrl || existing.profilePic,
                    },
                  });
                }
              }
            }
          }
        } catch (syncErr) {
          console.warn(`One-time history sync warning for page [${p.id}]:`, syncErr);
        }
      }

      // 2. Immediate healing for visible list items with missing info
      for (const conv of list) {
        if ((!conv.customer.firstName || conv.customer.firstName.startsWith("Customer #") || !conv.customer.profilePic) && conv.facebookPage) {
          try {
            const pageToken = decryptToken(
              conv.facebookPage.encryptedAccessToken,
              conv.facebookPage.tokenIv,
              conv.facebookPage.tokenTag,
              config.tokenEncryptionKey
            );
            if (pageToken) {
              const profile = await facebookApi.fetchCustomerProfile(pageToken, conv.customer.psid);
              if (profile?.first_name || profile?.profile_pic) {
                await prisma.customer.update({
                  where: { id: conv.customer.id },
                  data: {
                    firstName: profile?.first_name || conv.customer.firstName,
                    lastName: profile?.last_name || conv.customer.lastName,
                    profilePic: profile?.profile_pic || conv.customer.profilePic,
                  },
                });
              }
            }
          } catch (e) {
            // Ignore background sync errors
          }
        }
      }
    }, 100);

    return c.json({
      success: true,
      data: list.map((conv) => {
        const fullName = `${conv.customer.firstName || ""} ${conv.customer.lastName || ""}`.trim();
        const customerName = fullName && fullName.toLowerCase() !== "facebook customer"
          ? fullName
          : `Customer #${conv.customer.psid.slice(-4)}`;

        return {
          id: conv.id,
          customerName,
          psid: conv.customer.psid,
          avatar: conv.customer.profilePic || (conv.customer.firstName?.[0] || conv.customer.psid.slice(-2).toUpperCase()),
          profilePic: conv.customer.profilePic,
          pageId: conv.facebookPageId,
          pageName: conv.facebookPage?.name || "Connected Page",
          fbPageId: conv.facebookPage?.pageId,
          status: conv.status,
          isHumanControl: conv.isHumanControl,
          sentiment: conv.customer.sentimentScore ?? 0.8,
          phone: conv.customer.phoneNumber,
          address: conv.customer.deliveryAddress,
          lastMessage: conv.messages[0]?.content || "No messages yet",
          lastTime: conv.messages[0]
            ? new Date(conv.messages[0].createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Just now",
          tag: conv.customer.tags[0] || "General Inquiry",
        };
      }),
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
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        facebookPage: true,
      },
    });

    if (!conversation) {
      return c.json({ success: false, error: "Conversation not found" }, 404);
    }

    const { customer, facebookPage } = conversation;

    // Decrypt token
    const pageAccessToken = decryptToken(
      facebookPage.encryptedAccessToken,
      facebookPage.tokenIv,
      facebookPage.tokenTag,
      config.tokenEncryptionKey
    );

    // Send to Facebook
    await facebookApi.sendTextMessage(pageAccessToken, customer.psid, text);

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        sender: MessageSender.HUMAN_AGENT,
        content: text,
        status: MessageStatus.SENT,
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastAiMessageAt: new Date() }, // update timestamp so it bubbles up
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
    console.error("Manual send error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/conversations/:id/toggle-mode - Switch between AI & Human control
conversationsRouter.post("/:id/toggle-mode", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const { isHumanControl } = body;

  try {
    const isHuman = Boolean(isHumanControl);
    const updated = await prisma.conversation.update({
      where: { id },
      data: { 
        isHumanControl: isHuman,
        status: isHuman ? "HANDOFF_REQUIRED" : "OPEN",
        humanTakeoverAt: isHuman ? new Date() : null
      },
      include: {
        facebookPage: true,
        customer: true,
      },
    });

    // If human control was activated, dispatch a Telegram notification
    if (isHuman && updated.facebookPage) {
      try {
        await telegramAlertsQueue.add("send-escalation-alert", {
          workspaceId: updated.facebookPage.workspaceId,
          pageId: updated.facebookPage.pageId,
          conversationId: updated.id,
          customerName: `${updated.customer.firstName || ""} ${updated.customer.lastName || ""}`.trim() || undefined,
          customerPsid: updated.customer.psid,
          reason: "Manual Human Takeover Activated from Dashboard Inbox",
          messageSnippet: "Manager manually took over the conversation.",
          urgency: "HIGH",
        });
      } catch (err: any) {
        console.warn("Failed to dispatch manual takeover Telegram alert:", err.message);
      }
    }

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
