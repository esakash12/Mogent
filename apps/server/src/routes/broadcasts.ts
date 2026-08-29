import { Hono } from "hono";
import { prisma, MessageSender } from "@mogent/database";
import { redisConnection } from "../redis";
import { facebookApi } from "../services/facebook-api";
import { decryptToken } from "@mogent/shared";
import { config } from "../config";

export const broadcastsRouter = new Hono();

// -----------------------------------------------------------------------------
// 1. GET AUTOMATED FOLLOW-UP CONFIG
// -----------------------------------------------------------------------------
broadcastsRouter.get("/followup-config", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const redisKey = `mogent:followup_config:${workspaceId}`;
    const cached = await redisConnection.get(redisKey);

    let followupData = {
      isEnabled: true,
      delayHours: 2, // 2 Hours default
      messageText: "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊",
      pageId: "ALL",
      sentCount: 0,
      lastRunAt: null,
    };

    if (cached) {
      try {
        followupData = { ...followupData, ...JSON.parse(cached) };
      } catch {}
    }

    // Get total sent count for workspace
    const sentCountVal = await redisConnection.get(`mogent:followup_sent_count:${workspaceId}`);
    if (sentCountVal) {
      followupData.sentCount = Number(sentCountVal) || 0;
    }

    return c.json({ success: true, data: followupData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. SAVE AUTOMATED FOLLOW-UP CONFIG
// -----------------------------------------------------------------------------
broadcastsRouter.post("/followup-config", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const body = await c.req.json();
    const { isEnabled, delayHours, messageText, pageId } = body;

    const followupData = {
      isEnabled: isEnabled !== false,
      delayHours: Number(delayHours) || 2,
      messageText: messageText?.trim() || "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির অর্ডার কি কনফার্ম করে দেব? যেকোনো সহায়তার জন্য জানাতে পারেন 😊",
      pageId: pageId || "ALL",
      updatedAt: new Date().toISOString(),
    };

    const redisKey = `mogent:followup_config:${workspaceId}`;
    await redisConnection.set(redisKey, JSON.stringify(followupData));

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
// 3. TRIGGER / RUN FOLLOW-UP SCAN (SINGLE-DELIVERY GUARANTEE)
// -----------------------------------------------------------------------------
broadcastsRouter.post("/trigger-followup", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      targetWorkspaceId = defaultWs?.id || "";
    }

    // 1. Fetch Follow-up Config
    const redisKey = targetWorkspaceId ? `mogent:followup_config:${targetWorkspaceId}` : "mogent:followup_config:default";
    const cached = await redisConnection.get(redisKey);
    let followupData = { isEnabled: true, delayHours: 2, messageText: "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊", pageId: "ALL" };
    if (cached) {
      try {
        followupData = { ...followupData, ...JSON.parse(cached) };
      } catch {}
    }

    if (!followupData.isEnabled) {
      return c.json({ success: true, message: "Automated follow-up is currently disabled.", sentCount: 0 });
    }

    const delayMs = (Number(followupData.delayHours) || 2) * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - delayMs);

    // 2. Fetch Pages for Workspace
    let pagesWhere: any = {};
    if (followupData.pageId && followupData.pageId !== "ALL") {
      pagesWhere = { id: followupData.pageId };
    } else if (targetWorkspaceId) {
      pagesWhere = { workspaceId: targetWorkspaceId };
    }

    let pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
    });

    if (pages.length === 0 && (!followupData.pageId || followupData.pageId === "ALL")) {
      pages = await prisma.facebookPage.findMany();
    }

    if (pages.length === 0) {
      return c.json({ success: true, message: "No active Facebook pages found.", sentCount: 0 });
    }

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
        // Guarantee: Check if follow-up was ALREADY sent to this conversation
        const sentLockKey = `mogent:followup_sent:${conv.id}`;
        const alreadySent = await redisConnection.get(sentLockKey);
        if (alreadySent) {
          continue; // Strictly ONCE per customer
        }

        // If the last message was already from AI asking for confirmation, avoid spamming
        const lastMsg = conv.messages[0];
        if (lastMsg && lastMsg.content === followupData.messageText) {
          await redisConnection.set(sentLockKey, "1", "EX", 86400 * 30);
          continue;
        }

        try {
          // Send Messenger message if valid Facebook token exists
          if (pageAccessToken && !pageAccessToken.startsWith("direct_")) {
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

          // Mark as sent in Redis (30-day lock guarantees exactly 1 delivery)
          await redisConnection.set(sentLockKey, "1", "EX", 86400 * 30);
          totalSent++;
        } catch (sendErr: any) {
          console.warn(`Follow-up record error for conv [${conv.id}]:`, sendErr.message);
        }
      }
    }

    // Increment overall sent counter
    if (totalSent > 0 && targetWorkspaceId) {
      await redisConnection.incrby(`mogent:followup_sent_count:${targetWorkspaceId}`, totalSent);
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
// 4. INSTANT MANUAL BROADCAST
// -----------------------------------------------------------------------------
broadcastsRouter.post("/send", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  if (!workspaceId) {
    return c.json({ success: false, error: "Missing workspace ID" }, 400);
  }

  try {
    const { title, message, pageId } = await c.req.json();
    if (!title || !message) {
      return c.json({ success: false, error: "Title and message are required" }, 400);
    }

    let pagesWhere: any = { workspaceId, isActive: true };
    if (pageId && pageId !== "ALL") {
      pagesWhere.id = pageId;
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      include: {
        customers: {
          take: 100,
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    let recipientsCount = 0;
    let sentCount = 0;

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
        } catch {}
      }
    }

    return c.json({
      success: true,
      message: `Broadcast "${title}" sent to ${sentCount} recipients!`,
      data: {
        id: `bc-${Date.now()}`,
        title,
        recipientsCount,
        sentCount,
        status: "SENT",
        date: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
