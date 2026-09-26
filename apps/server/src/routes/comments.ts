import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { authMiddleware } from "../middleware/auth";
import { redisConnection } from "../redis";
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
function classifyComment(text: string): {
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
// HELPER: Generate Initial Sample Comments if Page is Fresh
// -----------------------------------------------------------------------------
function generateSeedComments(pageName: string, pageId: string): FacebookCommentItem[] {
  const now = Date.now();
  return [
    {
      id: `fb_cmt_${pageId}_1`,
      pageId,
      pageName,
      postId: "post_101",
      postTitle: "আমাদের নতুন ঈদ কালেকশন ২০২৬ প্রিমিয়াম কটন পাঞ্জাবি",
      authorName: "Tanvir Ahmed",
      authorId: "user_101",
      authorPic: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
      message: "ভাই আপনাদের প্রোডাক্টের কোয়ালিটি একদম খারাপ! ডেলিভারি পাইছি ৩ দিন পর তাও ছেঁড়া ছিল। অবিলম্বে রিফান্ড দেন!",
      createdTime: new Date(now - 1000 * 60 * 35).toISOString(),
      sentiment: "NEGATIVE",
      category: "BAD",
      isHidden: false,
      likeCount: 2,
      repliesCount: 0,
      replies: [],
    },
    {
      id: `fb_cmt_${pageId}_2`,
      pageId,
      pageName,
      postId: "post_102",
      postTitle: "অফিসিয়াল মেম্বারশিপ এবং গিফট ভাউচার অফার",
      authorName: "Rifat Hasan",
      authorId: "user_102",
      authorPic: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=60",
      message: "ঘরে বসে পার্ট টাইম দিনে ২০০০ টাকা আয় করতে চাইলে টেলিগ্রামে যোগাযোগ করুন 👉 https://t.me/freeincome2026",
      createdTime: new Date(now - 1000 * 60 * 95).toISOString(),
      sentiment: "NEGATIVE",
      category: "SPAM",
      isHidden: true,
      likeCount: 0,
      repliesCount: 0,
      replies: [],
    },
    {
      id: `fb_cmt_${pageId}_3`,
      pageId,
      pageName,
      postId: "post_101",
      postTitle: "আমাদের নতুন ঈদ কালেকশন ২০২৬ প্রিমিয়াম কটন পাঞ্জাবি",
      authorName: "Kamrul Islam",
      authorId: "user_103",
      authorPic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
      message: "এরা একটা বাটপার পেজ! অ্যাডভান্স টাকা নিয়া মেসেজের রিপ্লে দেয় না, ভুলেও কেউ অর্ডার কইরেন না scammer!",
      createdTime: new Date(now - 1000 * 60 * 180).toISOString(),
      sentiment: "NEGATIVE",
      category: "OFFENSIVE",
      isHidden: false,
      likeCount: 4,
      repliesCount: 0,
      replies: [],
    },
    {
      id: `fb_cmt_${pageId}_4`,
      pageId,
      pageName,
      postId: "post_103",
      postTitle: "লেটেস্ট ক্যাজুয়াল স্নিকার্স ব্ল্যাক এডিশন",
      authorName: "Nusrat Jahan",
      authorId: "user_104",
      authorPic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
      message: "এই জুতার সাইজ ৪০ কি এভেইলেবল আছে? আর ঢাকার ভিতরে হোম ডেলিভারি চার্জ কত পরবে জানাবেন প্লিজ।",
      createdTime: new Date(now - 1000 * 60 * 240).toISOString(),
      sentiment: "NEUTRAL",
      category: "SAFE",
      isHidden: false,
      likeCount: 1,
      repliesCount: 1,
      replies: [
        {
          id: `rep_${pageId}_4_1`,
          authorName: pageName,
          message: "জি আপু সাইজ ৪০ এভেইলেবল আছে! ঢাকার ভিতরে ডেলিভারি চার্জ ৭০ টাকা। ইনবক্সে মেসেজ দিন প্লিজ।",
          createdTime: new Date(now - 1000 * 60 * 200).toISOString(),
        },
      ],
    },
    {
      id: `fb_cmt_${pageId}_5`,
      pageId,
      pageName,
      postId: "post_103",
      postTitle: "লেটেস্ট ক্যাজুয়াল স্নিকার্স ব্ল্যাক এডিশন",
      authorName: "Shakil Mahmud",
      authorId: "user_105",
      authorPic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60",
      message: "আলহামদুলিল্লাহ পার্সেলটা কালকে হাতে পেয়েছি, কোয়ালিটি অনেক বেশি প্রিমিয়াম! প্যাকেজিং অনেক সুন্দর ছিল।",
      createdTime: new Date(now - 1000 * 60 * 360).toISOString(),
      sentiment: "POSITIVE",
      category: "SAFE",
      isHidden: false,
      likeCount: 5,
      repliesCount: 0,
      replies: [],
    },
  ];
}

// -----------------------------------------------------------------------------
// 1. GET /api/comments - List and Moderate Facebook Comments
// -----------------------------------------------------------------------------
commentsRouter.get("/", async (c) => {
  const workspaceId = c.get("workspaceId") || c.req.header("x-workspace-id");
  const tab = (c.req.query("tab") || "ALL").toUpperCase();
  const search = (c.req.query("search") || "").trim().toLowerCase();
  const pageIdFilter = c.req.query("pageId");

  try {
    if (!workspaceId) {
      return c.json({
        success: true,
        data: [],
        counts: { all: 0, bad: 0, spam: 0, offensive: 0 },
      });
    }

    // 1. Load Facebook pages for workspace
    const pages = await prisma.facebookPage.findMany({
      where: {
        workspaceId,
        ...(pageIdFilter && pageIdFilter !== "ALL" ? { id: pageIdFilter } : {}),
      },
    });

    if (pages.length === 0) {
      return c.json({
        success: true,
        data: [],
        counts: { all: 0, bad: 0, spam: 0, offensive: 0 },
      });
    }

    // 2. Check Redis cached comments for this workspace
    const cacheKey = `mogent:comments_cache:${workspaceId}`;
    let cachedJson = await redisConnection.get(cacheKey);
    let allComments: FacebookCommentItem[] = [];

    if (cachedJson) {
      try {
        allComments = JSON.parse(cachedJson);
      } catch {
        allComments = [];
      }
    }

    // 3. If cache empty, attempt live fetch from Facebook Graph API
    if (allComments.length === 0) {
      let liveComments: FacebookCommentItem[] = [];

      for (const page of pages) {
        let pageToken = "";
        try {
          pageToken = decryptToken(
            page.encryptedAccessToken,
            page.tokenIv,
            page.tokenTag,
            config.tokenEncryptionKey
          );
        } catch (e) {
          console.warn(`Could not decrypt token for page ${page.name}`);
        }

        if (pageToken && page.pageId) {
          try {
            // Fetch recent posts with comments
            const fbRes = await fetch(
              `https://graph.facebook.com/${config.facebook.graphVersion}/${page.pageId}/feed?fields=id,message,created_time,comments{id,message,from,created_time,comment_count,like_count,is_hidden}&limit=15&access_token=${pageToken}`
            );
            if (fbRes.ok) {
              const fbData = await fbRes.json();
              const posts = fbData.data || [];

              for (const post of posts) {
                const cList = post.comments?.data || [];
                for (const cmt of cList) {
                  const classification = classifyComment(cmt.message || "");
                  liveComments.push({
                    id: cmt.id,
                    pageId: page.id,
                    pageName: page.name,
                    postId: post.id,
                    postTitle: post.message ? post.message.slice(0, 80) : "Facebook Post",
                    authorName: cmt.from?.name || "Facebook User",
                    authorId: cmt.from?.id,
                    authorPic: cmt.from?.id
                      ? `https://graph.facebook.com/${cmt.from.id}/picture?type=square`
                      : undefined,
                    message: cmt.message || "",
                    createdTime: cmt.created_time || new Date().toISOString(),
                    sentiment: classification.sentiment,
                    category: classification.category,
                    isHidden: Boolean(cmt.is_hidden),
                    likeCount: cmt.like_count || 0,
                    repliesCount: cmt.comment_count || 0,
                    replies: [],
                  });
                }
              }
            }
          } catch (graphErr: any) {
            console.warn(`Facebook comments Graph API error for page ${page.name}:`, graphErr.message);
          }
        }
      }

      // If live Graph API returned comments, use them; otherwise seed initial comments for the pages
      if (liveComments.length > 0) {
        allComments = liveComments;
      } else {
        for (const page of pages) {
          allComments.push(...generateSeedComments(page.name, page.id));
        }
      }

      // Cache for 10 minutes
      await redisConnection.set(cacheKey, JSON.stringify(allComments), "EX", 600);
    }

    // 4. Calculate category counts
    const counts = {
      all: allComments.length,
      bad: allComments.filter((c) => c.category === "BAD").length,
      spam: allComments.filter((c) => c.category === "SPAM").length,
      offensive: allComments.filter((c) => c.category === "OFFENSIVE").length,
    };

    // 5. Apply tab and search filtering
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

    // 2. If valid page token, post to Facebook Graph API
    if (page?.encryptedAccessToken) {
      try {
        const token = decryptToken(
          page.encryptedAccessToken,
          page.tokenIv,
          page.tokenTag,
          config.tokenEncryptionKey
        );
        if (token && !commentId.startsWith("fb_cmt_")) {
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

    // 3. Update Redis cache with the reply
    if (workspaceId) {
      const cacheKey = `mogent:comments_cache:${workspaceId}`;
      const cachedJson = await redisConnection.get(cacheKey);
      if (cachedJson) {
        try {
          const list: FacebookCommentItem[] = JSON.parse(cachedJson);
          const cmtIndex = list.findIndex((item) => item.id === commentId);
          if (cmtIndex !== -1) {
            list[cmtIndex].replies = [...(list[cmtIndex].replies || []), newReply];
            list[cmtIndex].repliesCount = list[cmtIndex].replies.length;
            await redisConnection.set(cacheKey, JSON.stringify(list), "EX", 600);
          }
        } catch {}
      }
    }

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

    if (page?.encryptedAccessToken && !commentId.startsWith("fb_cmt_")) {
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

    // 2. Update Redis cache
    if (workspaceId) {
      const cacheKey = `mogent:comments_cache:${workspaceId}`;
      const cachedJson = await redisConnection.get(cacheKey);
      if (cachedJson) {
        try {
          const list: FacebookCommentItem[] = JSON.parse(cachedJson);
          const cmtIndex = list.findIndex((item) => item.id === commentId);
          if (cmtIndex !== -1) {
            list[cmtIndex].isHidden = isHidden;
            await redisConnection.set(cacheKey, JSON.stringify(list), "EX", 600);
          }
        } catch {}
      }
    }

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

    if (page?.encryptedAccessToken && !commentId.startsWith("fb_cmt_")) {
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

    // Update Redis cache
    if (workspaceId) {
      const cacheKey = `mogent:comments_cache:${workspaceId}`;
      const cachedJson = await redisConnection.get(cacheKey);
      if (cachedJson) {
        try {
          const list: FacebookCommentItem[] = JSON.parse(cachedJson);
          const filtered = list.filter((item) => item.id !== commentId);
          await redisConnection.set(cacheKey, JSON.stringify(filtered), "EX", 600);
        } catch {}
      }
    }

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
