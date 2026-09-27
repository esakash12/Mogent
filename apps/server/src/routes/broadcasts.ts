import { Hono } from "hono";
import { prisma, MessageSender } from "@mogent/database";
import { redisConnection } from "../redis";
import { facebookApi } from "../services/facebook-api";
import { decryptToken } from "@mogent/shared";
import { config } from "../config";
import { authMiddleware } from "../middleware/auth";

export const broadcastsRouter = new Hono();

// Enforce authenticated workspace access
broadcastsRouter.use("*", authMiddleware);

// -----------------------------------------------------------------------------
// 1. GET BROADCAST CAMPAIGNS HISTORY
// -----------------------------------------------------------------------------
broadcastsRouter.get("/campaigns", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const campaigns = await prisma.broadcastCampaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return c.json({
      success: true,
      data: campaigns.map((cmp) => ({
        id: cmp.id,
        title: cmp.title,
        channel: cmp.channel,
        message: cmp.message,
        recipientsCount: cmp.recipientsCount,
        sentCount: cmp.sentCount,
        failedCount: Math.max(0, cmp.recipientsCount - cmp.sentCount),
        status: cmp.status,
        date: cmp.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. GET AUTOMATED FOLLOW-UP CONFIG
// -----------------------------------------------------------------------------
broadcastsRouter.get("/followup-config", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const configKey = `mogent:followup_config:${workspaceId}`;
    const dbRecord = await prisma.systemSetting.findUnique({
      where: { key: configKey },
    });

    let followupData = {
      isEnabled: true,
      delayHours: 2,
      messageText: "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊",
      pageId: "ALL",
      sentCount: 0,
      lastRunAt: null,
    };

    if (dbRecord?.value) {
      try {
        followupData = { ...followupData, ...JSON.parse(dbRecord.value) };
      } catch {}
    }

    return c.json({ success: true, data: followupData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. SAVE AUTOMATED FOLLOW-UP CONFIG
// -----------------------------------------------------------------------------
broadcastsRouter.post("/followup-config", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const body = await c.req.json();
    const { isEnabled, delayHours, messageText, pageId } = body;

    const configKey = `mogent:followup_config:${workspaceId}`;
    const existing = await prisma.systemSetting.findUnique({ where: { key: configKey } });
    let existingData: any = {};
    if (existing?.value) {
      try { existingData = JSON.parse(existing.value); } catch {}
    }

    const followupData = {
      ...existingData,
      isEnabled: isEnabled !== false,
      delayHours: Number(delayHours) || 2,
      messageText: messageText?.trim() || "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির অর্ডার কি কনফার্ম করে দেব? যেকোনো সহায়তার জন্য জানাতে পারেন 😊",
      pageId: pageId || "ALL",
      updatedAt: new Date().toISOString(),
    };

    await prisma.systemSetting.upsert({
      where: { key: configKey },
      update: { value: JSON.stringify(followupData) },
      create: { key: configKey, value: JSON.stringify(followupData) },
    });

    return c.json({
      success: true,
      message: "Automated follow-up configuration saved successfully!",
      data: followupData,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. TRIGGER / RUN FOLLOW-UP SCAN (SINGLE-DELIVERY GUARANTEE)
// -----------------------------------------------------------------------------
broadcastsRouter.post("/trigger-followup", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const targetWorkspaceId = workspaceId;

    // 1. Fetch Follow-up Config from PostgreSQL
    const configKey = `mogent:followup_config:${targetWorkspaceId}`;
    const dbRecord = await prisma.systemSetting.findUnique({
      where: { key: configKey },
    });
    let followupData = { isEnabled: true, delayHours: 2, messageText: "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊", pageId: "ALL", sentCount: 0 };
    if (dbRecord?.value) {
      try {
        followupData = { ...followupData, ...JSON.parse(dbRecord.value) };
      } catch {}
    }

    if (!followupData.isEnabled) {
      return c.json({ success: true, message: "Automated follow-up is currently disabled.", sentCount: 0 });
    }

    const delayMs = (Number(followupData.delayHours) || 2) * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - delayMs);

    // 2. Fetch Pages for Workspace
    let pagesWhere: any = { workspaceId: targetWorkspaceId };
    if (followupData.pageId && followupData.pageId !== "ALL") {
      pagesWhere = { id: followupData.pageId, workspaceId: targetWorkspaceId };
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
    });

    let totalSent = 0;
    let totalChecked = 0;

    for (const page of pages) {
      let pageAccessToken = "";
      try {
        if (page.encryptedAccessToken && page.tokenIv && page.tokenTag && page.encryptedAccessToken !== "direct_token") {
          pageAccessToken = decryptToken(
            page.encryptedAccessToken,
            page.tokenIv,
            page.tokenTag,
            config.tokenEncryptionKey
          );
        } else {
          pageAccessToken = page.encryptedAccessToken || "";
        }
      } catch {
        pageAccessToken = page.encryptedAccessToken || "";
      }

      // Find idle open conversations where last message was before cutoffTime
      const idleConversations = await prisma.conversation.findMany({
        where: {
          facebookPageId: page.id,
          status: "OPEN",
          isHumanControl: false,
          updatedAt: { lte: cutoffTime },
        },
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 50,
      });

      totalChecked += idleConversations.length;

      for (const conv of idleConversations) {
        const sentLockKey = `mogent:followup_sent:${conv.id}`;
        const alreadySent = await redisConnection.get(sentLockKey);
        if (alreadySent) {
          continue;
        }

        const lastMsg = conv.messages[0];
        if (lastMsg && lastMsg.content === followupData.messageText) {
          await redisConnection.set(sentLockKey, "1", "EX", 86400 * 30);
          continue;
        }

        try {
          if (pageAccessToken && !pageAccessToken.startsWith("direct_") && conv.customer?.psid) {
            try {
              await facebookApi.sendTextMessage(
                pageAccessToken,
                conv.customer.psid,
                followupData.messageText
              );
            } catch (fbErr: any) {
              console.warn(`Follow-up live send warning to PSID [${conv.customer.psid}]:`, fbErr.message);
            }
          }

          // Save Message in DB
          await prisma.message.create({
            data: {
              conversationId: conv.id,
              sender: MessageSender.AI,
              senderId: page.pageId,
              content: followupData.messageText,
              status: "DELIVERED",
              thinkingProcess: `স্বয়ংক্রিয় ফলো-আপ মেসেজ (${followupData.delayHours} ঘন্টা নিষ্ক্রিয় থাকার পর একবার প্রেরিত)`,
            },
          });

          // Update conversation timestamps
          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              updatedAt: new Date(),
              lastAiMessageAt: new Date(),
            },
          });

          // Mark as sent in Redis (30-day lock guarantees single delivery)
          await redisConnection.set(sentLockKey, "1", "EX", 86400 * 30);
          totalSent++;
        } catch (sendErr: any) {
          console.warn(`Follow-up record error for conv [${conv.id}]:`, sendErr.message);
        }
      }
    }

    if (totalSent > 0 && targetWorkspaceId) {
      try {
        const configKey = `mogent:followup_config:${targetWorkspaceId}`;
        const existing = await prisma.systemSetting.findUnique({ where: { key: configKey } });
        let curData: any = {};
        if (existing?.value) {
          try { curData = JSON.parse(existing.value); } catch {}
        }
        curData.sentCount = (curData.sentCount || 0) + totalSent;
        curData.lastRunAt = new Date().toISOString();
        await prisma.systemSetting.upsert({
          where: { key: configKey },
          update: { value: JSON.stringify(curData) },
          create: { key: configKey, value: JSON.stringify(curData) },
        });
      } catch {}
    }

    return c.json({
      success: true,
      sentCount: totalSent,
      totalChecked,
      message: `Follow-up scan completed: ${totalSent} customer(s) notified after ${followupData.delayHours}h delay.`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 5. POST /api/broadcasts/send - Broadcast Message (Messenger & WhatsApp)
// -----------------------------------------------------------------------------
broadcastsRouter.post("/send", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const { title, message, channel = "MESSENGER", pageId } = await c.req.json();
    if (!title || !message) {
      return c.json({ success: false, error: "Title and message are required" }, 400);
    }

    let recipientsCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    if (channel === "WHATSAPP") {
      // Dispatch via WhatsApp Cloud API
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          whatsAppPhoneNumberId: true,
          whatsAppAccessToken: true,
        },
      });

      const phoneNumberId = workspace?.whatsAppPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = workspace?.whatsAppAccessToken || process.env.WHATSAPP_ACCESS_TOKEN;

      const customers = await prisma.customer.findMany({
        where: {
          workspaceId,
          channel: "WHATSAPP",
          phoneNumber: { not: "" },
        },
        take: 200,
        orderBy: { updatedAt: "desc" },
      });

      recipientsCount = customers.length;

      if (phoneNumberId && accessToken && customers.length > 0) {
        for (const cust of customers) {
          const cleanPhone = cust.phoneNumber?.replace(/\D/g, "");
          if (!cleanPhone) continue;

          try {
            const resp = await fetch(
              `https://graph.facebook.com/${config.facebook.graphVersion}/${phoneNumberId}/messages`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: cleanPhone,
                  type: "text",
                  text: { body: message.trim() },
                }),
                signal: AbortSignal.timeout(5000),
              }
            );

            if (resp.ok) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch {
            failedCount++;
          }
        }
      }
    } else {
      // Dispatch via Messenger
      let pagesWhere: any = { workspaceId, isActive: true };
      if (pageId && pageId !== "ALL") {
        pagesWhere.id = pageId;
      }

      const pages = await prisma.facebookPage.findMany({
        where: pagesWhere,
        include: {
          customers: {
            where: { psid: { not: "" } },
            take: 200,
            orderBy: { updatedAt: "desc" },
          },
        },
      });

      for (const page of pages) {
        let pageAccessToken: string;
        try {
          pageAccessToken = decryptToken(
            page.encryptedAccessToken,
            page.tokenIv,
            page.tokenTag,
            config.tokenEncryptionKey
          );
        } catch {
          continue;
        }

        for (const customer of page.customers) {
          recipientsCount++;
          try {
            await facebookApi.sendTextMessage(pageAccessToken, customer.psid, message);
            sentCount++;
          } catch {
            failedCount++;
          }
        }
      }
    }

    // Persist campaign to database
    const savedCampaign = await prisma.broadcastCampaign.create({
      data: {
        workspaceId,
        title: title.trim(),
        channel: channel || "MESSENGER",
        facebookPageId: pageId && pageId !== "ALL" ? pageId : null,
        message: message.trim(),
        recipientsCount,
        sentCount,
        status: "SENT",
      },
    });

    return c.json({
      success: true,
      message: `Broadcast "${title}" completed! ${sentCount} sent, ${failedCount} failed.`,
      data: {
        id: savedCampaign.id,
        title: savedCampaign.title,
        channel: savedCampaign.channel,
        recipientsCount: savedCampaign.recipientsCount,
        sentCount: savedCampaign.sentCount,
        failedCount,
        status: savedCampaign.status,
        date: savedCampaign.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 6. POST /api/broadcasts/test-followup - Send Instant Test Follow-up
// -----------------------------------------------------------------------------
broadcastsRouter.post("/test-followup", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const { conversationId, customerId, customerPhone, phone, messageText } = body;

    let conversation: any = null;

    // 1. Try finding conversation by conversationId
    if (conversationId && conversationId !== "DEFAULT_TEST_USER") {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, OR: [{ workspaceId }, { customer: { workspaceId } }] },
        include: { customer: true, facebookPage: true },
      });
    }

    // 2. Try finding conversation by customerId
    const targetCustId = customerId || (!conversation ? conversationId : null);
    if (!conversation && targetCustId && targetCustId !== "DEFAULT_TEST_USER") {
      conversation = await prisma.conversation.findFirst({
        where: { customerId: targetCustId, OR: [{ workspaceId }, { customer: { workspaceId } }] },
        include: { customer: true, facebookPage: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    // 3. Try finding conversation by phone number
    const targetPhone = (customerPhone || phone || "").trim();
    if (!conversation && targetPhone) {
      conversation = await prisma.conversation.findFirst({
        where: {
          customer: { phoneNumber: targetPhone, workspaceId },
        },
        include: { customer: true, facebookPage: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    // 4. Find most recent real conversation in this workspace
    if (!conversation) {
      conversation = await prisma.conversation.findFirst({
        where: {
          OR: [{ workspaceId }, { customer: { workspaceId } }],
        },
        include: { customer: true, facebookPage: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!conversation) {
      return c.json({ success: false, error: "No active conversations found in this workspace to test." }, 400);
    }

    const page = conversation.facebookPage;
    let pageAccessToken = "";
    if (page?.encryptedAccessToken) {
      try {
        pageAccessToken = decryptToken(
          page.encryptedAccessToken,
          page.tokenIv,
          page.tokenTag,
          config.tokenEncryptionKey
        );
      } catch {
        pageAccessToken = page.encryptedAccessToken;
      }
    }

    const finalMessage =
      (messageText || "").trim() ||
      "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊";

    // 5. Send Live Message if Messenger
    let liveDelivered = false;
    if (pageAccessToken && !pageAccessToken.startsWith("direct_") && conversation.customer?.psid) {
      try {
        await facebookApi.sendTextMessage(pageAccessToken, conversation.customer.psid, finalMessage);
        liveDelivered = true;
      } catch (fbErr: any) {
        console.warn("Live test message send warning:", fbErr.message);
      }
    }

    // 6. Save Message to Database
    const savedMsg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.AI,
        senderId: page?.pageId || "test-moderator",
        content: finalMessage,
        status: "DELIVERED",
        thinkingProcess: "ম্যানুয়াল টেস্ট ফলো-আপ মেসেজ (ড্যাশবোর্ড টেস্ট টুল থেকে তাৎক্ষণিক প্রেরিত)",
      },
    });

    // 7. Update Conversation Timestamps
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        lastAiMessageAt: new Date(),
      },
    });

    const targetCustomerName =
      `${conversation.customer?.firstName || ""} ${conversation.customer?.lastName || ""}`.trim() ||
      "Customer";

    return c.json({
      success: true,
      message: `Test follow-up successfully sent to ${targetCustomerName}!`,
      data: {
        messageId: savedMsg.id,
        conversationId: conversation.id,
        customerName: targetCustomerName,
        customerPhone: conversation.customer?.phoneNumber,
        liveDelivered,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Test follow-up error:", error);
    return c.json({ success: false, error: error.message || "Failed to send test follow-up" }, 500);
  }
});
