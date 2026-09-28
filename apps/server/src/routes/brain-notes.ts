import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { authMiddleware } from "../middleware/auth";

export const brainNotesRouter = new Hono();

// Enforce auth on all brain note routes
brainNotesRouter.use("*", authMiddleware);

/**
 * GET /api/brain-notes
 * Fetch the living store brain note for a specific page or workspace
 */
brainNotesRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const pageId = c.req.query("pageId");
  const channel = c.req.query("channel") || "ALL";

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    let note = null;

    if (pageId && pageId !== "ALL") {
      note = await prisma.storeBrainNote.findFirst({
        where: { workspaceId, pageId },
      });
    }

    if (!note) {
      // Fallback to workspace-level master note
      note = await prisma.storeBrainNote.findFirst({
        where: { workspaceId, pageId: null },
      });
    }

    // If still no note exists, auto-provision one on demand
    if (!note) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { facebookPages: true },
      });

      let storeName = workspace?.name || "আমাদের অনলাইন শপ";
      let targetPageId: string | null = null;

      if (pageId && pageId !== "ALL") {
        const p = workspace?.facebookPages?.find((pg) => pg.id === pageId);
        if (p) {
          storeName = p.businessName || p.name || storeName;
          targetPageId = p.id;
        }
      }

      const waNumber = workspace?.whatsAppNumber || "01619318941";

      const starterContent = `# 🏪 ${storeName} - স্টোর ব্রেন ও সেলস নোটবুক
*সর্বশেষ আপডেট: Mogent AI Co-Pilot*

## 📦 প্রডাক্ট ও সার্ভিস মূল্য তালিকা
- **PVC ID Card Printing**:
  - বিক্রয় মূল্য: ৳১৫০ (১ পিস)
  - রেগুলার মূল্য: ৳২০০
  - বিবরণ: হাই কোয়ালিটি পিভিসি প্রিন্ট (NID, ড্রাইভিং লাইসেন্স, স্টুডেন্ট আইডি ও অফিস আইডি কার্ড)।

## 🚚 ডেলিভারি চার্জ ও ফ্রি ডেলিভারি অফার
- স্ট্যান্ডার্ড ডেলিভারি চার্জ: ৳৫০
- **স্পেশাল অফার**: ২ বা তার বেশি (২+) কার্ড অর্ডার করলে ডেলিভারি চার্জ সম্পূর্ণ ফ্রি!
- বাল্ক অর্ডার: ৫টির বেশি (৬ বা ততোধিক) কার্ডের ক্ষেত্রে বিশেষ বাল্ক রেটের জন্য হোয়াটসঅ্যাপে নক দিতে বলতে হবে।

## 📞 যোগাযোগ ও অর্ডার নিয়ম
- অফিসিয়াল WhatsApp: ${waNumber}
- হটলাইন / যোগাযোগ: ${workspace?.hotlineNumber || waNumber}
- অর্ডার নেওয়ার নিয়ম: ১ থেকে ৫টি কার্ডের ক্ষেত্রে সরাসরি চ্যাটেই ফাইল/ছবি এবং নাম, মোবাইল ও ডেলিভারি ঠিকানা চেয়ে নিয়ে দ্রুত অর্ডার কনফার্ম করতে হবে।
- ১ থেকে ৫টি কার্ডের জন্য কখনোই অযথা হোয়াটসঅ্যাপে পাঠাবেন না।`;

      note = await prisma.storeBrainNote.create({
        data: {
          workspaceId,
          pageId: targetPageId,
          channel: channel === "WHATSAPP" ? "WHATSAPP" : "MESSENGER",
          title: `${storeName} - Living Store Note`,
          content: starterContent,
          version: 1,
          lastUpdatedBy: "AI_COPILOT",
        },
      });
    }

    return c.json({ success: true, data: note });
  } catch (err: any) {
    console.error("Fetch brain note error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * PUT /api/brain-notes
 * Save direct merchant manual edits from the dashboard notebook editor
 */
brainNotesRouter.put("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const { pageId, content, title, channel } = body;

    if (!content || typeof content !== "string") {
      return c.json({ success: false, error: "Content is required" }, 400);
    }

    let targetPageId = pageId && pageId !== "ALL" ? pageId : null;

    let existing = await prisma.storeBrainNote.findFirst({
      where: {
        workspaceId,
        pageId: targetPageId,
      },
    });

    let updatedNote;
    if (existing) {
      updatedNote = await prisma.storeBrainNote.update({
        where: { id: existing.id },
        data: {
          content: content.trim(),
          title: title || existing.title,
          channel: channel || existing.channel,
          version: existing.version + 1,
          lastUpdatedBy: "MERCHANT",
        },
      });
    } else {
      updatedNote = await prisma.storeBrainNote.create({
        data: {
          workspaceId,
          pageId: targetPageId,
          title: title || "Store Brain & Pricing Note",
          content: content.trim(),
          channel: channel || "ALL",
          version: 1,
          lastUpdatedBy: "MERCHANT",
        },
      });
    }

    // Backwards-compatible sync: If note mentions price, update Product table as well
    const priceMatch = content.match(/(?:বিক্রয়\s*মূল্য|মূল্য|দাম|price)\s*[:=]?\s*৳?\s*(\d{2,6})/i);
    if (priceMatch && priceMatch[1]) {
      const parsedPrice = Number(priceMatch[1]);
      await prisma.product.updateMany({
        where: {
          workspaceId,
          OR: [
            { name: { contains: "PVC", mode: "insensitive" } },
            { name: { contains: "Card", mode: "insensitive" } },
          ],
        },
        data: { price: parsedPrice },
      });
    }

    return c.json({
      success: true,
      data: updatedNote,
      message: "স্টোর ব্রেন নোট সফলভাবে সংরক্ষিত হয়েছে!",
    });
  } catch (err: any) {
    console.error("Save brain note error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});
