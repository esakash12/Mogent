import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import { config } from "../config";
import { prisma, EscalationReason, MessageSender } from "@mogent/database";
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
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
            profilePic: profile?.profile_pic || null,
            locale: profile?.locale || null,
            timezone: profile?.timezone || null,
            gender: profile?.gender || null,
          },
        });
      } else if (!customer.firstName || customer.firstName === "Customer" || customer.firstName.startsWith("Customer #") || !customer.profilePic) {
        // Re-fetch profile if name was previously missing or defaulted to placeholder
        const profile = await facebookApi.fetchCustomerProfile(pageAccessToken, senderPsid);
        if (profile?.first_name || profile?.profile_pic) {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
              firstName: profile?.first_name || customer.firstName,
              lastName: profile?.last_name || customer.lastName,
              profilePic: profile?.profile_pic || customer.profilePic,
            },
          });
        }
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

      // 7. Send "mark_seen" and "typing_on" to Messenger for instant read receipt and typing bubbles
      await facebookApi.sendTypingIndicator(pageAccessToken, senderPsid, "mark_seen");
      await facebookApi.sendTypingIndicator(pageAccessToken, senderPsid, "typing_on");

      // 8. Fetch Context: Chat History & Knowledge Base
      const recentMessages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 15,
      });

      const history = recentMessages
        .reverse()
        .filter((m) => m.mid !== mid) // Exclude the current message
        .map((m) => {
          let content = m.content || "";
          if (m.sender === MessageSender.HUMAN_AGENT || (m.sender as any) === "HUMAN") {
            content = `[মানব প্রতিনিধি/মালিক]: ${content}`;
          }
          return {
            role: (m.sender === MessageSender.CUSTOMER ? "user" : "model") as "user" | "model",
            content,
            mediaUrl: m.mediaUrl || undefined,
            mediaType: (m.mediaType?.toLowerCase() as any) || undefined,
          };
        });

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

      // Inject WhatsApp & Business Contacts into Knowledge Context
      if (page.workspace?.whatsAppNumber) {
        const cleanDigits = page.workspace.whatsAppNumber.replace(/[^\d]/g, "");
        const waLink = `https://wa.me/${cleanDigits}${
          page.workspace.whatsAppPrefillText
            ? `?text=${encodeURIComponent(page.workspace.whatsAppPrefillText)}`
            : ""
        }`;
        knowledgeContext.push(
          `[অফিসিয়াল যোগাযোগ ও হোয়াটসঅ্যাপ]: আমাদের অফিসিয়াল WhatsApp নাম্বার: ${page.workspace.whatsAppNumber} (সরাসরি চ্যাট লিংক: ${waLink}), হটলাইন: ${
            page.workspace.hotlineNumber || page.workspace.whatsAppNumber
          }, অফিস/শপ ঠিকানা: ${page.workspace.officeAddress || "ঢাকা, বাংলাদেশ"}`
        );
      }

      // Default system prompt (Real Human Bangladeshi Sales Moderator)
      const systemPrompt =
        page.systemPrompt ||
        `আপনি "${page.businessName || page.name}" ফেসবুক পেজের একজন প্রফেশনাল, অত্যন্ত আন্তরিক ও চটপটে বিক্রয় প্রতিনিধি (Human Sales Moderator)।
কখনোই নিজেকে রোবট বা AI বলবেন না। সবসময় সুন্দর ও মিষ্টি বাংলায় বাস্তব মানুষের মতো ছোট, আকর্ষণীয় এবং হেল্পফুল উত্তর দেবেন।
কাস্টমার প্রোডাক্ট পছন্দ করলে বা জানতে চাইলে সংক্ষেপে সঠিক তথ্য দিয়ে অর্ডার কনফার্ম করার জন্য নাম, মোবাইল নাম্বার ও ডেলিভারি ঠিকানা চেয়ে নিন।`;

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

        let finalReplyText = replyText;
        if (typeof finalReplyText === "string" && finalReplyText.trim().startsWith("{")) {
          try {
            const parsedJson = JSON.parse(finalReplyText);
            if (parsedJson.replyText) {
              finalReplyText = parsedJson.replyText;
            }
          } catch {}
        }

        // Check if WhatsApp interactive button should be attached
        let waButtonUrl: string | null = null;

        if (page.workspace?.whatsAppNumber && finalReplyText) {
          const rawNumber = page.workspace.whatsAppNumber.trim();
          let cleanDigits = rawNumber.replace(/[^\d]/g, "");
          if (cleanDigits.startsWith("01") && cleanDigits.length === 11) {
            cleanDigits = `88${cleanDigits}`;
          }
          const textParam = page.workspace.whatsAppPrefillText
            ? `?text=${encodeURIComponent(page.workspace.whatsAppPrefillText)}`
            : "";
          const generatedWaUrl = `https://wa.me/${cleanDigits}${textParam}`;

          if (page.workspace.whatsAppMode === "ALWAYS") {
            waButtonUrl = generatedWaUrl;
          } else if (
            page.workspace.whatsAppMode === "ON_DEMAND" &&
            (finalReplyText.includes(rawNumber) ||
              finalReplyText.toLowerCase().includes("whatsapp") ||
              (text && text.toLowerCase().includes("whatsapp")) ||
              (text && text.includes("নাম্বার")) ||
              (text && text.includes("কন্টাক্ট")))
          ) {
            waButtonUrl = generatedWaUrl;
          }
        }

        // 10. Send Reply to Customer via Facebook Messenger Send API
        if (finalReplyText && page.aiMode !== "MANUAL") {
          if (waButtonUrl) {
            await facebookApi.sendButtonMessage(pageAccessToken, senderPsid, finalReplyText, [
              {
                type: "web_url",
                url: waButtonUrl,
                title: "WhatsApp এ চ্যাট",
              },
            ]);
          } else {
            await facebookApi.sendTextMessage(pageAccessToken, senderPsid, finalReplyText);
          }

          // Save AI Message to DB
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              sender: "AI",
              content: finalReplyText,
              mediaType: "TEXT",
              thinkingProcess: thinking,
              modelUsed: "Mogent AI Engine",
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

        // Helper: Check if customer repeated message 3 times consecutively (Stuck in Loop)
        const previousCustomerMessages = await prisma.message.findMany({
          where: {
            conversationId: conversation.id,
            sender: "CUSTOMER",
            mid: { not: mid },
          },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { content: true },
        });

        const normalizeText = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").trim();
        const currentNorm = normalizeText(text || "");
        let isStuckInLoop = false;

        if (currentNorm && currentNorm.length >= 2) {
          let consecutiveMatches = 1;
          for (const prev of previousCustomerMessages) {
            const prevNorm = normalizeText(prev.content || "");
            if (!prevNorm) continue;
            if (
              prevNorm === currentNorm ||
              (prevNorm.length >= 4 && (prevNorm.includes(currentNorm) || currentNorm.includes(prevNorm)))
            ) {
              consecutiveMatches++;
              if (consecutiveMatches >= 3) {
                isStuckInLoop = true;
                break;
              }
            } else {
              break;
            }
          }
        }

        // Helper: Check Human Takeover Keywords (Bangla & English)
        const humanKeywords = [
          "মানুষ", "হিউম্যান", "এজেন্ট", "মডারেটর", "মালিক", "অ্যাডমিন", "এডমিন",
          "কথা বলতে চাই", "কল দেন", "ফোন দেন", "ফোন নাম্বার", "হটলাইন", "কল দিন", "কথা বলব", "যোগাযোগ করব", "সাপোর্ট",
          "agent", "human", "representative", "operator", "talk to human", "real person", "call me", "phone number", "manager", "support person"
        ];
        const hasHumanKeyword = text ? humanKeywords.some((kw) => text.toLowerCase().includes(kw)) : false;

        // 12. Handle Escalation & Telegram Instant Alert (Triggers on: AI flag, 3x repetition, keywords, low sentiment)
        const mustEscalate =
          shouldEscalate ||
          isStuckInLoop ||
          hasHumanKeyword ||
          (sentimentScore !== undefined && sentimentScore <= -0.6);

        let finalEscalationReason = escalationReason;
        if (isStuckInLoop) {
          finalEscalationReason = "Customer repeated the same query 3 times (Stuck in Loop / Escalation Triggered)";
        } else if (hasHumanKeyword && !finalEscalationReason) {
          finalEscalationReason = "Customer explicitly requested human agent / live representative";
        } else if (!finalEscalationReason && sentimentScore !== undefined && sentimentScore <= -0.6) {
          finalEscalationReason = "Negative Customer Sentiment / Frustration Detected";
        }

        if (mustEscalate) {
          console.warn(`🚨 Escalation Triggered for Customer [${senderPsid}]: ${finalEscalationReason}`);

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: "HANDOFF_REQUIRED",
              isHumanControl: true,
              humanTakeoverAt: new Date(),
            },
          });

          await prisma.escalationEvent.create({
            data: {
              conversationId: conversation.id,
              reason: isStuckInLoop ? EscalationReason.UNSUPPORTED_QUERY : hasHumanKeyword ? EscalationReason.HUMAN_REQUESTED : EscalationReason.NEGATIVE_SENTIMENT,
              triggerMessage: text,
              summary: finalEscalationReason || "Human Takeover Triggered",
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
            reason: finalEscalationReason || "Human Takeover Triggered",
            messageSnippet: text || "[Media Attachment]",
            urgency: isStuckInLoop || (sentimentScore !== undefined && sentimentScore <= -0.8) ? "CRITICAL" : "HIGH",
          };

          await telegramAlertsQueue.add("send-escalation-alert", telegramPayload);
        }
      } catch (aiErr: any) {
        console.error("❌ AI Generation / Processing failed in worker:", aiErr);
        
        // Notify the customer that the bot is down
        const fallbackText = "I'm currently experiencing technical difficulties. A human agent will assist you shortly.";
        try {
          if (page.aiMode !== "MANUAL") {
            await facebookApi.sendTextMessage(pageAccessToken, senderPsid, fallbackText);
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                sender: "AI",
                content: fallbackText,
                mediaType: "TEXT",
                status: "SENT",
              },
            });
          }
        } catch (e) {
          console.error("Failed to send fallback message:", e);
        }

        // Flag for human handover
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: "HANDOFF_REQUIRED",
            isHumanControl: true,
            humanTakeoverAt: new Date(),
          },
        });

        // Enqueue Telegram Alert on AI Failure
        try {
          await telegramAlertsQueue.add("send-escalation-alert", {
            workspaceId: page.workspaceId,
            pageId: page.pageId,
            conversationId: conversation.id,
            customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || undefined,
            customerPsid: senderPsid,
            reason: `AI Technical Fallback: ${aiErr.message || "Unknown error"}`,
            messageSnippet: text || "[Media Attachment]",
            urgency: "CRITICAL",
          });
        } catch (queueErr) {
          console.error("Failed to enqueue fallback Telegram alert:", queueErr);
        }
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
