import { Hono } from "hono";
import { prisma } from "@mogent/database";

export const contactsRouter = new Hono();

// GET /api/contacts - List customer contacts for active workspace
contactsRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  const filter = c.req.query("filter"); // ALL, PHONE, PURCHASED, COMPLAINT

  try {
    let pagesWhere: any = {};
    if (workspaceId) {
      pagesWhere = { workspaceId };
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true },
    });
    const pageIds = pages.map((p) => p.id);

    if (pageIds.length === 0) {
      return c.json({
        success: true,
        data: [],
        totalCount: 0,
        verifiedPhonesCount: 0,
        confirmedBuyersCount: 0,
      });
    }

    const customers = await prisma.customer.findMany({
      where: { facebookPageId: { in: pageIds } },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = customers.map((c) => {
      let sentimentTag: "HIGH_INTENT" | "PURCHASED" | "INQUIRY" | "COMPLAINT" = "INQUIRY";
      if (c.totalOrders > 0) sentimentTag = "PURCHASED";
      else if ((c.sentimentScore ?? 0) >= 0.7) sentimentTag = "HIGH_INTENT";
      else if ((c.sentimentScore ?? 0) < 0) sentimentTag = "COMPLAINT";

      return {
        id: c.id,
        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Facebook Customer",
        phone: c.phoneNumber || "",
        address: c.deliveryAddress || "",
        ordersCount: c.totalOrders,
        totalSpent: c.totalSpent,
        score: c.sentimentScore ? (c.sentimentScore > 0 ? `+${c.sentimentScore.toFixed(2)}` : `${c.sentimentScore.toFixed(2)}`) : "+0.70",
        sentiment: sentimentTag,
        lastActive: new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        psid: c.psid,
      };
    });

    const filtered = mapped.filter((item) => {
      if (filter === "PHONE") return Boolean(item.phone);
      if (filter === "PURCHASED") return item.sentiment === "PURCHASED";
      if (filter === "COMPLAINT") return item.sentiment === "COMPLAINT";
      return true;
    });

    return c.json({
      success: true,
      data: filtered,
      totalCount: customers.length,
      verifiedPhonesCount: customers.filter((c) => Boolean(c.phoneNumber)).length,
      confirmedBuyersCount: customers.filter((c) => c.totalOrders > 0).length,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
