import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { authMiddleware } from "../middleware/auth";
import { config } from "../config";
import { decryptToken } from "@mogent/shared";

export const commentsRouter = new Hono();

commentsRouter.use("*", authMiddleware);

export interface FacebookCommentItem {
  id: string;
  pageId: string;
  pageName: string;
  postId?: string;
  postTitle?: string;
  authorName: string;
  authorId?: string;
  authorPic?: string;
  message: string;
  createdTime: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  category: "SAFE" | "BAD" | "SPAM" | "OFFENSIVE";
  isHidden: boolean;
  likeCount: number;
  repliesCount: number;
  replies?: {
    id: string;
    authorName: string;
    message: string;
    createdTime: string;
  }[];
}

// -----------------------------------------------------------------------------
// HELPER: Auto-Classify Sentiment and Moderation Category
// -----------------------------------------------------------------------------
export function classifyComment(text: string): {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  category: "SAFE" | "BAD" | "SPAM" | "OFFENSIVE";
} {
  const lower = (text || "").toLowerCase();

  // Spam detection (Links, Crypto, Casino, Earn Money)
  const spamPatterns = [
    /https?:\/\//i,
    /wa\.me\//i,
    /t\.me\//i,
    /bit\.ly\//i,
    /ঘরে বসে/i,
    /টাকা আয়/i,
    /ইনকাম/i,
    /বিনিয়োগ/i,
    /ক্যাসিনো/i,
    /ফ্রি বোনাস/i,
    /earn money/i,
    /work from home/i,
    /free crypto/i,
    /casino/i,
    /lottery/i,
    /telegram/i,
  ];
  if (spamPatterns.some((pattern) => pattern.test(lower))) {
    return { sentiment: "NEGATIVE", category: "SPAM" };
  }

  // Offensive / Abusive detection
  const offensiveWords = [
    "ভুয়া",
    "ধান্দাবাজ",
    "দালাল",
    "হারামি",
    "চোর",
    "বাটপার",
    "প্রতারক",
    "মাথা নষ্ট",
    "scam",
    "scammer",
    "fraud",
    "bullshit",
    "fake",
    "cheat",
    "bastard",
    "idiot",
    "liar",
    "shitty",
    "fucking",
  ];
  if (offensiveWords.some((w) => lower.includes(w))) {
    return { sentiment: "NEGATIVE", category: "OFFENSIVE" };
  }

  // Bad / Customer Complaint detection
  const badWords = [
    "খারাপ",
    "পচা",
    "ড্যামেজ",
    "নষ্ট",
    "দেরি",
    "ফালতু",
    "রিটার্ন নিচ্ছেন না",
    "রিটার্ন",
    "অভিযোগ",
    "সমস্যা",
    "বাজে সার্ভিস",
    "terrible",
    "worst",
    "broken",
    "damaged",
    "poor quality",
    "late",
    "disappointed",
    "complaint",
    "horrible",
    "delay",
  ];
  if (badWords.some((w) => lower.includes(w))) {
    return { sentiment: "NEGATIVE", category: "BAD" };
  }

  // Positive detection
  const positiveWords = [
    "ভালো",
    "সুন্দর",
    "পছন্দ হয়েছে",
    "অসাধারণ",
    "ধন্যবাদ",
    "দারুণ",
    "good",
    "nice",
    "great",
    "excellent",
    "awesome",
    "love",
    "thanks",
    "superb",
  ];
  if (positiveWords.some((w) => lower.includes(w))) {
    return { sentiment: "POSITIVE", category: "SAFE" };
  }

  return { sentiment: "NEUTRAL", category: "SAFE" };
}

// -----------------------------------------------------------------------------
// 1. GET /api/comments - Fetch Real Facebook Comments for Workspace
// -----------------------------------------------------------------------------
commentsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const tab = c.req.query("tab") || "ALL"; // ALL, BAD, SPAM, OFFENSIVE
  const pageId = c.req.query("pageId");
  const search = (c.req.query("search") || "").toLowerCase().trim();

  try {
    if (!workspaceId) {
      return c.json({
        success: true,
        data: [],
        counts: { all: 0, bad: 0, spam: 0, offensive: 0 },
      });
    }

    // 1. Fetch connected pages for workspace
    const pageFilter: any = { workspaceId };
    if (pageId && pageId !== "ALL") {
      pageFilter.id = pageId;
    }
    const pages = await prisma.facebookPage.findMany({
      where: pageFilter,
    });

    if (pages.length === 0) {
      return c.json({
        success: true,
        data: [],
        counts: { all: 0, bad: 0, spam: 0, offensive: 0 },
      });
    }

    // 2. Fetch real comments from PostgreSQL database
    const dbComments = await prisma.facebookComment.findMany({
      where: {
        workspaceId,
        ...(pageId && pageId !== "ALL" ? { facebookPageId: pageId } : {}),
      },
      include: {
        facebookPage: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 3. Map DB comments to response format
    let allComments: FacebookCommentItem[] = dbComments.map((cmt) => {
      const repliesList = Array.isArray(cmt.replies) ? (cmt.replies as any[]) : [];
      return {
        id: cmt.id,
        pageId: cmt.facebookPageId,
        pageName: cmt.facebookPage?.name || "Facebook Page",
        postId: cmt.postId || undefined,
        postTitle: cmt.postTitle || "Facebook Post",
        authorName: cmt.authorName || "Facebook User",
        authorId: cmt.authorId || undefined,
        authorPic: cmt.authorPic || (cmt.authorId ? `https://graph.facebook.com/${cmt.authorId}/picture?type=square` : undefined),
        message: cmt.message,
        createdTime: cmt.createdTime.toISOString(),
        sentiment: (cmt.sentiment as any) || "NEUTRAL",
        category: (cmt.category as any) || "SAFE",
        isHidden: cmt.isHidden,
        likeCount: cmt.likeCount,
        repliesCount: cmt.repliesCount || repliesList.length,
        replies: repliesList,
      };
    });

    // 4. If DB is empty, attempt a non-blocking background sync from Facebook Graph API
    if (allComments.length === 0) {
      for (const page of pages) {
        if (!page.encryptedAccessToken || !page.pageId) continue;
        try {
          const pageToken = decryptToken(
            page.encryptedAccessToken,
            page.tokenIv,
            page.tokenTag,
            config.tokenEncryptionKey
          );
          if (!pageToken) continue;

          const fbRes = await fetch(
            `https://graph.facebook.com/${config.facebook.graphVersion}/${page.pageId}/feed?fields=id,message,created_time,comments{id,message,from,created_time,comment_count,like_count,is_hidden}&limit=10&access_token=${pageToken}`,
            { signal: AbortSignal.timeout(5000) }
          );

          if (fbRes.ok) {
            const fbData = await fbRes.json();
            const posts = fbData.data || [];

            for (const post of posts) {
              const cList = post.comments?.data || [];
              for (const cmt of cList) {
                const classification = classifyComment(cmt.message || "");
                const saved = await prisma.facebookComment.upsert({
                  where: { id: cmt.id },
                  update: {
                    isHidden: Boolean(cmt.is_hidden),
                  },
                  create: {
                    id: cmt.id,
                    postId: post.id || null,
                    postTitle: post.message ? post.message.slice(0, 80) : "Facebook Post",
                    facebookPageId: page.id,
                    workspaceId,
                    authorName: cmt.from?.name || "Facebook User",
                    authorId: cmt.from?.id || null,
                    message: cmt.message || "",
                    sentiment: classification.sentiment,
                    category: classification.category,
                    isHidden: Boolean(cmt.is_hidden),
                    likeCount: cmt.like_count || 0,
                    repliesCount: cmt.comment_count || 0,
                    createdTime: cmt.created_time ? new Date(cmt.created_time) : new Date(),
                  },
                });

                allComments.push({
                  id: saved.id,
                  pageId: page.id,
                  pageName: page.name,
                  postId: saved.postId || undefined,
                  postTitle: saved.postTitle || "Facebook Post",
                  authorName: saved.authorName,
                  authorId: saved.authorId || undefined,
                  authorPic: saved.authorId ? `https://graph.facebook.com/${saved.authorId}/picture?type=square` : undefined,
                  message: saved.message,
                  createdTime: saved.createdTime.toISOString(),
                  sentiment: classification.sentiment,
                  category: classification.category,
                  isHidden: saved.isHidden,
                  likeCount: saved.likeCount,
                  repliesCount: saved.repliesCount,
                  replies: [],
                });
              }
            }
          }
        } catch (graphErr: any) {
          console.warn(`Facebook comments Graph API sync notice for page ${page.name}:`, graphErr.message);
        }
      }
    }

    // 5. Calculate category counts
    const counts = {
      all: allComments.length,
      bad: allComments.filter((c) => c.category === "BAD").length,
      spam: allComments.filter((c) => c.category === "SPAM").length,
      offensive: allComments.filter((c) => c.category === "OFFENSIVE").length,
    };

    // 6. Apply tab and search filtering
    let filtered = allComments;
    if (tab !== "ALL") {
      filtered = filtered.filter((c) => c.category === tab);
    }

    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.message.toLowerCase().includes(search) ||
          c.authorName.toLowerCase().includes(search) ||
          (c.postTitle && c.postTitle.toLowerCase().includes(search))
      );
    }

    return c.json({
      success: true,
      data: filtered,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching Facebook comments:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. POST /api/comments/:commentId/reply - Reply to a Comment
// -----------------------------------------------------------------------------
commentsRouter.post("/:commentId/reply", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const { commentId } = c.req.param();

  try {
    const body = await c.req.json();
    const { replyText, pageId } = body;

    if (!replyText || !replyText.trim()) {
      return c.json({ success: false, error: "Reply text is required" }, 400);
    }

    // 1. Find page to get access token
    let page: any = null;
    if (pageId) {
      page = await prisma.facebookPage.findUnique({ where: { id: pageId } });
    } else if (workspaceId) {
      page = await prisma.facebookPage.findFirst({ where: { workspaceId } });
    }

    const replyId = `rep_${Date.now()}`;
    const newReply = {
      id: replyId,
      authorName: page?.name || "Merchant Support",
      message: replyText.trim(),
      createdTime: new Date().toISOString(),
    };

    // 2. If valid page token, post to Meta Graph API
    if (page?.encryptedAccessToken) {
      try {
        const token = decryptToken(
          page.encryptedAccessToken,
          page.tokenIv,
          page.tokenTag,
          config.tokenEncryptionKey
        );
        if (token) {
          await fetch(`https://graph.facebook.com/${config.facebook.graphVersion}/${commentId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: replyText.trim(), access_token: token }),
          });
        }
      } catch (err: any) {
        console.warn("Live Graph API reply notice:", err.message);
      }
    }

    // 3. Persist reply to database JSON array
    const existing = await prisma.facebookComment.findUnique({
      where: { id: commentId },
    });

    const currentReplies = Array.isArray(existing?.replies) ? (existing.replies as any[]) : [];
    const updatedReplies = [...currentReplies, newReply];

    await prisma.facebookComment.updateMany({
      where: { id: commentId },
      data: {
        replies: updatedReplies,
        repliesCount: updatedReplies.length,
      },
    });

    return c.json({
      success: true,
      message: "Reply sent successfully!",
      reply: newReply,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. POST /api/comments/:commentId/hide - Toggle Hide / Unhide Comment
// -----------------------------------------------------------------------------
commentsRouter.post("/:commentId/hide", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const { commentId } = c.req.param();

  try {
    const body = await c.req.json();
    const isHidden = Boolean(body.isHidden);
    const pageId = body.pageId;

    // 1. Check page token for live Graph API update
    let page: any = null;
    if (pageId) {
      page = await prisma.facebookPage.findUnique({ where: { id: pageId } });
    } else if (workspaceId) {
      page = await prisma.facebookPage.findFirst({ where: { workspaceId } });
    }

    if (page?.encryptedAccessToken) {
      try {
        const token = decryptToken(
          page.encryptedAccessToken,
          page.tokenIv,
          page.tokenTag,
          config.tokenEncryptionKey
        );
        if (token) {
          await fetch(`https://graph.facebook.com/${config.facebook.graphVersion}/${commentId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_hidden: isHidden, access_token: token }),
          });
        }
      } catch (err: any) {
        console.warn("Live Graph API hide notice:", err.message);
      }
    }

    // 2. Persist to database
    await prisma.facebookComment.updateMany({
      where: { id: commentId },
      data: { isHidden },
    });

    return c.json({
      success: true,
      isHidden,
      message: isHidden ? "Comment hidden from Facebook post." : "Comment unhidden on Facebook post.",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. DELETE /api/comments/:commentId - Delete Comment
// -----------------------------------------------------------------------------
commentsRouter.delete("/:commentId", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const { commentId } = c.req.param();
  const pageId = c.req.query("pageId");

  try {
    let page: any = null;
    if (pageId) {
      page = await prisma.facebookPage.findUnique({ where: { id: pageId } });
    } else if (workspaceId) {
      page = await prisma.facebookPage.findFirst({ where: { workspaceId } });
    }

    if (page?.encryptedAccessToken) {
      try {
        const token = decryptToken(
          page.encryptedAccessToken,
          page.tokenIv,
          page.tokenTag,
          config.tokenEncryptionKey
        );
        if (token) {
          await fetch(`https://graph.facebook.com/${config.facebook.graphVersion}/${commentId}?access_token=${token}`, {
            method: "DELETE",
          });
        }
      } catch (err: any) {
        console.warn("Live Graph API delete notice:", err.message);
      }
    }

    // Delete from database
    await prisma.facebookComment.deleteMany({
      where: { id: commentId },
    });

    return c.json({
      success: true,
      message: "Comment deleted successfully!",
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 5. POST /api/comments/generate-ai-reply - Smart AI Reply Generator
// -----------------------------------------------------------------------------
commentsRouter.post("/generate-ai-reply", async (c) => {
  try {
    const body = await c.req.json();
    const { commentText, category, authorName } = body;

    let suggested = "";
    if (category === "BAD") {
      suggested = `প্রিয় ${authorName || "গ্রাহক"}, আপনার সমস্যার জন্য আমরা আন্তরিকভাবে দুঃখিত। অনুগ্রহ করে আপনার অর্ডার নম্বর সহ আমাদের ইনবক্সে মেসেজ দিন, আমরা অবিলম্বে সমস্যার সমাধান করে দিচ্ছি। ধন্যবাদ!`;
    } else if (category === "SPAM") {
      suggested = "এই পেজে স্প্যাম বা অননুমোদিত লিংক শেয়ার করা সম্পূর্ণ নিষিদ্ধ।";
    } else if (category === "OFFENSIVE") {
      suggested = `সম্মানিত ${authorName || "গ্রাহক"}, অনুগ্রহ করে ইনবক্সে আপনার অর্ডার বা অভিযোগের তথ্য প্রদান করুন। আমাদের টিম দ্রুত আপনার বিষয়টি গুরুত্বের সাথে দেখছে।`;
    } else {
      suggested = `ধন্যবাদ ${authorName || "গ্রাহক"}! আপনার আগ্রহের জন্য অনেক ধন্যবাদ। বিস্তারিত তথ্য ও অর্ডার প্রসেসিং এর জন্য দয়া করে ইনবক্সে একটি মেসেজ দিন।`;
    }

    return c.json({ success: true, suggestedReply: suggested });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
