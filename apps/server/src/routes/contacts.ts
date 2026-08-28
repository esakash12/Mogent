import { Hono } from "hono";
import { prisma } from "@mogent/database";

export const contactsRouter = new Hono();

// GET /api/contacts - List customer contacts for active workspace
contactsRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");
  const filter = c.req.query("filter"); // ALL, PHONE, PURCHASED, COMPLAINT
  const pageId = c.req.query("pageId");

  try {
    let pagesWhere: any = {};
    if (pageId && pageId !== "ALL") {
      pagesWhere = { id: pageId };
    } else if (workspaceId) {
      pagesWhere = { workspaceId };
    }

    let pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true, pageId: true },
    });
    let pageIds = pages.map((p) => p.id);

    if (pageIds.length === 0 && (!pageId || pageId === "ALL")) {
      const allPages = await prisma.facebookPage.findMany({
        select: { id: true, name: true, pageId: true },
      });
      pageIds = allPages.map((p) => p.id);
    }

    const customers = await prisma.customer.findMany({
      where: pageIds.length > 0 ? { facebookPageId: { in: pageIds } } : {},
      include: { facebookPage: true },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = customers.map((cust) => {
      let sentimentTag: "HIGH_INTENT" | "PURCHASED" | "INQUIRY" | "COMPLAINT" = "INQUIRY";
      if (cust.totalOrders > 0) sentimentTag = "PURCHASED";
      else if ((cust.sentimentScore ?? 0) >= 0.7) sentimentTag = "HIGH_INTENT";
      else if ((cust.sentimentScore ?? 0) < 0) sentimentTag = "COMPLAINT";

      const fullName = `${cust.firstName || ""} ${cust.lastName || ""}`.trim();
      const displayName = fullName && fullName.toLowerCase() !== "facebook customer"
        ? fullName
        : `Customer #${cust.psid.slice(-4)}`;

      return {
        id: cust.id,
        name: displayName,
        phone: cust.phoneNumber || "",
        address: cust.deliveryAddress || "",
        ordersCount: cust.totalOrders,
        totalSpent: cust.totalSpent,
        score: cust.sentimentScore
          ? cust.sentimentScore > 0
            ? `+${cust.sentimentScore.toFixed(2)}`
            : `${cust.sentimentScore.toFixed(2)}`
          : "+0.70",
        sentiment: sentimentTag,
        lastActive: new Date(cust.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        psid: cust.psid,
        profilePic: cust.profilePic,
        pageId: cust.facebookPageId,
        pageName: cust.facebookPage?.name || "Connected Page",
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
      verifiedPhonesCount: customers.filter((cust) => Boolean(cust.phoneNumber)).length,
      confirmedBuyersCount: customers.filter((cust) => cust.totalOrders > 0).length,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
