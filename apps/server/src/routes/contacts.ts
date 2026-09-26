import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { authMiddleware } from "../middleware/auth";

export const contactsRouter = new Hono();

// Enforce auth on contacts routes
contactsRouter.use("*", authMiddleware);

// GET /api/contacts - List customer contacts for active workspace
contactsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const filter = c.req.query("filter"); // ALL, PHONE, PURCHASED, COMPLAINT
  const pageId = c.req.query("pageId");

  try {
    if (!workspaceId) {
      return c.json({
        success: true,
        data: [],
        totalCount: 0,
        verifiedPhonesCount: 0,
        confirmedBuyersCount: 0,
      });
    }

    let pagesWhere: any = { workspaceId };
    if (pageId && pageId !== "ALL") {
      pagesWhere.id = pageId;
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true, pageId: true },
    });
    const pageIds = pages.map((p) => p.id);

    // Stop cross-tenant data leaks: If workspace has no pages, immediately return empty results
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

// GET /api/contacts/export - Export contacts as CSV
contactsRouter.get("/export", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const pageId = c.req.query("pageId");

  try {
    if (!workspaceId) {
      return c.text("Unauthorized or workspace context missing", 401);
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

    const customers = pageIds.length > 0
      ? await prisma.customer.findMany({
          where: { facebookPageId: { in: pageIds } },
          include: { facebookPage: true },
          orderBy: { updatedAt: "desc" },
        })
      : [];

    const headers = ["Name", "Phone", "Address", "Orders Count", "Total Spent (BDT)", "Sentiment", "Facebook Page", "PSID", "Last Active"];
    const rows = customers.map((c) => {
      let sentiment = "INQUIRY";
      if (c.totalOrders > 0) sentiment = "PURCHASED";
      else if ((c.sentimentScore ?? 0) >= 0.7) sentiment = "HIGH_INTENT";
      else if ((c.sentimentScore ?? 0) < 0) sentiment = "COMPLAINT";

      const escape = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

      return [
        escape(`${c.firstName || ""} ${c.lastName || ""}`.trim() || "Customer"),
        escape(c.phoneNumber || ""),
        escape(c.deliveryAddress || ""),
        c.totalOrders || 0,
        c.totalSpent || 0,
        escape(sentiment),
        escape(c.facebookPage?.name || ""),
        escape(c.psid || ""),
        escape(c.updatedAt ? new Date(c.updatedAt).toISOString() : ""),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mogent_contacts_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return c.text(`Export failed: ${error.message}`, 500);
  }
});

// POST /api/contacts - Create or update a customer contact/lead
contactsRouter.post("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { name, phone, address, pageId, sentiment } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, error: "Customer name is required" }, 400);
    }

    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    let targetPageId = pageId;
    if (!targetPageId || targetPageId === "ALL") {
      const page = await prisma.facebookPage.findFirst({
        where: { workspaceId },
      });
      targetPageId = page?.id;
    }

    if (!targetPageId) {
      // Create a direct store page for this workspace
      const newPage = await prisma.facebookPage.create({
        data: {
          workspaceId,
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
