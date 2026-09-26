import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { authMiddleware } from "../middleware/auth";

export const dashboardRouter = new Hono();

// Enforce auth on dashboard routes
dashboardRouter.use("*", authMiddleware);

// GET /api/dashboard/analytics - Multi-tenant workspace analytics
dashboardRouter.get("/analytics", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    const workspaceInfo = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, plan: true },
    });

    if (!workspaceInfo) {
      return c.json({ success: false, error: "Workspace not found" }, 404);
    }

    // Get pages belonging ONLY to this workspace
    const pages = await prisma.facebookPage.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const pageIds = pages.map((p) => p.id);

    // Compute products count strictly scoped to this workspace
    const productsCount = await prisma.product.count({
      where: { workspaceId },
    });

    if (pageIds.length === 0) {
      // 14-day zero state
      const emptyDaily: { date: string; count: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = i === 0 ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        emptyDaily.push({ date: label, count: 0 });
      }

      return c.json({
        success: true,
        data: {
          workspace: workspaceInfo,
          pagesConnected: 0,
          totalConversations: 0,
          totalContacts: 0,
          aiResolutionRate: 100,
          totalRevenue: 0,
          confirmedOrdersCount: 0,
          productsCount,
          aiMessagesCount: 0,
          isNewWorkspace: true,
          sentiment: { positive: 100, neutral: 0, negative: 0 },
          dailyActivity: emptyDaily,
        },
      });
    }

    // Live counts for connected pages
    const [totalConversations, totalContacts, aiResolvedCount, aiMessagesCount] =
      await Promise.all([
        prisma.conversation.count({ where: { facebookPageId: { in: pageIds } } }),
        prisma.customer.count({ where: { facebookPageId: { in: pageIds } } }),
        prisma.conversation.count({
          where: { facebookPageId: { in: pageIds }, isHumanControl: false },
        }),
        prisma.message.count({
          where: {
            conversation: { facebookPageId: { in: pageIds } },
            sender: "AI",
          },
        }),
      ]);

    // Real orders and revenue from Prisma Order model
    const orders = await prisma.order.findMany({
      where: {
        customer: {
          facebookPageId: { in: pageIds },
        },
      },
      select: { totalAmount: true, status: true },
    });

    const confirmedOrders = orders.filter((o) =>
      ["CONFIRMED", "DELIVERED", "SHIPPED"].includes((o.status || "").toUpperCase())
    );
    const totalRevenue = confirmedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const confirmedOrdersCount = confirmedOrders.length;

    // Customer sentiments
    const customers = await prisma.customer.findMany({
      where: { facebookPageId: { in: pageIds } },
      select: { sentimentScore: true },
    });

    let pos = 0,
      neu = 0,
      neg = 0;
    if (customers.length > 0) {
      customers.forEach((cust) => {
        const s = cust.sentimentScore ?? 0.5;
        if (s >= 0.6) pos++;
        else if (s <= -0.4) neg++;
        else neu++;
      });
    }

    const totalCustCount = customers.length || 1;
    const sentiment =
      customers.length > 0
        ? {
            positive: Math.round((pos / totalCustCount) * 100),
            neutral: Math.round((neu / totalCustCount) * 100),
            negative: Math.round((neg / totalCustCount) * 100),
          }
        : { positive: 100, neutral: 0, negative: 0 };

    const resolutionRate =
      totalConversations > 0
        ? Number(((aiResolvedCount / totalConversations) * 100).toFixed(1))
        : 100;

    // Real last 14 days activity from Prisma
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const recentConvs = await prisma.conversation.findMany({
      where: {
        facebookPageId: { in: pageIds },
        updatedAt: { gte: fourteenDaysAgo },
      },
      select: { updatedAt: true },
    });

    const dailyActivity: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const label = i === 0 ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = recentConvs.filter((c) => {
        const t = new Date(c.updatedAt);
        return t >= d && t < nextD;
      }).length;

      dailyActivity.push({ date: label, count });
    }

    return c.json({
      success: true,
      data: {
        workspace: workspaceInfo,
        pagesConnected: pageIds.length,
        totalConversations,
        totalContacts,
        aiResolutionRate: resolutionRate,
        totalRevenue,
        confirmedOrdersCount,
        productsCount,
        aiMessagesCount,
        isNewWorkspace: totalConversations === 0 && pageIds.length === 0,
        sentiment,
        dailyActivity,
      },
    });
  } catch (error: any) {
    console.error("Dashboard analytics error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
