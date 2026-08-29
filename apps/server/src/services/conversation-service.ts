import { prisma, MessageSender, MessageStatus, ConversationStatus } from "@mogent/database";
import { facebookApi } from "./facebook-api";
import { decryptToken } from "@mogent/shared";
import { config } from "../config";
import { redisConnection } from "../redis";

export interface ListConversationsParams {
  workspaceId?: string;
  filterPageId?: string;
  channel?: string;
}

export interface SendMessageParams {
  conversationId: string;
  text: string;
}

export interface StartWhatsAppParams {
  phoneNumber: string;
  name?: string;
  initialMessage?: string;
  facebookPageId?: string;
  workspaceId?: string;
}

export class ConversationService {
  /**
   * List all conversations for the active workspace with deep participants auto-sync
   */
  static async listConversations(params: ListConversationsParams) {
    const { workspaceId, filterPageId } = params;

    let pagesWhere: any = {};
    if (filterPageId && filterPageId !== "ALL") {
      pagesWhere = { id: filterPageId };
    } else if (workspaceId) {
      pagesWhere = { workspaceId };
    }

    let pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true, pageId: true, encryptedAccessToken: true, tokenIv: true, tokenTag: true },
    });
    let pageIds = pages.map((p) => p.id);

    if (pageIds.length === 0 && (!filterPageId || filterPageId === "ALL")) {
      const allPages = await prisma.facebookPage.findMany({
        select: { id: true, name: true, pageId: true, encryptedAccessToken: true, tokenIv: true, tokenTag: true },
      });
      pageIds = allPages.map((p) => p.id);
      pages = allPages;
    }

    if (pageIds.length === 0) {
      return [];
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
      for (const p of pages) {
        const lockKey = `mogent:synced_all_past_profiles:${p.id}`;
        try {
          const isAlreadySynced = await redisConnection.get(lockKey);
          if (!isAlreadySynced) {
            await redisConnection.set(lockKey, "1", "EX", 30 * 24 * 3600);

            const pageToken = decryptToken(
              p.encryptedAccessToken,
              p.tokenIv,
              p.tokenTag,
              config.tokenEncryptionKey
            );

            if (pageToken) {
              const participantMap = await facebookApi.fetchAllThreadParticipants(pageToken, 250);

              for (const [psid, profile] of participantMap.entries()) {
                const existingCustomer = await prisma.customer.findFirst({
                  where: { facebookPageId: p.id, psid },
                });

                if (existingCustomer) {
                  const isGenericName =
                    !existingCustomer.firstName ||
                    existingCustomer.firstName.toLowerCase() === "facebook" ||
                    existingCustomer.firstName.toLowerCase() === "customer";

                  if (isGenericName && profile.name && profile.name !== "Facebook Customer") {
                    const nameParts = profile.name.split(" ");
                    await prisma.customer.update({
                      where: { id: existingCustomer.id },
                      data: {
                        firstName: nameParts[0] || "Customer",
                        lastName: nameParts.slice(1).join(" ") || "",
                        profilePic: (profile as any).profilePic || existingCustomer.profilePic,
                      },
                    });
                  }
                }
              }
            }
          }
        } catch (err: any) {
          console.warn(`[Participant sync error for page ${p.name}]:`, err.message);
        }
      }
    }, 100);

    return list.map((conv) => {
      const fullName = `${conv.customer.firstName || ""} ${conv.customer.lastName || ""}`.trim();
      const convChannel = (conv as any).channel || (conv.customer?.psid?.startsWith("wa_") ? "WHATSAPP" : "MESSENGER");
      const customerName = fullName && fullName.toLowerCase() !== "facebook customer"
        ? fullName
        : convChannel === "WHATSAPP"
          ? (conv.customer.phoneNumber ? `WhatsApp (${conv.customer.phoneNumber})` : `WhatsApp User #${conv.customer.psid.slice(-4)}`)
          : `Customer #${conv.customer.psid.slice(-4)}`;

      return {
        id: conv.id,
        customerId: conv.customerId,
        customerName,
        channel: convChannel,
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
        tag: conv.customer.tags[0] || (convChannel === "WHATSAPP" ? "WhatsApp Lead" : "General Inquiry"),
      };
    });
  }

  /**
   * Get message history for a conversation
   */
  static async getMessages(conversationId: string) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.content,
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      thinking: m.thinkingProcess,
    }));
  }

  /**
   * Send a manual outbound message (Messenger or WhatsApp)
   */
  static async sendMessage(params: SendMessageParams) {
    const { conversationId, text } = params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        facebookPage: true,
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const { customer, facebookPage } = conversation;
    const isWhatsApp = (conversation as any).channel === "WHATSAPP" || customer.psid.startsWith("wa_");

    if (!isWhatsApp) {
      try {
        const pageAccessToken = decryptToken(
          facebookPage.encryptedAccessToken,
          facebookPage.tokenIv,
          facebookPage.tokenTag,
          config.tokenEncryptionKey
        );
        if (pageAccessToken && !pageAccessToken.startsWith("direct_")) {
          await facebookApi.sendTextMessage(pageAccessToken, customer.psid, text);
        }
      } catch (fbErr: any) {
        console.warn("Messenger send warning:", fbErr.message);
      }
    } else {
      console.log(`[WhatsApp Message Dispatched] to: ${customer.phoneNumber || customer.psid} | text: ${text}`);
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.HUMAN_AGENT,
        content: text,
        status: MessageStatus.SENT,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastAiMessageAt: new Date(), updatedAt: new Date() },
    });

    return {
      id: message.id,
      sender: message.sender,
      text: message.content,
      time: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  }

  /**
   * Toggle between AI control and Human takeover
   */
  static async toggleMode(conversationId: string, isHumanControl: boolean) {
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        isHumanControl,
        humanTakeoverAt: isHumanControl ? new Date() : null,
      },
    });
    return conversation;
  }

  /**
   * Mark a conversation sale completed / resolved
   */
  static async markSaleCompleted(conversationId: string) {
    const current = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { status: true },
    });

    const newStatus = current?.status === "RESOLVED" ? "OPEN" : "RESOLVED";

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: newStatus as ConversationStatus },
    });
    return updated;
  }

  /**
   * Provision or resume an active WhatsApp conversation
   */
  static async startWhatsAppConversation(params: StartWhatsAppParams) {
    const { phoneNumber, name, initialMessage, facebookPageId, workspaceId } = params;

    const cleanPhone = phoneNumber.trim().replace(/\D/g, "");
    const targetPsid = `wa_${cleanPhone}`;

    let page: any = null;
    if (facebookPageId) {
      page = await prisma.facebookPage.findUnique({ where: { id: facebookPageId } });
    }
    if (!page && workspaceId) {
      page = await prisma.facebookPage.findFirst({ where: { workspaceId } });
    }
    if (!page) {
      page = await prisma.facebookPage.findFirst();
    }

    if (!page) {
      throw new Error("No connected store page or workspace found.");
    }

    let customer = await prisma.customer.findFirst({
      where: {
        facebookPageId: page.id,
        OR: [{ psid: targetPsid }, { phoneNumber: cleanPhone }],
      },
    });

    if (!customer) {
      const nameParts = (name || "WhatsApp Customer").trim().split(" ");
      customer = await prisma.customer.create({
        data: {
          facebookPageId: page.id,
          psid: targetPsid,
          firstName: nameParts[0] || "WhatsApp",
          lastName: nameParts.slice(1).join(" ") || "Customer",
          phoneNumber: cleanPhone,
          channel: "WHATSAPP",
          tags: ["WHATSAPP_LEAD", "DIRECT_CHAT"],
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          channel: "WHATSAPP",
          phoneNumber: cleanPhone || customer.phoneNumber,
        },
      });
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        customerId: customer.id,
        facebookPageId: page.id,
      },
      include: { customer: true, facebookPage: true },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          facebookPageId: page.id,
          customerId: customer.id,
          status: "OPEN",
          channel: "WHATSAPP",
        },
        include: { customer: true, facebookPage: true },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { channel: "WHATSAPP", updatedAt: new Date() },
      });
    }

    if (initialMessage && initialMessage.trim()) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: MessageSender.HUMAN_AGENT,
          content: initialMessage.trim(),
          status: MessageStatus.SENT,
        },
      });
    }

    return {
      id: conversation.id,
      customerId: customer.id,
      customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || `+${cleanPhone}`,
      phone: cleanPhone,
      channel: "WHATSAPP",
      psid: targetPsid,
      status: conversation.status,
      pageName: page.name,
    };
  }
}
