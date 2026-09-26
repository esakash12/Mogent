import { Context } from "hono";
import { prisma } from "@mogent/database";
import { createOrder } from "../services/order-service";

export class OrdersController {
  /**
   * GET /api/orders - List all orders for active workspace
   */
  static async list(c: Context) {
    const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
    const statusFilter = c.req.query("status");
    const pageId = c.req.query("pageId");

    try {
      if (!workspaceId) {
        return c.json({ success: true, data: [] });
      }

      let pagesWhere: any = { workspaceId };
      if (pageId && pageId !== "ALL") {
        pagesWhere.id = pageId;
      }

      const pages = await prisma.facebookPage.findMany({
        where: pagesWhere,
        select: { id: true, name: true },
      });
      const pageIds = pages.map((p) => p.id);

      if (pageIds.length === 0) {
        return c.json({ success: true, data: [] });
      }
      const pageMap = new Map(pages.map((p) => [p.id, p.name]));

      const customers = await prisma.customer.findMany({
        where: { facebookPageId: { in: pageIds } },
        select: { id: true, firstName: true, lastName: true, phoneNumber: true, deliveryAddress: true, facebookPageId: true },
      });
      const customerIds = customers.map((c) => c.id);
      const customerMap = new Map(customers.map((c) => [c.id, c]));

      if (customerIds.length === 0) {
        return c.json({ success: true, data: [] });
      }

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
  }

  /**
   * POST /api/orders - Create a new order
   */
  static async create(c: Context) {
    const workspaceId = c.req.header("x-workspace-id");

    try {
      const body = await c.req.json();
      const createdOrder = await createOrder({
        workspaceId,
        ...body,
      });

      return c.json({
        success: true,
        message: "Order created successfully",
        data: createdOrder,
      });
    } catch (error: any) {
      console.error("Create order error:", error);
      return c.json({ success: false, error: error.message || "Failed to create order." }, 500);
    }
  }

  /**
   * PATCH /api/orders/:id/status - Update order status
   */
  static async updateStatus(c: Context) {
    const { id } = c.req.param();
    try {
      const { status } = await c.req.json();
      const updated = await prisma.order.update({
        where: { id },
        data: { status },
      });
      return c.json({ success: true, data: updated });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  }
}
