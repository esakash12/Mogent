import { Context } from "hono";
import { prisma } from "@mogent/database";
import { createOrder } from "../services/order-service";
import { formatBdTime } from "../utils/timezone";

export class OrdersController {
  /**
   * GET /api/orders - List all orders for active workspace
   */
  static async list(c: Context) {
    const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
    const statusFilter = c.req.query("status");
    const pageId = c.req.query("pageId");
    const limitParam = c.req.query("limit");
    const isAll = c.req.query("all") === "true";
    const limit = isAll ? undefined : (limitParam ? parseInt(limitParam) : 50);

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
        select: { id: true },
      });
      const pageIds = pages.map((p) => p.id);

      const where: any = {
        customer: {
          OR: [
            { workspaceId },
            ...(pageIds.length > 0 ? [{ facebookPageId: { in: pageIds } }] : []),
          ],
        },
      };
      if (statusFilter && statusFilter !== "ALL") {
        where.status = statusFilter;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          customer: {
            include: {
              facebookPage: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return c.json({
        success: true,
        data: orders.map((o) => {
          const cust = o.customer;
          const pageName = cust?.facebookPage?.name || "Store Page";

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
            capturedAt: formatBdTime(o.createdAt),
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
    const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

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
   * PATCH /api/orders/:id/status - Update order status with IDOR verification
   */
  static async updateStatus(c: Context) {
    const { id } = c.req.param();
    const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

    try {
      const { status } = await c.req.json();

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: {
            include: {
              facebookPage: { select: { workspaceId: true } },
            },
          },
        },
      });

      if (!order) {
        return c.json({ success: false, error: "Order not found" }, 404);
      }

      if (workspaceId) {
        const orderWorkspaceId = order.customer?.workspaceId || order.customer?.facebookPage?.workspaceId;
        if (orderWorkspaceId && orderWorkspaceId !== workspaceId) {
          return c.json({ success: false, error: "Forbidden: You do not have permission to modify this order" }, 403);
        }
      }

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
