import { prisma } from "@mogent/database";
import { telegramAlertsQueue } from "../queue/message-queue";

export interface CreateOrderInput {
  workspaceId?: string;
  customerId?: string;
  conversationId?: string;
  customerName?: string;
  customerPhone?: string;
  phone?: string;
  deliveryAddress?: string;
  address?: string;
  productName?: string;
  items?: any;
  totalAmount?: number | string;
  amount?: number | string;
  paymentMethod?: string;
  status?: string;
  pageId?: string;
  notes?: string;
  isAiGenerated?: boolean;
}

export async function createOrder(input: CreateOrderInput) {
  const finalPhone = (input.customerPhone || input.phone || "").trim();
  const finalAddress = (input.deliveryAddress || input.address || "").trim();
  const finalAmount = Number(input.totalAmount || input.amount || 0);
  const finalStatus = input.status || "CONFIRMED";
  const finalPaymentMethod = input.paymentMethod || "COD";

  // 1. Resolve Workspace
  let targetWorkspaceId = input.workspaceId;
  if (!targetWorkspaceId) {
    const defaultWs = await prisma.workspace.findFirst({
      orderBy: { updatedAt: "desc" },
    });
    targetWorkspaceId = defaultWs?.id;
  }

  // 2. Resolve Customer (Guaranteed Valid Customer ID for Foreign Key)
  let targetCustomer: any = null;

  // A. Check if input.customerId is a valid customer ID
  if (input.customerId) {
    targetCustomer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });

    // If not a customer, check if it is a conversation ID passed as customerId
    if (!targetCustomer) {
      const conv = await prisma.conversation.findUnique({
        where: { id: input.customerId },
        include: { customer: true },
      });
      if (conv?.customer) {
        targetCustomer = conv.customer;
      }
    }
  }

  // B. Check if input.conversationId is passed
  if (!targetCustomer && input.conversationId) {
    const conv = await prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: { customer: true },
    });
    if (conv?.customer) {
      targetCustomer = conv.customer;
    }
  }

  // C. Resolve Target Page
  let targetPageId = input.pageId;
  if (!targetPageId || targetPageId === "ALL") {
    if (targetCustomer?.facebookPageId) {
      targetPageId = targetCustomer.facebookPageId;
    } else {
      const page = await prisma.facebookPage.findFirst({
        where: targetWorkspaceId ? { workspaceId: targetWorkspaceId } : {},
      });
      targetPageId = page?.id;
    }
  }

  if (!targetPageId) {
    const anyPage = await prisma.facebookPage.findFirst();
    if (anyPage) {
      targetPageId = anyPage.id;
    } else if (targetWorkspaceId) {
      const newPage = await prisma.facebookPage.create({
        data: {
          workspaceId: targetWorkspaceId,
          pageId: `store-${Date.now()}`,
          name: "Store Orders",
          category: "Store Orders",
          encryptedAccessToken: "direct_token",
          tokenIv: "direct_iv",
          tokenTag: "direct_tag",
          verifyToken: "mogent_fb_verify_token_secure",
        },
      });
      targetPageId = newPage.id;
    } else {
      throw new Error("No Facebook page or workspace available for order creation.");
    }
  }

  // D. Find by phone number if still not resolved
  const cleanName = (input.customerName || targetCustomer?.firstName || "").trim();
  const parts = cleanName.split(" ").filter(Boolean);
  const firstName = parts[0] || targetCustomer?.firstName || "Customer";
  const lastName = parts.slice(1).join(" ") || targetCustomer?.lastName || "";

  if (!targetCustomer && finalPhone) {
    targetCustomer = await prisma.customer.findFirst({
      where: {
        facebookPageId: targetPageId,
        phoneNumber: finalPhone,
      },
    });
  }

  // E. Update existing customer or create a new one
  if (targetCustomer) {
    if (cleanName || finalAddress || finalPhone) {
      targetCustomer = await prisma.customer.update({
        where: { id: targetCustomer.id },
        data: {
          firstName: firstName || targetCustomer.firstName,
          lastName: lastName || targetCustomer.lastName,
          phoneNumber: finalPhone || targetCustomer.phoneNumber,
          deliveryAddress: finalAddress || targetCustomer.deliveryAddress,
        },
      });
    }
  } else {
    targetCustomer = await prisma.customer.create({
      data: {
        facebookPageId: targetPageId,
        psid: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        firstName,
        lastName,
        phoneNumber: finalPhone || null,
        deliveryAddress: finalAddress || null,
        sentimentScore: 0.95,
      },
    });
  }

  // 3. Format Items
  let orderItems: any = input.items;
  if (!orderItems) {
    orderItems = [{ name: input.productName || "Standard Order", quantity: 1, unitPrice: finalAmount }];
  } else if (typeof orderItems === "string") {
    orderItems = [{ name: orderItems, quantity: 1, unitPrice: finalAmount }];
  }

  const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  // 4. Create Order in Database
  const createdOrder = await prisma.order.create({
    data: {
      customerId: targetCustomer.id,
      orderNumber,
      items: orderItems,
      totalAmount: finalAmount,
      status: finalStatus,
      customerPhone: finalPhone || targetCustomer.phoneNumber || null,
      shippingAddress: finalAddress || targetCustomer.deliveryAddress || null,
      notes: input.notes || (input.isAiGenerated ? "AI Agent Automated Order Capture" : "Manual Dashboard Order"),
    },
  });

  // 5. Increment Customer Metrics & Tag
  const existingTags = targetCustomer.tags || [];
  const updatedTags = Array.from(new Set([...existingTags, "CONFIRMED_BUYER", "ORDER_ACTIVE"]));

  await prisma.customer.update({
    where: { id: targetCustomer.id },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: finalAmount },
      tags: updatedTags,
    },
  });

  return {
    ...createdOrder,
    customerName: `${targetCustomer.firstName || ""} ${targetCustomer.lastName || ""}`.trim() || "Customer",
    customerPhone: finalPhone || targetCustomer.phoneNumber || "",
    deliveryAddress: finalAddress || targetCustomer.deliveryAddress || "",
    itemsSummary: input.productName || (Array.isArray(orderItems) ? orderItems.map((i: any) => `${i.name || "Item"} x${i.quantity || 1}`).join(", ") : "1x Order"),
    paymentMethod: finalPaymentMethod,
  };
}
