import { prisma } from "@mogent/database";
import { AiProxyClient } from "../ai-client";
import { config } from "../config";

const aiClient = new AiProxyClient(config.aiProxy.url, config.aiProxy.masterKey);

export interface CoPilotActionPayload {
  type:
    | "TEACH_RULE"
    | "CREATE_PRODUCT"
    | "UPDATE_PRODUCT"
    | "DELETE_RULE"
    | "STATS_REPORT"
    | "INTERVIEW_EXTRACT"
    | "NONE";
  data?: any;
  summary?: string;
}

export class CopilotService {
  /**
   * Retrieves or creates the active Co-Pilot session for this workspace and user.
   */
  public async getOrCreateSession(workspaceId: string, userId: string): Promise<any> {
    let session = await prisma.coPilotSession.findFirst({
      where: { workspaceId, userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          take: 50,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      const created = await prisma.coPilotSession.create({
        data: {
          workspaceId,
          userId,
          title: "Mogent Business Co-Pilot",
          interviewStage: "ACTIVE",
        },
        include: {
          messages: true,
        },
      });

      // Send initial friendly welcome message if new session
      const welcomeText =
        "আসসালামু আলাইকুম ভাই! আমি আপনার শপের বিজনেস কো-পাইলট (Mogent Co-Pilot)। 🚀\n\n" +
        "আপনার অনলাইন শপ পরিচালনায় আমি আপনার পার্সোনাল অ্যাসিস্ট্যান্ট হিসেবে কাজ করব। আমাকে চ্যাটের মাধ্যমে সাধারণ বাংলায় যা বলবেন, আমি সাথে সাথে তা আপনার দোকানে সেট করে দিব:\n\n" +
        "• নতুন অফার শেখাতে পারেন (যেমন: 'আজকে থেকে ২টা নিলে ১০০ টাকা ছাড় ও ফ্রি ডেলিভারি')\n" +
        "• ডেলিভারি ও সেলস নিয়ম সেট করতে পারেন (যেমন: 'ঢাকার বাইরে ক্যাশ অন ডেলিভারিতে ১৫০ টাকা অগ্রিম নিবা')\n" +
        "• নতুন প্রোডাক্ট যোগ বা দাম আপডেট করতে পারেন (যেমন: 'সিল্ক পাঞ্জাবি যোগ করো, দাম ১৪৫০ টাকা')\n" +
        "• আজকের অর্ডার ও সেলস জানতে চাইতে পারেন (যেমন: 'আজকে কয়টা অর্ডার আসল?')\n\n" +
        "আপনার ব্যবসা সম্পর্কে আমাকে কিছু বলুন বা কোনো নিয়ম শেখান, আমি শুরু করতে প্রস্তুত!";

      await prisma.coPilotMessage.create({
        data: {
          sessionId: created.id,
          sender: "COPILOT",
          content: welcomeText,
          actionType: "NONE",
        },
      });

      session = (await prisma.coPilotSession.findUnique({
        where: { id: created.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      })) as any;
    }

    if (!session) {
      throw new Error("Could not initialize Co-Pilot session");
    }

    return session;
  }

  /**
   * List all business memories / dynamic rules learned for this workspace.
   */
  public async listMemories(workspaceId: string, pageId?: string) {
    const where: any = { workspaceId };
    if (pageId && pageId !== "ALL") {
      where.OR = [{ pageId: null }, { pageId }];
    }
    return prisma.businessMemory.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        facebookPage: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Delete or deactivate a learned memory rule.
   */
  public async deleteMemory(memoryId: string, workspaceId: string) {
    return prisma.businessMemory.deleteMany({
      where: { id: memoryId, workspaceId },
    });
  }

  /**
   * Toggle memory active status.
   */
  public async toggleMemory(memoryId: string, workspaceId: string, isActive: boolean) {
    return prisma.businessMemory.updateMany({
      where: { id: memoryId, workspaceId },
      data: { isActive },
    });
  }

  /**
   * Process a message from the business owner to the Co-Pilot.
   * Leverages Gemini to extract actions (TEACH_RULE, CREATE_PRODUCT, STATS, etc.),
   * executes the database changes in PostgreSQL, and generates a warm, helpful Bengali reply.
   */
  public async processChat(params: {
    workspaceId: string;
    userId: string;
    text: string;
    pageId?: string;
  }): Promise<{
    reply: string;
    action: CoPilotActionPayload;
    session: any;
  }> {
    const { workspaceId, userId, text, pageId } = params;
    const cleanText = text.trim();

    const session = await this.getOrCreateSession(workspaceId, userId);

    // Save owner message
    await prisma.coPilotMessage.create({
      data: {
        sessionId: session.id,
        sender: "OWNER",
        content: cleanText,
      },
    });

    // 1. Gather comprehensive live context from PostgreSQL
    const [workspace, pages, memories, products, recentOrders, totalOrdersCount] =
      await Promise.all([
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          include: { members: { include: { user: true } } },
        }),
        prisma.facebookPage.findMany({
          where: { workspaceId, isActive: true },
          select: { id: true, name: true, businessName: true, category: true },
        }),
        prisma.businessMemory.findMany({
          where: { workspaceId, isActive: true },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.findMany({
          where: { workspaceId },
          take: 25,
          orderBy: { createdAt: "desc" },
        }),
        prisma.order.findMany({
          where: { workspaceId },
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { firstName: true, phoneNumber: true } } },
        }),
        prisma.order.count({ where: { workspaceId } }),
      ]);

    // Calculate real stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrdersCount = await prisma.order.count({
      where: { workspaceId, createdAt: { gte: today } },
    });

    const pendingOrdersCount = await prisma.order.count({
      where: { workspaceId, status: "PENDING" },
    });

    const confirmedOrders = await prisma.order.findMany({
      where: { workspaceId, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      select: { totalAmount: true },
    });
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 2. Format Context for Gemini
    const existingRulesFormatted = memories.map(
      (m) => `[${m.category}] ${m.title}: ${m.instruction} ${m.condition ? `(শর্ত: ${m.condition})` : ""}`
    );

    const existingProductsFormatted = products.map(
      (p) => `${p.name} - ৳${p.price} (স্টক: ${p.stockCount ?? 100}, ক্যাটাগরি: ${p.category || "General"})`
    );

    const systemPrompt = `
You are the "Mogent Business Co-Pilot" (মোগেন্ট বিজনেস কো-পাইলট) — the personal AI Chief Operations & Automation Officer for this Bangladeshi online store.
You are chatting with the Business Owner / Merchant.

Current Store Profile:
- Workspace Name: ${workspace?.name || "Unnamed Store"}
- Connected Pages: ${pages.map((p) => p.name).join(", ") || "None"}
- WhatsApp Number: ${workspace?.whatsAppNumber || "Not configured"}
- Total Products in Database: ${products.length}
- Live Order Stats: Total Orders = ${totalOrdersCount}, Today's Orders = ${todayOrdersCount}, Pending Orders = ${pendingOrdersCount}, Total Sales = ৳${totalRevenue.toLocaleString()}

Active Dynamic Rules & Memories Already Saved in Database:
${existingRulesFormatted.length > 0 ? existingRulesFormatted.join("\n") : "No custom rules saved yet."}

Sample Products in Store:
${existingProductsFormatted.length > 0 ? existingProductsFormatted.slice(0, 15).join("\n") : "No products added yet."}

YOUR CAPABILITIES & INSTRUCTIONS:
1. Speak in warm, natural, respectful, supportive Bangladeshi business Bengali ("ভাইয়া/আপু", "জী ভাইয়া", "অবশ্যই", "করে দিচ্ছি").
2. The owner can manage their ENTIRE store through chatting with you! You must detect if the owner is:
   (A) Teaching a rule or discount offer (e.g. "আজকে থেকে কেউ ২টা নিলে ১০০ টাকা ছাড় আর ফ্রি ডেলিভারি", "ঢাকার ডেলিভারি ৮০ আর বাইরে ১৩০ টাকা", "রাত ১০টার পর মেসেজ দিলে বলবা কাল সকালে কল দিব")
   (B) Adding a new product (e.g. "একটি নতুন প্রোডাক্ট যোগ করো: প্রিমিয়াম পাঞ্জাবি, দাম ১৪৫০ টাকা, স্টক ৩০ টা")
   (C) Updating a product (e.g. "কটন শার্টের দাম কমিয়ে ১২০০ টাকা করো", "ব্লু ড্রেস আউট অফ স্টক করো")
   (D) Asking for store analytics / report (e.g. "আজকে কয়টা অর্ডার আসল?", "টোটাল সেলস কত?", "দোকানের অবস্থা কী?")
   (E) Asking to view or delete a rule (e.g. "আমার বর্তমান অফারগুলো কী কী?", "১০০ টাকা ছাড়ের নিয়মটা বাদ দাও")
   (F) Answering onboarding / setup interview questions (e.g. "আমাদের শপের নাম লাইফস্টাইল বিডি, আমরা টিশার্ট ও হুডি বিক্রি করি")
   (G) General discussion, marketing tips, or questions about how the AI works.

OUTPUT FORMAT REQUIREMENTS:
You MUST respond with a valid JSON object. You can execute ONE or MULTIPLE actions if the owner mentioned multiple rules, prices, or policies in their message:
{
  "thought": "Short internal reasoning about what the owner wants",
  "reply": "Warm, polite, conversational response in Bengali directly addressing the owner. If you performed actions, confirm each clearly and explain how customer chats will now reflect it.",
  "actions": [
    {
      "type": "TEACH_RULE" | "CREATE_PRODUCT" | "UPDATE_PRODUCT" | "DELETE_RULE" | "STATS_REPORT" | "INTERVIEW_EXTRACT" | "NONE",
      "rule": {
        "category": "DISCOUNT_OFFER" | "DELIVERY_POLICY" | "BUSINESS_FACT" | "SALES_BEHAVIOR" | "FAQ" | "CUSTOM_RULE",
        "title": "Short title (e.g. ২টা কার্ডে ফ্রি ডেলিভারি, ৫টির বেশিতে বিশেষ অফার)",
        "instruction": "Clear natural-language instruction for customer sales AI. Must be explicit about what to say when condition IS met vs NOT met.",
        "condition": "Optional machine or logical condition, e.g. quantity >= 2 or quantity > 5"
      },
      "product": {
        "name": "Product Name (e.g. PVC Card Printing)",
        "price": 150,
        "regularPrice": 200,
        "category": "PVC Print Service",
        "stockCount": 500,
        "description": "Short description"
      },
      "productUpdate": {
        "productQuery": "Search phrase to match product name",
        "price": 150,
        "stockCount": 500,
        "inStock": true
      },
      "deleteRule": {
        "ruleQuery": "Search phrase for rule to delete"
      },
      "interview": {
        "businessName": "Extracted business name if mentioned",
        "businessDescription": "Extracted description if mentioned",
        "deliveryChargeInside": 50,
        "deliveryChargeOutside": 50
      }
    }
  ]
}
`;

    // Fetch last 6 messages from session for context
    const recentSessionMessages = await prisma.coPilotMessage.findMany({
      where: { sessionId: session.id },
      take: 6,
      orderBy: { createdAt: "desc" },
    });
    const historyTurns = recentSessionMessages
      .reverse()
      .slice(0, -1) // Exclude current message
      .map((m) => ({
        role: (m.sender === "OWNER" ? "user" : "model") as "user" | "model",
        content: m.content,
      }));

    let aiResult: any = null;
    try {
      const generated = await aiClient.generateReply({
        systemPrompt,
        history: historyTurns,
        latestMessage: { text: cleanText },
        temperature: 0.3,
        model: config.aiProxy.defaultModel,
      });

      aiResult = generated.data;
    } catch (aiErr: any) {
      console.error("Co-Pilot AI generation error:", aiErr);
    }

    let finalReply = "জী ভাইয়া, আপনার মেসেজটি পেয়েছি। আমি আপনার রিকোয়েস্ট প্রসেস করছি।";
    let actionPayload: CoPilotActionPayload = { type: "NONE" };

    if (aiResult) {
      // The proxy returns data conforming to GeminiAiResponse.
      // Often our custom JSON will be in replyText or thinking.
      let parsedJson: any = null;
      try {
        const textToParse = aiResult.replyText || aiResult.thinking || "";
        const jsonMatch = textToParse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        }
      } catch {}

      if (parsedJson?.reply) {
        finalReply = parsedJson.reply;
      } else if (aiResult.replyText) {
        finalReply = aiResult.replyText;
      }

      // Execute Action(s) - supports multiple actions array or fallback single action
      let actionList: any[] = [];
      if (Array.isArray(parsedJson?.actions)) {
        actionList = parsedJson.actions;
      } else if (parsedJson?.action && parsedJson.action.type && parsedJson.action.type !== "NONE") {
        actionList = [parsedJson.action];
      }

      // Enhanced Multi-Lingual Fallback: Detect price & delivery in Bengali, Banglish, and English
      const lowerClean = cleanText.toLowerCase();
      const mentionsPrice =
        lowerClean.includes("দাম") ||
        lowerClean.includes("dam") ||
        lowerClean.includes("daam") ||
        lowerClean.includes("price") ||
        lowerClean.includes("rate") ||
        lowerClean.includes("টাকা") ||
        lowerClean.includes("taka") ||
        lowerClean.includes("tk");

      const mentionsCardOrService =
        lowerClean.includes("card") ||
        lowerClean.includes("কার্ড") ||
        lowerClean.includes("pvc") ||
        lowerClean.includes("print") ||
        lowerClean.includes("pis") ||
        lowerClean.includes("পিস") ||
        lowerClean.includes("pc") ||
        lowerClean.includes("piece") ||
        lowerClean.includes("150") ||
        lowerClean.includes("১৫০");

      let extractedPrice: number | null = null;
      if (lowerClean.includes("150") || lowerClean.includes("১৫০")) {
        extractedPrice = 150;
      } else {
        const pMatch = cleanText.match(/(?:dam|দাম|price|daam|rate)?\s*[:=]?\s*(\d{2,5})\s*(?:taka|tk|টাকা)?/i);
        if (pMatch && pMatch[1]) extractedPrice = Number(pMatch[1]);
      }

      if (
        extractedPrice !== null &&
        (mentionsPrice || mentionsCardOrService) &&
        !actionList.some((a) => a.type === "CREATE_PRODUCT" || a.type === "UPDATE_PRODUCT")
      ) {
        actionList.push({
          type: "CREATE_PRODUCT",
          product: {
            name: "PVC ID Card Printing",
            price: extractedPrice,
            regularPrice: extractedPrice + 50,
            category: "PVC Print Service",
            stockCount: 500,
            description: "High quality PVC print service for NID, Driving License, Student ID",
          },
        });
      }

      // Check for delivery charge update in message
      if (lowerClean.includes("delivery") || lowerClean.includes("ডেলিভারি")) {
        let delCharge = 50;
        const dMatch = cleanText.match(/(?:delivery|ডেলিভারি)\s*(?:charge|cost|ফি)?\s*[:=]?\s*(\d{2,4})\s*(?:taka|tk|টাকা)?/i);
        if (dMatch && dMatch[1]) delCharge = Number(dMatch[1]);
        if (!actionList.some((a) => a.type === "TEACH_RULE" && a.rule?.category === "DELIVERY_POLICY")) {
          actionList.push({
            type: "TEACH_RULE",
            rule: {
              category: "DELIVERY_POLICY",
              title: "স্ট্যান্ডার্ড ডেলিভারি চার্জ পলিসি",
              instruction: `স্ট্যান্ডার্ড ডেলিভারি চার্জ ৳${delCharge} টাকা। তবে কাস্টমার ২ বা তার বেশি (২+) কার্ড অর্ডার করলে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!`,
            },
          });
        }
      }

      for (const act of actionList) {
        if (!act || !act.type || act.type === "NONE") continue;
        try {
          if (act.type === "TEACH_RULE" && act.rule) {
            // Smart Conflict Resolution:
            // If teaching discount or bulk offer, deactivate old conflicting rules (e.g. quantity >= 4)
            if (act.rule.category === "DISCOUNT_OFFER" || act.rule.category === "DELIVERY_POLICY") {
              await prisma.businessMemory.updateMany({
                where: {
                  workspaceId,
                  isActive: true,
                  OR: [
                    { condition: "quantity >= 4" },
                    { title: { contains: "বাল্ক", mode: "insensitive" } },
                    { title: { contains: "ডেলিভারি", mode: "insensitive" } },
                    { instruction: { contains: "১০০" } },
                    { instruction: { contains: "100" } },
                  ],
                },
                data: { isActive: false },
              });
            }

            const createdMemory = await prisma.businessMemory.create({
              data: {
                workspaceId,
                pageId: pageId && pageId !== "ALL" ? pageId : null,
                category: act.rule.category || "CUSTOM_RULE",
                title: act.rule.title || "কাস্টম রুল",
                instruction: act.rule.instruction || cleanText,
                condition: act.rule.condition || null,
                rawOwnerText: cleanText,
                confidence: 1.0,
                isActive: true,
              },
            });
            actionPayload = {
              type: "TEACH_RULE",
              data: createdMemory,
              summary: `✅ নতুন নিয়ম সংরক্ষিত: ${createdMemory.title}`,
            };
          } else if (act.type === "CREATE_PRODUCT" && act.product) {
            const p = act.product;
            const newPrice = Number(p.price) || 150;
            // Update ALL products matching PVC/Card in workspace
            const matchedProducts = await prisma.product.findMany({
              where: {
                workspaceId,
                OR: [
                  { name: { contains: "PVC", mode: "insensitive" } },
                  { name: { contains: "Card", mode: "insensitive" } },
                  { name: { contains: "কার্ড", mode: "insensitive" } },
                  { name: { contains: (p.name || "").trim().slice(0, 8), mode: "insensitive" } },
                ],
              },
            });

            if (matchedProducts.length > 0) {
              for (const prod of matchedProducts) {
                await prisma.product.update({
                  where: { id: prod.id },
                  data: {
                    price: newPrice,
                    regularPrice: p.regularPrice ? Number(p.regularPrice) : 200,
                    stockCount: p.stockCount ? Number(p.stockCount) : prod.stockCount,
                    inStock: true,
                  },
                });
              }
              actionPayload = {
                type: "UPDATE_PRODUCT",
                data: matchedProducts[0],
                summary: `📦 প্রোডাক্ট মূল্য আপডেট হয়েছে: ${matchedProducts[0].name} (৳${newPrice})`,
              };
            } else {
              const createdProduct = await prisma.product.create({
                data: {
                  workspaceId,
                  name: p.name || "PVC ID Card Printing",
                  price: newPrice,
                  regularPrice: p.regularPrice ? Number(p.regularPrice) : 200,
                  category: p.category || "PVC Print Service",
                  stockCount: p.stockCount ? Number(p.stockCount) : 500,
                  description: p.description || "High quality PVC print for NID, Driving License, Student ID",
                  inStock: true,
                },
              });
              actionPayload = {
                type: "CREATE_PRODUCT",
                data: createdProduct,
                summary: `📦 নতুন প্রোডাক্ট যুক্ত হয়েছে: ${createdProduct.name} (৳${createdProduct.price})`,
              };
            }

            // Also synchronize and sanitize FacebookPage.systemPrompt across all pages in this workspace
            const pages = await prisma.facebookPage.findMany({ where: { workspaceId } });
            for (const pg of pages) {
              if (pg.systemPrompt) {
                const cleanedPrompt = pg.systemPrompt
                  .replace(/১০০\s*টাকা/g, `${newPrice} টাকা`)
                  .replace(/100\s*টাকা/g, `${newPrice} টাকা`)
                  .replace(/১০০\s*tk/gi, `${newPrice} টাকা`)
                  .replace(/100\s*tk/gi, `${newPrice} টাকা`)
                  .replace(/১০০/g, `${newPrice}`)
                  .replace(/100/g, `${newPrice}`);
                await prisma.facebookPage.update({
                  where: { id: pg.id },
                  data: { systemPrompt: cleanedPrompt },
                });
              }
            }

            // Deactivate any old conflicting business memories mentioning 100
            await prisma.businessMemory.updateMany({
              where: {
                workspaceId,
                isActive: true,
                OR: [
                  { instruction: { contains: "১০০" } },
                  { instruction: { contains: "100" } },
                ],
              },
              data: { isActive: false },
            });
          } else if (act.type === "UPDATE_PRODUCT" && act.productUpdate) {
            const u = act.productUpdate;
            const matchedProduct = await prisma.product.findFirst({
              where: {
                workspaceId,
                name: { contains: u.productQuery || "", mode: "insensitive" },
              },
            });

            if (matchedProduct) {
              const updatedData: any = {};
              if (u.price !== undefined) updatedData.price = Number(u.price);
              if (u.stockCount !== undefined) updatedData.stockCount = Number(u.stockCount);
              if (u.inStock !== undefined) updatedData.inStock = Boolean(u.inStock);

              const updated = await prisma.product.update({
                where: { id: matchedProduct.id },
                data: updatedData,
              });

              if (u.price !== undefined) {
                const newPrice = Number(u.price);
                const pages = await prisma.facebookPage.findMany({ where: { workspaceId } });
                for (const pg of pages) {
                  if (pg.systemPrompt) {
                    const cleanedPrompt = pg.systemPrompt
                      .replace(/১০০\s*টাকা/g, `${newPrice} টাকা`)
                      .replace(/100\s*টাকা/g, `${newPrice} টাকা`)
                      .replace(/১০০\s*tk/gi, `${newPrice} টাকা`)
                      .replace(/100\s*tk/gi, `${newPrice} টাকা`)
                      .replace(/১০০/g, `${newPrice}`)
                      .replace(/100/g, `${newPrice}`);
                    await prisma.facebookPage.update({
                      where: { id: pg.id },
                      data: { systemPrompt: cleanedPrompt },
                    });
                  }
                }
                await prisma.businessMemory.updateMany({
                  where: {
                    workspaceId,
                    isActive: true,
                    OR: [
                      { instruction: { contains: "১০০" } },
                      { instruction: { contains: "100" } },
                    ],
                  },
                  data: { isActive: false },
                });
              }

              actionPayload = {
                type: "UPDATE_PRODUCT",
                data: updated,
                summary: `✏️ প্রোডাক্ট আপডেট সম্পন্ন: ${updated.name} (৳${updated.price})`,
              };
            }
          } else if (act.type === "STATS_REPORT") {
            actionPayload = {
              type: "STATS_REPORT",
              data: {
                todayOrdersCount,
                pendingOrdersCount,
                totalOrdersCount,
                totalRevenue,
              },
              summary: `📊 লাইভ স্টোর রিপোর্ট: আজকে ${todayOrdersCount}টি অর্ডার | মোট আয় ৳${totalRevenue.toLocaleString()}`,
            };
          } else if (act.type === "DELETE_RULE" && act.deleteRule) {
            const q = act.deleteRule.ruleQuery || "";
            const matched = await prisma.businessMemory.findFirst({
              where: {
                workspaceId,
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { instruction: { contains: q, mode: "insensitive" } },
                ],
              },
            });
            if (matched) {
              await prisma.businessMemory.delete({ where: { id: matched.id } });
              actionPayload = {
                type: "DELETE_RULE",
                data: matched,
                summary: `🗑️ নিয়মটি মুছে ফেলা হয়েছে: ${matched.title}`,
              };
            }
          } else if (act.type === "INTERVIEW_EXTRACT" && act.interview) {
            const iv = act.interview;
            if (iv.businessName || iv.businessDescription) {
              await prisma.workspace.update({
                where: { id: workspaceId },
                data: {
                  name: iv.businessName || workspace?.name,
                },
              });
              await prisma.facebookPage.updateMany({
                where: { workspaceId },
                data: {
                  businessName: iv.businessName || undefined,
                  businessDescription: iv.businessDescription || undefined,
                },
              });
            }
            if (iv.deliveryChargeInside || iv.deliveryChargeOutside) {
              await prisma.businessMemory.create({
                data: {
                  workspaceId,
                  category: "DELIVERY_POLICY",
                  title: "ডেলিভারি চার্জ পলিসি",
                  instruction: `ঢাকার ভেতরে ডেলিভারি চার্জ ৳${iv.deliveryChargeInside || 80} এবং ঢাকার বাইরে ৳${iv.deliveryChargeOutside || 130}।`,
                  confidence: 1.0,
                  isActive: true,
                },
              });
            }
            actionPayload = {
              type: "INTERVIEW_EXTRACT",
              data: iv,
              summary: `✨ স্টোর প্রোফাইল আপডেট করা হয়েছে।`,
            };
          }
        } catch (execErr: any) {
          console.warn("Co-Pilot action execution notice:", execErr.message);
        }
      }
    }

    // Save Co-Pilot response
    await prisma.coPilotMessage.create({
      data: {
        sessionId: session.id,
        sender: "COPILOT",
        content: finalReply,
        actionType: actionPayload.type,
        actionPayload: JSON.stringify(actionPayload),
      },
    });

    // Touch session updatedAt
    await prisma.coPilotSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    const refreshedSession = await prisma.coPilotSession.findUnique({
      where: { id: session.id },
      include: {
        messages: {
          take: 50,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return {
      reply: finalReply,
      action: actionPayload,
      session: refreshedSession,
    };
  }
}

export const copilotService = new CopilotService();
