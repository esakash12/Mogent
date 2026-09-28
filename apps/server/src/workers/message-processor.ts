import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import { config } from "../config";
import { prisma, EscalationReason, MessageSender } from "@mogent/database";
import { decryptToken, ProcessMessageJobPayload, SendTelegramAlertPayload } from "@mogent/shared";
import { facebookApi } from "../services/facebook-api";
import { AiProxyClient } from "../ai-client";
import { telegramAlertsQueue } from "../queue/message-queue";
import { createOrder } from "../services/order-service";

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

export function startMessageWorker() {
  const worker = new Worker<ProcessMessageJobPayload>(
    "incoming-messages",
    async (job: Job<ProcessMessageJobPayload>) => {
      const { pageId, senderPsid, mid, text, mediaType, mediaUrl, fileName, timestamp } = job.data;

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

      // 1.1 Subscription & Quota Enforcement (Current Month Cycle)
      if (page.workspace) {
        const plan = (page.workspace.plan || "FREE").toUpperCase();
        const limitMap: Record<string, number> = {
          FREE: 100,
          STARTER: 5000,
          PRO: 25000,
          ENTERPRISE: 100000,
        };
        const maxAllowed = limitMap[plan] || 100;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const currentMonthUsage = await prisma.message.count({
          where: {
            conversation: { facebookPage: { workspaceId: page.workspaceId } },
            sender: MessageSender.AI,
            createdAt: { gte: startOfMonth },
          },
        });

        if (currentMonthUsage >= maxAllowed) {
          console.warn(`🛑 Monthly AI message limit reached for Workspace [${page.workspace.name}] (${currentMonthUsage}/${maxAllowed}). Skipping AI generation.`);
          return;
        }
      }

      // 2. Decrypt Facebook Page Access Token (if not pure WhatsApp)
      let pageAccessToken = "";
      const isWhatsAppRecipient = senderPsid?.startsWith("wa_");
      if (!isWhatsAppRecipient) {
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
            workspaceId: page.workspaceId,
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
      } else if (!customer.firstName || customer.firstName === "Customer" || customer.firstName.startsWith("Customer #") || !customer.profilePic || !customer.workspaceId) {
        // Re-fetch profile if name was previously missing or defaulted to placeholder
        const profile = await facebookApi.fetchCustomerProfile(pageAccessToken, senderPsid);
        const updateData: any = {};
        if (profile?.first_name) updateData.firstName = profile.first_name;
        if (profile?.last_name) updateData.lastName = profile.last_name;
        if (profile?.profile_pic) updateData.profilePic = profile.profile_pic;
        if (!customer.workspaceId) updateData.workspaceId = page.workspaceId;

        if (Object.keys(updateData).length > 0) {
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: updateData,
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
            workspaceId: page.workspaceId,
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
          // Save customer message only if not already persisted by webhook
          const existing = mid ? await prisma.message.findUnique({ where: { mid } }) : null;
          if (!existing) {
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                mid,
                sender: "CUSTOMER",
                senderId: senderPsid,
                content: text,
                mediaType,
                mediaUrl,
                fileName: fileName || undefined,
                status: "DELIVERED",
              },
            });
          }
          return;
        } else {
          // Timeout reached, restore AI control
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { isHumanControl: false, humanTakeoverAt: null },
          });
        }
      }

      // 6. Save Customer Message in DB (skip if already saved by webhook)
      const existingMessage = mid ? await prisma.message.findFirst({
        where: { conversationId: conversation.id, mid },
      }) : null;

      if (!existingMessage) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            mid,
            sender: "CUSTOMER",
            senderId: senderPsid,
            content: text,
            mediaType,
            mediaUrl,
            fileName: fileName || undefined,
            status: "DELIVERED",
          },
        });
      }

      // Update Conversation Timestamp & Unread
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastCustomerMessageAt: new Date(timestamp),
          unreadCount: { increment: 1 },
        },
      });

      // 7. Send "mark_seen" and "typing_on" to Messenger for instant read receipt and typing bubbles
      if (!isWhatsAppRecipient) {
        await facebookApi.sendTypingIndicator(pageAccessToken, senderPsid, "mark_seen");
        await facebookApi.sendTypingIndicator(pageAccessToken, senderPsid, "typing_on");
      }

      // 8. Fetch Context: Chat History & Knowledge Base
      const recentMessages = await prisma.message.findMany({
        where: {
          conversationId: conversation.id,
          mid: { not: mid },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const history = recentMessages
        .reverse()
        .filter((m) => m.mid !== mid) // Exclude current message
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

      // Fetch Live Context: Living Store Brain Note, Dynamic Business Memories & Product Catalog
      const [brainNote, dynamicMemories, storeProducts] = await Promise.all([
        prisma.storeBrainNote.findFirst({
          where: {
            workspaceId: page.workspaceId,
            OR: [{ pageId: page.id }, { pageId: null }],
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.businessMemory.findMany({
          where: {
            workspaceId: page.workspaceId,
            isActive: true,
            OR: [{ pageId: page.id }, { pageId: null }],
            NOT: [
              { instruction: { contains: "১০০" } },
              { instruction: { contains: "100" } },
              { condition: "quantity >= 4" },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        prisma.product.findMany({
          where: {
            workspaceId: page.workspaceId,
            inStock: true,
          },
          take: 30,
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const knowledgeContext: string[] = [];

      // 0. Inject Living Store Brain Note (Supreme Authority)
      if (brainNote?.content) {
        knowledgeContext.push(
          `[👑 মার্চেন্ট ও স্টোরের মূল ব্রেন ও সেলস নোটবুক (LIVING STORE BRAIN NOTE - পরম সত্য ও প্রধান উৎস)]:\n${brainNote.content}`
        );
      }

      // 1. Inject Live Product Catalog & Inventory
      if (storeProducts.length > 0) {
        knowledgeContext.push(
          `[স্টোরের লাইভ প্রডাক্ট ক্যাটালগ ও বর্তমান বিক্রয় মূল্য তালিকা]:\n` +
            storeProducts
              .map(
                (p) =>
                  `• ${p.name}: বর্তমান বিক্রয় মূল্য ৳${p.price}${
                    p.regularPrice ? ` (আসল মূল্য ৳${p.regularPrice})` : ""
                  }, স্টক: ${p.stockCount ?? 100}টি, ক্যাটাগরি: ${
                    p.category || "General"
                  }${p.description ? `, বিবরণ: ${p.description}` : ""}${
                    p.visualDescription ? `, দেখতে: ${p.visualDescription}` : ""
                  }`
              )
              .join("\n")
        );
      }

      // 2. Inject Dynamic Business Rules taught via Co-Pilot
      if (dynamicMemories.length > 0) {
        knowledgeContext.push(
          `[দোকানের মালিকের বিশেষ নিয়ম ও অফারসমূহ]:\n` +
            dynamicMemories
              .map(
                (m) =>
                  `• [${m.category}] ${m.title}: ${m.instruction} ${
                    m.condition ? `(শর্ত: ${m.condition})` : ""
                  }`
              )
              .join("\n")
        );
      }

      // 3. Inject Absolute Pricing & Calculation Authority Rules
      knowledgeContext.push(
        `[হিসাব ও প্রাইসিং পরম নীতি (STRICT PRICING RULES)]:
• ১টি কার্ডের বিক্রয় মূল্য ও ডেলিভারি চার্জ:
  - ১টি কার্ডের একক বিক্রয় মূল্য ১৫০ টাকা এবং ডেলিভারি চার্জ ৫০ টাকা (মোট ২০০ টাকা)।
  - কোনো অবস্থাতেই ১টি কার্ডের দাম ১০০ টাকা বলা যাবে না! পরম সত্য দাম ১৫০ টাকা।
• ফ্রি ডেলিভারি অফার ও একাধিক কার্ডের হিসাব:
  - কাস্টমার ২ বা তার বেশি (২+) কার্ড অর্ডার করলে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!
  - ২টি কার্ডের মোট দাম = ২ × ১৫০ = ৩০০ টাকা (ডেলিভারি চার্জ সম্পূর্ণ ফ্রি)।
  - ৩টি কার্ডের মোট দাম = ৩ × ১৫০ = ৪৫০ টাকা (ডেলিভারি চার্জ সম্পূর্ণ ফ্রি)।
  - ৪টি বা ৫টি কার্ডের ক্ষেত্রেও প্রতি কার্ড ১৫০ টাকা হারে হিসাব হবে (ফ্রি ডেলিভারি)।
• কাস্টমার সাপোর্ট ও যোগাযোগের নিয়ম:
  - ১ থেকে ৫টি কার্ডের জন্য কখনোই বিশেষ অফারের কথা বলে হোয়াটসঅ্যাপে যেতে বলবেন না! সরাসরি মোট মূল্য বলে চ্যাটেই ছবি/ফাইল ও নাম-ঠিকানা চেয়ে অর্ডার কনফার্ম করবেন।
  - শুধুমাত্র ৫টির অধিক (৬ বা ততোধিক কার্ড) হলে বিশেষ বাল্ক রেটের জন্য হোয়াটসঅ্যাপ দিতে পারেন।`
      );

      // Visual recognition instructions if customer attached an image
      if (mediaType === "IMAGE") {
        knowledgeContext.push(
          `[ছবি শনাক্তকরণ নির্দেশ]: কাস্টমার একটি ছবি বা স্ক্রিনশট পাঠিয়েছেন। উপরে দেওয়া প্রডাক্ট ক্যাটালগের সাথে মিলিয়ে দেখুন এটি কোন প্রডাক্ট। প্রডাক্টটি শনাক্ত করে সরাসরি বলুন "জী ভাইয়া, এটা আমাদের [প্রোডাক্টের নাম]" এবং এর দাম ও অফার জানিয়ে সাইজ ও ডেলিভারি ঠিকানা চান।`
        );
      }

      // Inject WhatsApp & Business Contacts into Knowledge Context ONLY if not on WhatsApp
      if (!isWhatsAppRecipient && page.workspace?.whatsAppNumber) {
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

      const isWhatsApp = Boolean(
        isWhatsAppRecipient ||
        (conversation as any).channel === "WHATSAPP" ||
        (customer as any)?.channel === "WHATSAPP"
      );

      // Context-aware system prompt & Channel Separation
      let systemPrompt = "";
      if (isWhatsApp) {
        const wpCustomPrompt = page.workspace?.whatsAppSystemPrompt;
        if (wpCustomPrompt && wpCustomPrompt.trim()) {
          systemPrompt = wpCustomPrompt.trim();
        } else {
          // Elite human sales closer default prompt for WhatsApp
          systemPrompt = `আপনি "${page.businessName || page.name}" এর একজন অত্যন্ত দক্ষ, বাস্তব সেলস এক্সপার্ট ও শপ ওনার।
কাস্টমার মাত্রই WhatsApp-এ যোগাযোগ করেছেন। আপনার লক্ষ্য কাস্টমারের কথার অত্যন্ত সংক্ষিপ্ত ও সঠিক উত্তর দিয়ে দ্রুত সেলস ক্লোজ করা।
কখনোই রোবট বা AI এর মতো লম্বা প্যারাগ্রাফ লিখবেন না। ১-২ টি ছোট বাক্যে মানুষের মতো প্রাকৃতিক ও আন্তরিক উত্তর দিন।`;
        }
      } else {
        const channelHeader = `[প্ল্যাটফর্ম: ফেসবুক মেসেঞ্জার চ্যাট]`;
        const basePagePrompt = page.systemPrompt || `আপনি "${page.businessName || page.name}" এর একজন প্রফেশনাল, অত্যন্ত আন্তরিক ও চটপটে বিক্রয় প্রতিনিধি (Human Sales Moderator)।
কখনোই নিজেকে রোবট বা AI বলবেন না। সবসময় সুন্দর ও মিষ্টি বাংলায় বাস্তব মানুষের মতো ছোট, আকর্ষণীয় এবং হেল্পফুল উত্তর দেবেন।
কাস্টমার প্রোডাক্ট পছন্দ করলে বা জানতে চাইলে সংক্ষেপে সঠিক তথ্য দিয়ে অর্ডার কনফার্ম করার জন্য নাম, মোবাইল নাম্বার ও ডেলিভারি ঠিকানা চেয়ে নিন।`;

        systemPrompt = `
${channelHeader}

${basePagePrompt}
`.trim();
      }

      // Sanitize any stale hardcoded prices from manual prompts
      systemPrompt = systemPrompt
        .replace(/১০০\s*টাকা/g, "১৫০ টাকা")
        .replace(/100\s*টাকা/g, "১৫০ টাকা")
        .replace(/১০০\s*tk/gi, "১৫০ টাকা")
        .replace(/100\s*tk/gi, "১৫০ টাকা");

      systemPrompt += `\n[জরুরি নির্দেশনা]: পণ্যের বর্তমান সঠিক মূল্য ১৫০ টাকা। ডেলিভারি চার্জ ৫০ টাকা (২টি বা ততোধিক নিলে ফ্রি ডেলিভারি)। কখনোই কোনো পুরনো দাম (যেমন ১০০ টাকা) উল্লেখ করবেন না।`;

      // 9. Call Dedicated AI Proxy Gateway (with shohag Master Key)
      try {
        const aiResponse = await aiClient.generateReply({
          systemPrompt,
          knowledgeBaseContext: knowledgeContext,
          history,
          latestMessage: {
            text: text || (mediaType === "IMAGE" ? "[কাস্টমার একটি ছবি পাঠিয়েছেন]" : "👍"),
            mediaUrl: mediaType === "IMAGE" ? mediaUrl : undefined,
            mediaType: mediaType === "IMAGE" ? "image" : undefined,
          },
          temperature: page.aiTemperature,
          model: config.aiProxy.defaultModel,
          channel: isWhatsApp ? "WHATSAPP" : "MESSENGER",
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

        // 10. Send Reply to Customer via Facebook Messenger or WhatsApp Cloud API
        if (finalReplyText && page.aiMode !== "MANUAL") {
          if (isWhatsApp) {
            try {
              const wsId = page.workspaceId;
              if (!wsId) {
                console.warn(`⚠️ Cannot dispatch WhatsApp reply: Page [${page.id}] has no workspaceId`);
                return;
              }

              // Query PostgreSQL workspace record directly
              let wsRecord = await prisma.workspace.findUnique({
                where: { id: wsId },
                select: { whatsAppPhoneNumberId: true, whatsAppAccessToken: true },
              });
              if (!wsRecord?.whatsAppPhoneNumberId || !wsRecord?.whatsAppAccessToken) {
                wsRecord = await prisma.workspace.findFirst({
                  where: { whatsAppPhoneNumberId: { not: null }, whatsAppAccessToken: { not: null } },
                  select: { whatsAppPhoneNumberId: true, whatsAppAccessToken: true },
                });
              }

              const phoneNumberId = wsRecord?.whatsAppPhoneNumberId;
              const accessToken = wsRecord?.whatsAppAccessToken;

              if (phoneNumberId && accessToken) {
                const cleanPhone = senderPsid.replace("wa_", "").replace(/\D/g, "");
                await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: cleanPhone,
                    type: "text",
                    text: { body: finalReplyText },
                  }),
                });
                console.log(`✅ [WhatsApp AI Reply Dispatched] to: ${cleanPhone} for Workspace [${wsId}]`);
              } else {
                console.warn(`⚠️ [WhatsApp AI Reply Skipped] No WhatsApp credentials configured for Workspace [${wsId}]`);
              }
            } catch (waErr: any) {
              console.warn("AI WhatsApp dispatch error:", waErr.message);
            }
          } else {
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

          // Dual Order Creation: If AI confirms customer order intent with phone or address
          if (extractedLeadInfo?.orderIntent && (extractedLeadInfo.phone || customer.phoneNumber)) {
            try {
              const recentOrder = await prisma.order.findFirst({
                where: {
                  customerId: customer.id,
                  createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
                },
              });

              if (!recentOrder) {
                // Resolve product and amount intelligently from catalog or chat text
                let orderAmount = 0;
                let orderedProductName = "Order via AI Chat";

                if (page.workspaceId) {
                  const wsProducts = await prisma.product.findMany({
                    where: { workspaceId: page.workspaceId, inStock: true },
                    take: 10,
                  });

                  if (wsProducts.length > 0) {
                    const matchedProd = wsProducts.find((p) =>
                      text && text.toLowerCase().includes(p.name.toLowerCase())
                    ) || wsProducts[0];

                    orderAmount = matchedProd.price;
                    orderedProductName = matchedProd.name;
                  }
                }

                // Try extracting price mentioned in text (e.g. "১২০০ টাকা" or "1200 tk")
                const priceMatch = (text || "").match(/(?:৳|BDT|Tk|টাকা:?\s*|৳\s*)(\d{2,6})/i) ||
                  (text || "").match(/(\d{2,6})\s*(?:টাকা|tk|bdt|\/-)/i);
                if (priceMatch && Number(priceMatch[1]) > 0) {
                  orderAmount = Number(priceMatch[1]);
                }

                if (!orderAmount || orderAmount <= 0) {
                  orderAmount = 500; // sensible default
                }

                await createOrder({
                  workspaceId: page.workspaceId,
                  customerId: customer.id,
                  conversationId: conversation.id,
                  customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || undefined,
                  customerPhone: extractedLeadInfo.phone || customer.phoneNumber || undefined,
                  deliveryAddress: extractedLeadInfo.deliveryAddress || customer.deliveryAddress || undefined,
                  productName: orderedProductName,
                  totalAmount: orderAmount,
                  paymentMethod: "COD",
                  status: "CONFIRMED",
                  pageId: page.id,
                  isAiGenerated: true,
                });
                console.log(`🛍️ AI Agent created order [${orderedProductName} - ${orderAmount} BDT] for customer [${customer.id}]`);
              }
            } catch (aiOrderErr: any) {
              console.warn("AI order capture notice:", aiOrderErr.message);
            }
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

        // Custom Automation / Escalation Rules from Workspace
        let matchedCustomRule: any = null;
        try {
          if (page.workspaceId) {
            const customRules = await prisma.escalationRule.findMany({
              where: {
                workspaceId: page.workspaceId,
                isActive: true,
              },
            });

            if (text && customRules.length > 0) {
              const lowerText = text.toLowerCase();
              for (const rule of customRules) {
                if (
                  Array.isArray(rule.keywords) &&
                  rule.keywords.some((kw: string) => kw && lowerText.includes(kw.trim().toLowerCase()))
                ) {
                  matchedCustomRule = rule;
                  break;
                }
              }
            }
          }
        } catch (ruleErr) {
          console.error("Failed to check workspace escalation rules:", ruleErr);
        }

        if (matchedCustomRule) {
          try {
            await prisma.escalationRule.update({
              where: { id: matchedCustomRule.id },
              data: { hitsCount: { increment: 1 } },
            });
          } catch (incErr) {
            console.error("Failed to increment escalation rule hitsCount:", incErr);
          }
        }

        // 12. Handle Escalation & Telegram Instant Alert (Triggers on: Custom rule, AI flag, 3x repetition, keywords, low sentiment)
        const mustEscalate =
          Boolean(matchedCustomRule) ||
          shouldEscalate ||
          isStuckInLoop ||
          hasHumanKeyword ||
          (sentimentScore !== undefined && sentimentScore <= -0.6);

        let finalEscalationReason = escalationReason;
        let eventReason: EscalationReason = EscalationReason.NEGATIVE_SENTIMENT;

        if (matchedCustomRule) {
          finalEscalationReason = `Custom Automation Rule Triggered: "${matchedCustomRule.name}"`;
          eventReason = matchedCustomRule.reason || EscalationReason.CUSTOM_KEYWORD;
        } else if (isStuckInLoop) {
          finalEscalationReason = "Customer repeated the same query 3 times (Stuck in Loop / Escalation Triggered)";
          eventReason = EscalationReason.UNSUPPORTED_QUERY;
        } else if (hasHumanKeyword && !finalEscalationReason) {
          finalEscalationReason = "Customer explicitly requested human agent / live representative";
          eventReason = EscalationReason.HUMAN_REQUESTED;
        } else if (!finalEscalationReason && sentimentScore !== undefined && sentimentScore <= -0.6) {
          finalEscalationReason = "Negative Customer Sentiment / Frustration Detected";
          eventReason = EscalationReason.NEGATIVE_SENTIMENT;
        } else if (shouldEscalate) {
          finalEscalationReason = escalationReason || "AI Triggered Escalation";
          eventReason = EscalationReason.HIGH_VALUE_LEAD;
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
              reason: eventReason,
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
        
        // Notify the customer with friendly Bangla message
        const fallbackText = "বর্তমানে কিছুটা প্রযুক্তিগত ত্রুটি দেখা দিয়েছে। আমাদের একজন প্রতিনিধি দ্রুত আপনার সাথে যোগাযোগ করবেন।";
        try {
          if (page.aiMode !== "MANUAL" && pageAccessToken) {
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
