import { Hono } from "hono";
import { prisma } from "@mogent/database";

export const dashboardRouter = new Hono();

// GET /api/dashboard/analytics - Multi-tenant workspace analytics
dashboardRouter.get("/analytics", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    // 1. If workspaceId provided, filter by workspace
    let pagesWhere: any = {};
    let productsWhere: any = {};
    let workspaceInfo: any = null;

    if (workspaceId) {
      pagesWhere = { workspaceId };
      productsWhere = { workspaceId };
      workspaceInfo = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, plan: true },
      });
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true },
    });
    const pageIds = pages.map((p) => p.id);

    const [totalConversations, totalContacts, productsCount, aiResolvedCount] =
      await Promise.all([
        pageIds.length > 0
          ? prisma.conversation.count({ where: { facebookPageId: { in: pageIds } } })
          : 0,
        pageIds.length > 0
          ? prisma.customer.count({ where: { facebookPageId: { in: pageIds } } })
          : 0,
        prisma.product.count({ where: productsWhere }),
        pageIds.length > 0
          ? prisma.conversation.count({
              where: { facebookPageId: { in: pageIds }, isHumanControl: false },
            })
          : 0,
      ]);

    // Customer sentiments for this workspace
    const customers =
      pageIds.length > 0
        ? await prisma.customer.findMany({
            where: { facebookPageId: { in: pageIds } },
            select: { sentimentScore: true },
          })
        : [];

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

    return c.json({
      success: true,
      data: {
        workspace: workspaceInfo,
        pagesConnected: pageIds.length,
        totalConversations,
        totalContacts,
        aiResolutionRate: resolutionRate,
        totalRevenue: 0,
        confirmedOrdersCount: 0,
        productsCount,
        isNewWorkspace: totalConversations === 0 && pageIds.length === 0,
        sentiment,
        trajectory: [
          { day: "Mon", date: "Aug 18", messages: 0, orders: 0 },
          { day: "Tue", date: "Aug 19", messages: 0, orders: 0 },
          { day: "Wed", date: "Aug 20", messages: 0, orders: 0 },
          { day: "Thu", date: "Aug 21", messages: 0, orders: 0 },
          { day: "Fri", date: "Aug 22", messages: 0, orders: 0 },
          { day: "Sat", date: "Aug 23", messages: 0, orders: 0 },
          { day: "Sun", date: "Aug 24", messages: 0, orders: 0 },
        ],
      },
    });
  } catch (error: any) {
    console.error("Dashboard analytics error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
