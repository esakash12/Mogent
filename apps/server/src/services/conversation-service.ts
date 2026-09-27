import { prisma, MessageSender, MessageStatus, ConversationStatus } from "@mogent/database";
import { facebookApi } from "./facebook-api";
import { decryptToken } from "@mogent/shared";
import { config } from "../config";
import { redisConnection } from "../redis";
import { formatBdTime } from "../utils/timezone";
import fs from "fs";
import path from "path";

export interface ListConversationsParams {
  workspaceId?: string;
  filterPageId?: string;
  channel?: string;
  limit?: number;
  skip?: number;
  search?: string;
  all?: boolean;
}

export interface SendMessageParams {
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "FILE" | "TEXT";
  fileName?: string;
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
   * List conversations for the active workspace with safe pagination and search
   */
  static async listConversations(params: ListConversationsParams) {
    const { workspaceId, filterPageId } = params;

    if (!workspaceId) {
      return [];
    }

    let pagesWhere: any = { workspaceId };
    if (filterPageId && filterPageId !== "ALL") {
      pagesWhere.id = filterPageId;
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true, pageId: true, encryptedAccessToken: true, tokenIv: true, tokenTag: true },
    });
    const pageIds = pages.map((p) => p.id);

    // Stop cross-tenant leaks: If workspace has no pages, return empty array immediately
    if (pageIds.length === 0) {
      return [];
    }

    const isAll = params.all === true;
    const limit = isAll ? undefined : (params.limit ? Number(params.limit) : 40);
    const skip = params.skip ? Number(params.skip) : 0;
    const search = (params.search || "").trim();

    const whereClause: any = {
      facebookPageId: { in: pageIds },
    };

    if (params.channel && params.channel !== "ALL") {
      whereClause.channel = params.channel;
    }

    if (search) {
      whereClause.OR = [
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { phoneNumber: { contains: search } } },
        { customer: { psid: { contains: search } } },
      ];
    }

    const list = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        customer: true,
        facebookPage: {
          select: { id: true, name: true, pageId: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: skip > 0 ? skip : undefined,
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
          ? formatBdTime(conv.messages[0].createdAt)
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
      text: m.content || "",
      mediaType: m.mediaType,
      mediaUrl: m.mediaUrl,
      fileName: m.fileName || undefined,
      time: formatBdTime(m.createdAt),
      thinking: m.thinkingProcess,
    }));
  }

  /**
   * Send a manual outbound message (Messenger or WhatsApp, Text or Media/PDF)
   */
  static async sendMessage(params: SendMessageParams) {
    const { conversationId, text, mediaUrl, mediaType, fileName } = params;

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
    const cleanText = (text || "").trim();
    const isMedia = Boolean(mediaUrl);
    const fallbackContent =
      cleanText ||
      (mediaType === "FILE"
        ? `[Document: ${fileName || "document.pdf"}]`
        : isMedia
        ? "[Image]"
        : "");

    if (!isWhatsApp) {
      try {
        const pageAccessToken = decryptToken(
          facebookPage.encryptedAccessToken,
          facebookPage.tokenIv,
          facebookPage.tokenTag,
          config.tokenEncryptionKey
        );
        if (pageAccessToken && !pageAccessToken.startsWith("direct_")) {
          // If media attachment provided, dispatch attachment first
          if (isMedia && mediaUrl) {
            await facebookApi.sendAttachmentMessage(
              pageAccessToken,
              customer.psid,
              mediaType === "FILE" ? "file" : "image",
              mediaUrl,
              fileName
            );
          }
          // If text caption provided, dispatch text
          if (cleanText) {
            await facebookApi.sendTextMessage(pageAccessToken, customer.psid, cleanText);
          }
        }
      } catch (fbErr: any) {
        console.warn("Messenger send warning:", fbErr.message);
      }
    } else {
      try {
        const wsId = facebookPage?.workspaceId || "default";
        let raw = await redisConnection.get(`mogent:whatsapp_config:${wsId}`);
        if (!raw && wsId !== "default") {
          raw = await redisConnection.get("mogent:whatsapp_config:default");
        }
        let saved = raw ? JSON.parse(raw) : null;

        // Fallback: If not found directly under wsId, auto-scan existing WhatsApp configs in Redis
        if (!saved?.phoneNumberId || !saved?.accessToken) {
          try {
            const keys = await redisConnection.keys("mogent:whatsapp_config:*");
            for (const k of keys) {
              if (k.endsWith(":default")) continue;
              const candRaw = await redisConnection.get(k);
              if (candRaw) {
                const cand = JSON.parse(candRaw);
                if (cand?.phoneNumberId && cand?.accessToken) {
                  saved = cand;
                  break;
                }
              }
            }
          } catch {}
        }
        if (saved?.phoneNumberId && saved?.accessToken) {
          const cleanPhone = (customer.phoneNumber || customer.psid.replace("wa_", "")).replace(/\D/g, "");
          if (cleanPhone) {
            if (isMedia && mediaUrl) {
              // 1. Resolve local disk file or upload binary directly to WhatsApp Media API
              let mediaId: string | null = null;
              let bufferToSend: Buffer | null = null;
              let mimeType = mediaType === "FILE" ? "application/pdf" : "image/jpeg";

              if (mediaUrl.includes("/uploads/")) {
                try {
                  const rel = mediaUrl.substring(mediaUrl.indexOf("/uploads/") + "/uploads/".length).split("?")[0];
                  const candidates = [
                    path.join(process.cwd(), "uploads", rel),
                    path.join(process.cwd(), "apps", "server", "uploads", rel),
                    path.resolve(process.cwd(), "..", "uploads", rel),
                    path.resolve(__dirname, "../../uploads", rel),
                    path.resolve(__dirname, "../../../uploads", rel),
                  ];
                  for (const cand of candidates) {
                    if (fs.existsSync(cand)) {
                      bufferToSend = fs.readFileSync(cand);
                      if (cand.endsWith(".png")) mimeType = "image/png";
                      else if (cand.endsWith(".webp")) mimeType = "image/webp";
                      else if (cand.endsWith(".pdf")) mimeType = "application/pdf";
                      else if (cand.endsWith(".gif")) mimeType = "image/gif";
                      break;
                    }
                  }
                } catch {}
              }

              if (!bufferToSend && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))) {
                try {
                  const fetchRes = await fetch(mediaUrl);
                  if (fetchRes.ok) {
                    const arr = await fetchRes.arrayBuffer();
                    bufferToSend = Buffer.from(arr);
                    const ct = fetchRes.headers.get("content-type");
                    if (ct) mimeType = ct;
                  }
                } catch {}
              }

              if (bufferToSend) {
                try {
                  const formData = new FormData();
                  formData.append("messaging_product", "whatsapp");
                  const finalFilename = fileName || (mediaType === "FILE" ? "document.pdf" : "image.jpg");
                  formData.append("file", new File([new Uint8Array(bufferToSend)], finalFilename, { type: mimeType }));
                  formData.append("type", mimeType);

                  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${saved.phoneNumberId}/media`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${saved.accessToken}`,
                    },
                    body: formData,
                  });

                  if (uploadRes.ok) {
                    const uploadData: any = await uploadRes.json();
                    if (uploadData?.id) {
                      mediaId = uploadData.id;
                    }
                  } else {
                    const errTxt = await uploadRes.text();
                    console.warn("WhatsApp Media API upload notice:", errTxt);
                  }
                } catch (upErr: any) {
                  console.warn("WhatsApp local binary media upload error:", upErr.message);
                }
              }

              // 2. Dispatch Document or Image via WhatsApp Cloud API
              if (mediaType === "FILE") {
                const docObj = mediaId
                  ? { id: mediaId, caption: cleanText || undefined, filename: fileName || "document.pdf" }
                  : { link: mediaUrl, caption: cleanText || undefined, filename: fileName || "document.pdf" };

                await fetch(`https://graph.facebook.com/v20.0/${saved.phoneNumberId}/messages`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${saved.accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: cleanPhone,
                    type: "document",
                    document: docObj,
                  }),
                });
              } else {
                const imgObj = mediaId
                  ? { id: mediaId, caption: cleanText || undefined }
                  : { link: mediaUrl, caption: cleanText || undefined };

                await fetch(`https://graph.facebook.com/v20.0/${saved.phoneNumberId}/messages`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${saved.accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: cleanPhone,
                    type: "image",
                    image: imgObj,
                  }),
                });
              }
            } else if (cleanText) {
              await fetch(`https://graph.facebook.com/v20.0/${saved.phoneNumberId}/messages`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${saved.accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: cleanPhone,
                  type: "text",
                  text: { body: cleanText },
                }),
              });
            }
          }
        }
      } catch (waErr: any) {
        console.warn("WhatsApp dispatch error:", waErr.message);
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        sender: MessageSender.HUMAN_AGENT,
        content: fallbackContent,
        mediaType: (mediaType as any) || (isMedia ? "IMAGE" : "TEXT"),
        mediaUrl: mediaUrl || undefined,
        fileName: fileName || undefined,
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
      mediaType: message.mediaType,
      mediaUrl: message.mediaUrl,
      fileName: message.fileName,
      time: formatBdTime(message.createdAt),
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
      page = await prisma.facebookPage.findFirst({
        where: workspaceId ? { id: facebookPageId, workspaceId } : { id: facebookPageId },
      });
    }
    if (!page && workspaceId) {
      page = await prisma.facebookPage.findFirst({ where: { workspaceId } });
    }

    if (!page && workspaceId) {
      // Auto-provision a dedicated WhatsApp store page for this workspace
      page = await prisma.facebookPage.create({
        data: {
          workspaceId,
          pageId: `wa-store-${Date.now()}`,
          name: "WhatsApp Store",
          category: "WhatsApp",
          encryptedAccessToken: "wa_direct_token",
          tokenIv: "wa_direct_iv",
          tokenTag: "wa_direct_tag",
          verifyToken: "mogent_fb_verify_token_secure",
        },
      });
    }

    if (!page) {
      throw new Error("No connected store page found for this workspace. Please connect a store first.");
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
      const cleanMsg = initialMessage.trim();
      // Dispatch to WhatsApp Cloud API
      try {
        const wsId = workspaceId || page.workspaceId || "default";
        let raw = await redisConnection.get(`mogent:whatsapp_config:${wsId}`);
        if (!raw && wsId !== "default") {
          raw = await redisConnection.get("mogent:whatsapp_config:default");
        }
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.phoneNumberId && saved?.accessToken) {
          await fetch(`https://graph.facebook.com/v20.0/${saved.phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${saved.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "text",
              text: { body: cleanMsg },
            }),
          });
        }
      } catch (waErr: any) {
        console.warn("WhatsApp initialMessage dispatch error:", waErr.message);
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: MessageSender.HUMAN_AGENT,
          content: cleanMsg,
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
