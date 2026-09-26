import { api } from "./client";

export interface CommentReply {
  id: string;
  authorName: string;
  message: string;
  createdTime: string;
}

export interface FacebookComment {
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
  replies?: CommentReply[];
}

export interface CommentCategoryCounts {
  all: number;
  bad: number;
  spam: number;
  offensive: number;
}

export async function fetchComments(
  tab: string = "ALL",
  search: string = "",
  pageId?: string
): Promise<{
  success: boolean;
  data: FacebookComment[];
  counts: CommentCategoryCounts;
}> {
  const query = new URLSearchParams();
  if (tab) query.set("tab", tab);
  if (search) query.set("search", search);
  if (pageId && pageId !== "ALL") query.set("pageId", pageId);

  const res = await api.get(`/api/comments?${query.toString()}`);
  return {
    success: res?.success ?? false,
    data: res?.data || [],
    counts: res?.counts || { all: 0, bad: 0, spam: 0, offensive: 0 },
  };
}

export async function replyComment(
  commentId: string,
  replyText: string,
  pageId?: string
) {
  return await api.post(`/api/comments/${commentId}/reply`, {
    replyText,
    pageId,
  });
}

export async function toggleHideComment(
  commentId: string,
  isHidden: boolean,
  pageId?: string
) {
  return await api.post(`/api/comments/${commentId}/hide`, {
    isHidden,
    pageId,
  });
}

export async function deleteComment(commentId: string, pageId?: string) {
  const query = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
  return await api.delete(`/api/comments/${commentId}${query}`);
}

export async function generateAiCommentReply(
  commentText: string,
  category: string,
  authorName?: string
) {
  return await api.post("/api/comments/generate-ai-reply", {
    commentText,
    category,
    authorName,
  });
}
