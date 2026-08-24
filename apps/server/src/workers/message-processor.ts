import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import { config } from "../config";
import { prisma } from "@mogent/database";
import { decryptToken, ProcessMessageJobPayload, SendTelegramAlertPayload } from "@mogent/shared";
import { facebookApi } from "../services/facebook-api";
import { AiProxyClient } from "../ai-client";
import { telegramAlertsQueue } from "../queue/message-queue";

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

export function startMessageWorker() {
  const worker = new Worker<ProcessMessageJobPayload>(
    "incoming-messages",
    async (job: Job<ProcessMessageJobPayload>) => {
      const { pageId, senderPsid, mid, text, mediaType, mediaUrl, timestamp } = job.data;

      console.log(`🤖 Processing message job [${job.id}] for Customer [${senderPsid}] on Page [${pageId}]`);

      // 1. Fetch Facebook Page from Database
      const page = await prisma.facebookPage.findUnique({
        where: { pageId },
        include: {
          workspace: {
            include: {
              telegramConfigs: { where: { isActive: true } },
            },
          },
        },
      });

      if (!page || !page.isActive) {
        console.warn(`⚠️ Facebook Page [${pageId}] not found or inactive. Skipping.`);
        return;
      }

      if (page.aiMode === "OFF") {
        console.log(`ℹ️ AI Mode is OFF for Page [${page.name}]. Skipping.`);
        return;
      }

      // 2. Decrypt Facebook Page Access Token
      let pageAccessToken: string;
      try {
        pageAccessToken = decryptToken(
          page.encryptedAccessToken,
          page.tokenIv,
          page.tokenTag,
          config.tokenEncryptionKey
        );
      } catch (decryptErr) {
        console.error(`❌ Failed to decrypt access token for Page [${page.name}]:`, decryptErr);
        return;
      }

      // 3. Find or Create Customer
      let customer = await prisma.customer.findUnique({
        where: {
          facebookPageId_psid: {
            facebookPageId: page.id,
            psid: senderPsid,
          },
        },
      });

      if (!customer) {
        // Fetch profile details from Facebook Graph API
        const profile = await facebookApi.fetchCustomerProfile(pageAccessToken, senderPsid);
        customer = await prisma.customer.create({
          data: {
            facebookPageId: page.id,
            psid: senderPsid,
            firstName: profile?.first_name,
            lastName: profile?.last_name,
            profilePic: profile?.profile_pic,
            locale: profile?.locale,
            timezone: profile?.timezone,
            gender: profile?.gender,
          },
        });
      }

      // 4. Find or Create Active Conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          facebookPageId: page.id,
          customerId: customer.id,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            facebookPageId: page.id,
            customerId: customer.id,
            status: "OPEN",
          },
        });
      }

      // 5. Check Human Handoff State
      if (conversation.isHumanControl && conversation.humanTakeoverAt) {
        const timeoutMs = page.humanHandoffTimeoutMins * 60 * 1000;
        const timePassed = Date.now() - conversation.humanTakeoverAt.getTime();

        if (timePassed < timeoutMs) {
          console.log(`👤 Conversation [${conversation.id}] is currently under HUMAN control. AI standing by.`);
          // Save customer message only
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              mid,
              sender: "CUSTOMER",
              senderId: senderPsid,
              content: text,
              mediaType,
              mediaUrl,
              status: "DELIVERED",
            },
          });
          return;
        } else {
          // Timeout reached, restore AI control
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { isHumanControl: false, humanTakeoverAt: null },
          });
        }
      }

      // 6. Save Customer Message in DB
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          mid,
          sender: "CUSTOMER",
          senderId: senderPsid,
          content: text,
          mediaType,
          mediaUrl,
          status: "DELIVERED",
        },
      });

      // Update Conversation Timestamp & Unread
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastCustomerMessageAt: new Date(timestamp),
          unreadCount: { increment: 1 },
        },
      });

      // 7. Send "typing_on" to Messenger for natural feel
      await facebookApi.sendTypingIndicator(pageAccessToken, senderPsid, "typing_on");

      // 8. Fetch Context: Chat History & Knowledge Base
      const recentMessages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      });

      const history = recentMessages
        .reverse()
        .filter((m) => m.mid !== mid) // Exclude the current message
        .map((m) => ({
          role: (m.sender === "CUSTOMER" ? "user" : "model") as "user" | "model",
          content: m.content || "",
          mediaUrl: m.mediaUrl || undefined,
          mediaType: (m.mediaType?.toLowerCase() as any) || undefined,
        }));

      // Fetch Knowledge Base
      const knowledgeItems = await prisma.knowledgeBase.findMany({
        where: {
          workspaceId: page.workspaceId,
          isActive: true,
          OR: [{ facebookPageId: page.id }, { facebookPageId: null }],
        },
        orderBy: { priority: "desc" },
        take: 15,
      });

      const knowledgeContext = knowledgeItems.map(
        (k) => `[${k.type} - ${k.title}]: ${k.content}`
      );

      // Default system prompt
      const systemPrompt =
        page.systemPrompt ||
        `You are a polite, helpful AI sales & customer support executive for "${
          page.businessName || page.name
        }".
Respond accurately based on the business knowledge base in a natural, polite tone.
If information is not found in knowledge base, kindly inform the user or suggest connecting with a manager.`;

      // 9. Call Dedicated AI Proxy Gateway (with shohag Master Key)
      try {
        const aiResponse = await aiClient.generateReply({
          systemPrompt,
          knowledgeBaseContext: knowledgeContext,
          history,
          latestMessage: {
            text,
            mediaUrl,
            mediaType: mediaType === "IMAGE" ? "image" : undefined,
          },
          temperature: page.aiTemperature,
          model: config.aiProxy.defaultModel,
        });

        const { thinking, replyText, sentimentScore, shouldEscalate, escalationReason, extractedLeadInfo } =
          aiResponse.data;

        // 10. Send Reply to Customer via Facebook Messenger Send API
        if (replyText && page.aiMode !== "MANUAL") {
          await facebookApi.sendTextMessage(pageAccessToken, senderPsid, replyText);

          // Save AI Message to DB
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              sender: "AI",
              content: replyText,
              mediaType: "TEXT",
              thinkingProcess: thinking,
              modelUsed: config.aiProxy.defaultModel,
              status: "SENT",
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastAiMessageAt: new Date() },
          });
        }

        // 11. Handle Sentiment & CRM Lead Enrichment
        if (extractedLeadInfo || sentimentScore !== undefined) {
          const updateData: any = {};
          if (extractedLeadInfo?.phone) updateData.phoneNumber = extractedLeadInfo.phone;
          if (extractedLeadInfo?.deliveryAddress) updateData.deliveryAddress = extractedLeadInfo.deliveryAddress;
          if (sentimentScore !== undefined) updateData.sentimentScore = sentimentScore;

          if (Object.keys(updateData).length > 0) {
            await prisma.customer.update({
              where: { id: customer.id },
              data: updateData,
            });
          }
        }

        // 12. Handle Escalation & Telegram Instant Alert
        if (shouldEscalate || (sentimentScore !== undefined && sentimentScore <= -0.6)) {
          console.warn(`🚨 Escalation Triggered for Customer [${senderPsid}]: ${escalationReason}`);

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: "HANDOFF_REQUIRED",
              isHumanControl: true,
              humanTakeoverAt: new Date(),
            },
          });

          const escalation = await prisma.escalationEvent.create({
            data: {
              conversationId: conversation.id,
              reason: "NEGATIVE_SENTIMENT",
              triggerMessage: text,
              summary: escalationReason || "Negative sentiment or human requested",
              status: "PENDING",
            },
          });

          // Enqueue Telegram Alert
          const telegramPayload: SendTelegramAlertPayload = {
            workspaceId: page.workspaceId,
            pageId: page.pageId,
            conversationId: conversation.id,
            customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || undefined,
            customerPsid: senderPsid,
            reason: escalationReason || "Negative Customer Sentiment / Manager Needed",
            messageSnippet: text || "[Media Attachment]",
            urgency: sentimentScore <= -0.8 ? "CRITICAL" : "HIGH",
          };

          await telegramAlertsQueue.add("send-escalation-alert", telegramPayload);
        }
      } catch (aiErr: any) {
        console.error("AI Generation / Processing failed in worker:", aiErr);
      } finally {
        await facebookApi.sendTypingIndicator(pageAccessToken, senderPsid, "typing_off");
      }
    },
    {
      connection: redisConnection,
      concurrency: 10, // Process 10 messages concurrently per worker instance
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Message Job [${job.id}] processed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Message Job [${job?.id}] failed:`, err.message);
  });

  return worker;
}
