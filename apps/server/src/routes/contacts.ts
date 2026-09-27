import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { authMiddleware } from "../middleware/auth";
import { formatBdTime } from "../utils/timezone";

export const contactsRouter = new Hono();

// Enforce auth on contacts routes
contactsRouter.use("*", authMiddleware);

// GET /api/contacts - List customer contacts for active workspace
contactsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const filter = c.req.query("filter"); // ALL, PHONE, PURCHASED, COMPLAINT
  const pageId = c.req.query("pageId");
  const search = (c.req.query("search") || "").trim();
  const isAll = c.req.query("all") === "true";
  const limitParam = c.req.query("limit");
  const limit = limitParam ? parseInt(limitParam) : undefined;

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

    // Non-blocking self-healing: ensure customers with conversations in this workspace are linked
    await prisma.customer.updateMany({
      where: {
        workspaceId: null,
        conversations: {
          some: { workspaceId },
        },
      },
      data: { workspaceId },
    }).catch(() => {});

    let pagesWhere: any = { workspaceId };
    if (pageId && pageId !== "ALL") {
      pagesWhere.id = pageId;
    }

    const pages = await prisma.facebookPage.findMany({
      where: pagesWhere,
      select: { id: true, name: true, pageId: true },
    });
    const pageIds = pages.map((p) => p.id);

    const baseWhere: any = {
      OR: [
        { workspaceId },
        ...(pageIds.length > 0 ? [{ facebookPageId: { in: pageIds } }] : []),
        {
          conversations: {
            some: {
              OR: [
                { workspaceId },
                ...(pageIds.length > 0 ? [{ facebookPageId: { in: pageIds } }] : []),
              ],
            },
          },
        },
      ],
    };

    const where: any = {
      ...baseWhere,
    };

    if (filter === "PHONE") {
      where.phoneNumber = { not: null };
    } else if (filter === "PURCHASED") {
      where.totalOrders = { gt: 0 };
    } else if (filter === "COMPLAINT") {
      where.sentimentScore = { lt: 0 };
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phoneNumber: { contains: search } },
            { psid: { contains: search } },
            { deliveryAddress: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [totalCount, verifiedPhonesCount, confirmedBuyersCount, customers] = await Promise.all([
      prisma.customer.count({ where: baseWhere }),
      prisma.customer.count({ where: { ...baseWhere, phoneNumber: { not: null } } }),
      prisma.customer.count({ where: { ...baseWhere, totalOrders: { gt: 0 } } }),
      prisma.customer.findMany({
        where,
        include: { facebookPage: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
        ...(limit ? { take: limit } : {}),
      }),
    ]);

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
        lastActive: formatBdTime(cust.updatedAt),
        psid: cust.psid,
        profilePic: cust.profilePic,
        pageId: cust.facebookPageId,
        pageName: cust.facebookPage?.name || (cust.channel === "WHATSAPP" ? "WhatsApp" : "Direct Store"),
      };
    });

    return c.json({
      success: true,
      data: mapped,
      totalCount,
      verifiedPhonesCount,
      confirmedBuyersCount,
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

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { workspaceId },
          ...(pageIds.length > 0 ? [{ facebookPageId: { in: pageIds } }] : []),
          {
            conversations: {
              some: {
                OR: [
                  { workspaceId },
                  ...(pageIds.length > 0 ? [{ facebookPageId: { in: pageIds } }] : []),
                ],
              },
            },
          },
        ],
      },
      include: { facebookPage: true },
      orderBy: { updatedAt: "desc" },
    });

    const headers = ["Name", "Phone", "Address", "Orders Count", "Total Spent (BDT)", "Sentiment", "Channel", "Facebook Page", "PSID", "Last Active"];
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
        escape(c.channel || "MESSENGER"),
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
    const { name, phone, address, pageId, sentiment, channel } = body;

    if (!name || !name.trim()) {
      return c.json({ success: false, error: "Customer name is required" }, 400);
    }

    if (!workspaceId) {
      return c.json({ success: false, error: "Workspace context is required" }, 400);
    }

    let targetPageId = pageId && pageId !== "ALL" ? pageId : null;
    if (!targetPageId) {
      const page = await prisma.facebookPage.findFirst({
        where: { workspaceId },
      });
      targetPageId = page?.id || null;
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
      customer = await prisma.customer.findFirst({
        where: {
          workspaceId,
          phoneNumber: cleanPhone,
        },
      });

      if (customer) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            firstName,
            lastName,
            deliveryAddress: cleanAddress || customer.deliveryAddress,
            sentimentScore,
            facebookPageId: targetPageId || customer.facebookPageId,
          },
          include: { facebookPage: true },
        });
      }
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          workspaceId,
          facebookPageId: targetPageId,
          channel: channel || (cleanPhone ? "WHATSAPP" : "MESSENGER"),
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
        pageName: customer.facebookPage?.name || (customer.channel === "WHATSAPP" ? "WhatsApp" : "Direct Store"),
      },
      message: "Lead saved successfully!",
    });
  } catch (error: any) {
    console.error("Create contact error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
