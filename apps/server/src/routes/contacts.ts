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

// POST /api/contacts - Create or update a customer contact/lead
contactsRouter.post("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { name, phone, address, pageId, sentiment } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, error: "Customer name is required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      targetWorkspaceId = defaultWs?.id;
    }

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
            name: "Direct Leads",
            category: "Direct Leads",
            encryptedAccessToken: "direct_token",
            tokenIv: "direct_iv",
            tokenTag: "direct_tag",
            verifyToken: "mogent_fb_verify_token_secure",
          },
        });
        targetPageId = newPage.id;
      } else {
        return c.json({ success: false, error: "No connected store page found" }, 404);
      }
    }

    const cleanName = (name || "").trim();
    const parts = cleanName.split(" ").filter(Boolean);
    const firstName = parts[0] || "Customer";
    const lastName = parts.slice(1).join(" ") || "";

    const cleanPhone = (phone || "").trim();
    const cleanAddress = (address || "").trim();

    let sentimentScore = 0.7;
    if (sentiment === "PURCHASED") sentimentScore = 0.95;
    else if (sentiment === "HIGH_INTENT") sentimentScore = 0.85;
    else if (sentiment === "COMPLAINT") sentimentScore = -0.5;

    let customer;
    if (cleanPhone) {
      const existing = await prisma.customer.findFirst({
        where: {
          facebookPageId: targetPageId,
          phoneNumber: cleanPhone,
        },
      });

      if (existing) {
        customer = await prisma.customer.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            deliveryAddress: cleanAddress || existing.deliveryAddress,
            sentimentScore,
          },
          include: { facebookPage: true },
        });
      }
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          facebookPageId: targetPageId,
          psid: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          firstName,
          lastName,
          phoneNumber: cleanPhone || null,
          deliveryAddress: cleanAddress || null,
          sentimentScore,
        },
        include: { facebookPage: true },
      });
    }

    return c.json({
      success: true,
      data: {
        id: customer.id,
        name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
        phone: customer.phoneNumber || "",
        address: customer.deliveryAddress || "",
        ordersCount: customer.totalOrders,
        totalSpent: customer.totalSpent,
        sentiment: sentiment || "INQUIRY",
        psid: customer.psid,
        pageName: customer.facebookPage?.name || "Connected Page",
      },
      message: "Lead saved successfully!",
    });
  } catch (error: any) {
    console.error("Create contact error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
