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
  channel?: string;
  notes?: string;
  isAiGenerated?: boolean;
}

export async function createOrder(input: CreateOrderInput) {
  const finalPhone = (input.customerPhone || input.phone || "").trim();
  const finalAddress = (input.deliveryAddress || input.address || "").trim();
  const finalAmount = Number(input.totalAmount || input.amount || 0);
  const finalStatus = input.status || "CONFIRMED";
  const finalPaymentMethod = input.paymentMethod || "COD";
  const channel = input.channel || (finalPhone ? "WHATSAPP" : "MESSENGER");

  // 1. Resolve Customer if customerId or conversationId passed
  let targetCustomer: any = null;

  if (input.customerId) {
    targetCustomer = await prisma.customer.findUnique({
      where: { id: input.customerId },
      include: { facebookPage: true },
    });

    if (!targetCustomer) {
      const conv = await prisma.conversation.findUnique({
        where: { id: input.customerId },
        include: { customer: { include: { facebookPage: true } } },
      });
      if (conv?.customer) {
        targetCustomer = conv.customer;
      }
    }
  }

  if (!targetCustomer && input.conversationId) {
    const conv = await prisma.conversation.findUnique({
      where: { id: input.conversationId },
      include: { customer: { include: { facebookPage: true } } },
    });
    if (conv?.customer) {
      targetCustomer = conv.customer;
    }
  }

  // 2. Resolve Workspace strictly
  let targetWorkspaceId = input.workspaceId;
  if (!targetWorkspaceId) {
    targetWorkspaceId = targetCustomer?.workspaceId || targetCustomer?.facebookPage?.workspaceId;
  }

  if (!targetWorkspaceId) {
    throw new Error("Workspace ID is required for order creation.");
  }

  // 3. Resolve Facebook Page ID (Optional - WhatsApp or direct orders have null)
  let targetPageId = input.pageId && input.pageId !== "ALL" ? input.pageId : null;
  if (!targetPageId && targetCustomer?.facebookPageId) {
    targetPageId = targetCustomer.facebookPageId;
  }

  // 4. Resolve / Create Customer strictly within Workspace
  const cleanName = (input.customerName || targetCustomer?.firstName || "").trim();
  const parts = cleanName.split(" ").filter(Boolean);
  const firstName = parts[0] || targetCustomer?.firstName || "Customer";
  const lastName = parts.slice(1).join(" ") || targetCustomer?.lastName || "";

  if (!targetCustomer && finalPhone) {
    targetCustomer = await prisma.customer.findFirst({
      where: {
        workspaceId: targetWorkspaceId,
        phoneNumber: finalPhone,
      },
    });
  }

  if (targetCustomer) {
    if (cleanName || finalAddress || finalPhone || !targetCustomer.workspaceId) {
      targetCustomer = await prisma.customer.update({
        where: { id: targetCustomer.id },
        data: {
          firstName: firstName || targetCustomer.firstName,
          lastName: lastName || targetCustomer.lastName,
          phoneNumber: finalPhone || targetCustomer.phoneNumber,
          deliveryAddress: finalAddress || targetCustomer.deliveryAddress,
          workspaceId: targetCustomer.workspaceId || targetWorkspaceId,
        },
      });
    }
  } else {
    targetCustomer = await prisma.customer.create({
      data: {
        workspaceId: targetWorkspaceId,
        facebookPageId: targetPageId,
        channel,
        psid: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        firstName,
        lastName,
        phoneNumber: finalPhone || null,
        deliveryAddress: finalAddress || null,
        sentimentScore: 0.95,
      },
    });
  }

  // 5. Format Items
  let orderItems: any = input.items;
  if (!orderItems) {
    orderItems = [{ name: input.productName || "Standard Order", quantity: 1, unitPrice: finalAmount }];
  } else if (typeof orderItems === "string") {
    orderItems = [{ name: orderItems, quantity: 1, unitPrice: finalAmount }];
  }

  const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  // 6. Create Order with direct Workspace relation
  const createdOrder = await prisma.order.create({
    data: {
      workspaceId: targetWorkspaceId,
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

  // 7. Increment Customer Metrics & Tag
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
