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

import { createOrder } from "../services/order-service";

// POST /api/orders - Create a new order manually or from chat
ordersRouter.post("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();

    const order = await createOrder({
      ...body,
      workspaceId,
      isAiGenerated: false,
    });

    return c.json({
      success: true,
      data: order,
      message: "Order created successfully!",
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return c.json({ success: false, error: error.message || "Failed to create order" }, 400);
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
