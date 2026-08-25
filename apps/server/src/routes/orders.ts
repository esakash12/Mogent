import { Hono } from "hono";
import { prisma } from "@mogent/database";

export const ordersRouter = new Hono();

// GET /api/orders - List all orders for the workspace
ordersRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  const statusFilter = c.req.query("status");

  try {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    const pages = await prisma.facebookPage.findMany({
      where: targetWorkspaceId ? { workspaceId: targetWorkspaceId } : {},
      select: { id: true, name: true },
    });
    const pageIds = pages.map((p) => p.id);
    const pageMap = new Map(pages.map((p) => [p.id, p.name]));

    const customers = await prisma.customer.findMany({
      where: { facebookPageId: { in: pageIds } },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true, deliveryAddress: true, facebookPageId: true },
    });
    const customerIds = customers.map((c) => c.id);
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const where: any = { customerId: { in: customerIds } };
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
    const { customerId, phone, address, items, amount, status } = body;

    let targetCustomerId = customerId;
    if (!targetCustomerId) {
      const defaultPage = await prisma.facebookPage.findFirst({
        where: workspaceId ? { workspaceId } : {},
      });
      if (!defaultPage) {
        return c.json({ success: false, error: "No Facebook Page found" }, 404);
      }

      const newCustomer = await prisma.customer.create({
        data: {
          facebookPageId: defaultPage.id,
          psid: `manual-${Date.now()}`,
          firstName: "Manual",
          lastName: "Customer",
          phoneNumber: phone || null,
          deliveryAddress: address || null,
        },
      });
      targetCustomerId = newCustomer.id;
    }

    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const createdOrder = await prisma.order.create({
      data: {
        customerId: targetCustomerId,
        orderNumber,
        items: items || [{ name: "Product", quantity: 1, unitPrice: amount || 0 }],
        totalAmount: Number(amount) || 0,
        status: status || "CONFIRMED",
        customerPhone: phone || null,
        shippingAddress: address || null,
      },
    });

    await prisma.customer.update({
      where: { id: targetCustomerId },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: Number(amount) || 0 },
      },
    });

    return c.json({ success: true, data: createdOrder });
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
