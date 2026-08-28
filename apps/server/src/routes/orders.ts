import { Hono } from "hono";
import { prisma } from "@mogent/database";

export const ordersRouter = new Hono();

// GET /api/orders - List all orders for the workspace
ordersRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  const statusFilter = c.req.query("status");
  const pageId = c.req.query("pageId");

  try {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    let pagesWhere: any = {};
    if (pageId && pageId !== "ALL") {
      pagesWhere = { id: pageId };
    } else if (targetWorkspaceId) {
      pagesWhere = { workspaceId: targetWorkspaceId };
    }

    let pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true },
    });
    let pageIds = pages.map((p) => p.id);

    if (pageIds.length === 0 && (!pageId || pageId === "ALL")) {
      const allPages = await prisma.facebookPage.findMany({
        select: { id: true, name: true },
      });
      pageIds = allPages.map((p) => p.id);
      pages = allPages;
    }
    const pageMap = new Map(pages.map((p) => [p.id, p.name]));

    const customers = await prisma.customer.findMany({
      where: pageIds.length > 0 ? { facebookPageId: { in: pageIds } } : {},
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, deliveryAddress: true, facebookPageId: true },
    });
    const customerIds = customers.map((c) => c.id);
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const where: any = customerIds.length > 0 ? { customerId: { in: customerIds } } : {};
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: orders.map((o) => {
        const cust = customerMap.get(o.customerId);
        const pageName = cust ? pageMap.get(cust.facebookPageId) || "Store Page" : "Store Page";
        
        let itemsSummary = "Standard Item";
        if (typeof o.items === "string") {
          itemsSummary = o.items;
        } else if (Array.isArray(o.items)) {
          itemsSummary = o.items.map((i: any) => `${i.name || i.product || "Product"} x ${i.quantity || 1}`).join(", ");
        } else if (o.items && typeof o.items === "object") {
          itemsSummary = JSON.stringify(o.items);
        }

        return {
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: cust ? `${cust.firstName || ""} ${cust.lastName || ""}`.trim() || "Customer" : "Customer",
          phone: o.customerPhone || cust?.phoneNumber || "",
          address: o.shippingAddress || cust?.deliveryAddress || "",
          items: itemsSummary,
          amount: o.totalAmount,
          paymentMethod: "COD",
          status: o.status,
          capturedAt: new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: o.createdAt,
          pageName,
        };
      }),
    });
  } catch (error: any) {
    console.error("Fetch orders error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/orders - Create a new order manually or from chat
ordersRouter.post("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const {
      customerId,
      customerName,
      customerPhone,
      phone,
      deliveryAddress,
      address,
      productName,
      items,
      totalAmount,
      amount,
      paymentMethod,
      status,
      pageId,
    } = body;

    const finalPhone = (customerPhone || phone || "").trim();
    const finalAddress = (deliveryAddress || address || "").trim();
    const finalAmount = Number(totalAmount || amount || 0);
    const finalStatus = status || "CONFIRMED";
    const finalPaymentMethod = paymentMethod || "COD";

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      targetWorkspaceId = defaultWs?.id;
    }

    let targetCustomerId = customerId;

    if (!targetCustomerId) {
      // Resolve page
      let targetPageId = pageId;
      if (!targetPageId || targetPageId === "ALL") {
        const page = await prisma.facebookPage.findFirst({
          where: targetWorkspaceId ? { workspaceId: targetWorkspaceId } : {},
        });
        targetPageId = page?.id;
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
          return c.json({ success: false, error: "No Facebook page found" }, 404);
        }
      }

      const cleanName = (customerName || "").trim();
      const parts = cleanName.split(" ").filter(Boolean);
      const firstName = parts[0] || "Customer";
      const lastName = parts.slice(1).join(" ") || "";

      // Check if existing customer with this phone number exists
      if (finalPhone) {
        const existing = await prisma.customer.findFirst({
          where: {
            facebookPageId: targetPageId,
            phoneNumber: finalPhone,
          },
        });
        if (existing) {
          targetCustomerId = existing.id;
          if (cleanName || finalAddress) {
            await prisma.customer.update({
              where: { id: existing.id },
              data: {
                firstName: firstName || existing.firstName,
                lastName: lastName || existing.lastName,
                deliveryAddress: finalAddress || existing.deliveryAddress,
              },
            });
          }
        }
      }

      if (!targetCustomerId) {
        const newCustomer = await prisma.customer.create({
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
        targetCustomerId = newCustomer.id;
      }
    }

    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    let orderItems: any = items;
    if (!orderItems) {
      orderItems = [{ name: productName || "Standard Order", quantity: 1, unitPrice: finalAmount }];
    } else if (typeof orderItems === "string") {
      orderItems = [{ name: orderItems, quantity: 1, unitPrice: finalAmount }];
    }

    const createdOrder = await prisma.order.create({
      data: {
        customerId: targetCustomerId,
        orderNumber,
        items: orderItems,
        totalAmount: finalAmount,
        status: finalStatus,
        customerPhone: finalPhone || null,
        shippingAddress: finalAddress || null,
      },
    });

    await prisma.customer.update({
      where: { id: targetCustomerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: finalAmount },
      },
    });

    return c.json({
      success: true,
      data: {
        ...createdOrder,
        customerName: customerName || "Customer",
        customerPhone: finalPhone,
        deliveryAddress: finalAddress,
        itemsSummary: productName || (Array.isArray(orderItems) ? orderItems.map((i: any) => `${i.name || "Item"} x${i.quantity || 1}`).join(", ") : "1x Order"),
        paymentMethod: finalPaymentMethod,
      },
      message: "Order created successfully!",
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /api/orders/:id/status - Update order status
ordersRouter.patch("/:id/status", async (c) => {
  const { id } = c.req.param();

  try {
    const body = await c.req.json();
    const { status } = body;

    const validStatuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return c.json({ success: false, error: "Invalid order status" }, 400);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
