"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  Send,
  CornerDownRight,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ThumbsUp,
  Loader2,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { formatBdTime } from "@/lib/timezone";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  fetchComments,
  replyComment,
  toggleHideComment,
  deleteComment,
  generateAiCommentReply,
  fetchPages,
  FacebookComment,
  CommentCategoryCounts,
} from "@/lib/api";

type TabType = "ALL" | "BAD" | "SPAM" | "OFFENSIVE";

export default function FacebookCommentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [comments, setComments] = useState<FacebookComment[]>([]);
  const [counts, setCounts] = useState<CommentCategoryCounts>({
    all: 0,
    bad: 0,
    spam: 0,
    offensive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");

  // Replying state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState<Record<string, boolean>>({});
  const [isGeneratingAi, setIsGeneratingAi] = useState<Record<string, boolean>>({});

  // Action states
  const [isTogglingHide, setIsTogglingHide] = useState<Record<string, boolean>>({});
  const [deleteCommentItem, setDeleteCommentItem] = useState<FacebookComment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load connected pages
  useEffect(() => {
    fetchPages()
      .then((pList) => {
        if (Array.isArray(pList)) {
          setPages(pList);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch comments whenever tab, search, or selected page changes
  const loadComments = async (isSilent: boolean = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetchComments(activeTab, searchQuery, selectedPageId);
      if (res?.success) {
        setComments(res.data);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err: any) {
      toast.error("Failed to load Facebook comments.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [activeTab, selectedPageId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadComments();
  };

  // Reply handler
  const handleSendReply = async (comment: FacebookComment) => {
    const text = (replyTextMap[comment.id] || "").trim();
    if (!text) {
      toast.error("Please enter a reply message.");
      return;
    }

    setIsSendingReply((prev) => ({ ...prev, [comment.id]: true }));
    try {
      const res = await replyComment(comment.id, text, comment.pageId);
      if (res?.success) {
        toast.success("Reply posted successfully!");
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === comment.id) {
              const newReply = res.reply || {
                id: `rep_${Date.now()}`,
                authorName: c.pageName,
                message: text,
                createdTime: new Date().toISOString(),
              };
              return {
                ...c,
                replies: [...(c.replies || []), newReply],
                repliesCount: (c.repliesCount || 0) + 1,
              };
            }
            return c;
          })
        );
        setReplyTextMap((prev) => ({ ...prev, [comment.id]: "" }));
        setReplyingCommentId(null);
      } else {
        toast.error(res?.error || "Failed to send reply.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply.");
    } finally {
      setIsSendingReply((prev) => ({ ...prev, [comment.id]: false }));
    }
  };

  // Smart AI Reply suggestion
  const handleAiSuggest = async (comment: FacebookComment) => {
    setIsGeneratingAi((prev) => ({ ...prev, [comment.id]: true }));
    setReplyingCommentId(comment.id);
    try {
      const res = await generateAiCommentReply(
        comment.message,
        comment.category,
        comment.authorName
      );
      if (res?.success && res.suggestedReply) {
        setReplyTextMap((prev) => ({
          ...prev,
          [comment.id]: res.suggestedReply,
        }));
        toast.success("AI draft generated!");
      }
    } catch {
      toast.error("Failed to generate AI suggestion.");
    } finally {
      setIsGeneratingAi((prev) => ({ ...prev, [comment.id]: false }));
    }
  };

  // Hide / Unhide handler
  const handleToggleHide = async (comment: FacebookComment) => {
    const nextHiddenState = !comment.isHidden;
    setIsTogglingHide((prev) => ({ ...prev, [comment.id]: true }));
    try {
      const res = await toggleHideComment(comment.id, nextHiddenState, comment.pageId);
      if (res?.success) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === comment.id ? { ...c, isHidden: nextHiddenState } : c
          )
        );
        toast.success(
          nextHiddenState
            ? "Comment hidden from Facebook post."
            : "Comment unhidden on Facebook post."
        );
      } else {
        toast.error(res?.error || "Could not toggle hide state.");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not toggle hide state.");
    } finally {
      setIsTogglingHide((prev) => ({ ...prev, [comment.id]: false }));
    }
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!deleteCommentItem) return;
    setIsDeleting(true);
    try {
      const res = await deleteComment(deleteCommentItem.id, deleteCommentItem.pageId);
      if (res?.success) {
        toast.success("Comment deleted successfully!");
        setComments((prev) => prev.filter((c) => c.id !== deleteCommentItem.id));
        setCounts((prev) => ({
          ...prev,
          all: Math.max(0, prev.all - 1),
          bad: deleteCommentItem.category === "BAD" ? Math.max(0, prev.bad - 1) : prev.bad,
          spam: deleteCommentItem.category === "SPAM" ? Math.max(0, prev.spam - 1) : prev.spam,
          offensive: deleteCommentItem.category === "OFFENSIVE" ? Math.max(0, prev.offensive - 1) : prev.offensive,
        }));
        setDeleteCommentItem(null);
      } else {
        toast.error(res?.error || "Failed to delete comment.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Page Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Facebook Comments Moderation</h1>
          <p className="text-xs text-[#6B7280]">
            Monitor, auto-classify spam & abusive comments, and reply with AI directly.
          </p>
        </div>

        {pages.length > 0 && (
          <div className="flex items-center gap-2">
            <Facebook className="w-4 h-4 text-[#1877F2]" />
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="text-xs px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#374151] font-medium focus:outline-none focus:border-[#F59E0B]"
            >
              <option value="ALL">All Connected Pages</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm w-fit flex-wrap">
          <button
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "ALL"
                ? "bg-[#FFFDF5] text-[#D97706] font-bold border border-[#FDE68A] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            )}
          >
            <span>All Comments</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                activeTab === "ALL"
                  ? "bg-[#F59E0B] text-black font-bold"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              )}
            >
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("BAD")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "BAD"
                ? "bg-[#FFFDF5] text-[#D97706] font-bold border border-[#FDE68A] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
            <span>Bad</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                activeTab === "BAD"
                  ? "bg-[#F59E0B] text-black font-bold"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              )}
            >
              {counts.bad}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("SPAM")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "SPAM"
                ? "bg-[#FFFDF5] text-[#D97706] font-bold border border-[#FDE68A] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-[#EA580C]"></span>
            <span>Spam</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                activeTab === "SPAM"
                  ? "bg-[#EA580C] text-white font-bold"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              )}
            >
              {counts.spam}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("OFFENSIVE")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              activeTab === "OFFENSIVE"
                ? "bg-[#FFFDF5] text-[#DC2626] font-bold border border-[#FECACA] shadow-sm"
                : "text-[#6B7280] hover:text-[#111827]"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
            <span>Offensive</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                activeTab === "OFFENSIVE"
                  ? "bg-[#DC2626] text-white font-bold"
                  : "bg-[#F3F4F6] text-[#6B7280]"
              )}
            >
              {counts.offensive}
            </span>
          </button>
        </div>

        {/* Search input & Refresh */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search comments or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B] w-56 shadow-sm"
            />
          </form>

          <button
            onClick={() => loadComments()}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] shadow-sm transition-colors cursor-pointer"
            title="Refresh comments"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-[#F59E0B]")} />
          </button>
        </div>
      </div>

      {/* Main Comments List or Empty State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-20 shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[350px]">
          <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
          <p className="text-xs text-[#6B7280]">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-20 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF]">
            <MessageSquare className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111827]">
              {searchQuery
                ? "No matching comments found"
                : activeTab === "ALL"
                ? "No comments yet"
                : `No ${activeTab.toLowerCase()} comments`}
            </h3>
            <p className="text-xs text-[#6B7280]">
              {searchQuery
                ? "Try searching for a different keyword or reset search."
                : "Comments from your Facebook page will appear here."}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                loadComments();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#F3F4F6] text-xs font-semibold text-[#4B5563] hover:bg-[#E5E7EB] transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isReplying = replyingCommentId === comment.id;
            const draftText = replyTextMap[comment.id] || "";
            const isSending = isSendingReply[comment.id] || false;
            const isAiLoading = isGeneratingAi[comment.id] || false;
            const isToggling = isTogglingHide[comment.id] || false;

            return (
              <div
                key={comment.id}
                className={cn(
                  "bg-white rounded-2xl border transition-all p-5 shadow-sm space-y-4",
                  comment.isHidden
                    ? "border-[#E5E7EB] opacity-75 bg-[#FAFAFA]"
                    : comment.category === "OFFENSIVE"
                    ? "border-[#FECACA] hover:border-[#F87171]"
                    : comment.category === "BAD"
                    ? "border-[#FED7AA] hover:border-[#FB923C]"
                    : comment.category === "SPAM"
                    ? "border-[#FDE68A] hover:border-[#FBBF24]"
                    : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                )}
              >
                {/* Header: Author + Post Context + Sentiment Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F3F4F6] pb-3">
                  <div className="flex items-center gap-3">
                    {comment.authorPic ? (
                      <img
                        src={comment.authorPic}
                        alt={comment.authorName}
                        className="w-9 h-9 rounded-full object-cover border border-[#E5E7EB]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-xs font-bold text-[#6B7280]">
                        {comment.authorName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#111827]">
                          {comment.authorName}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {formatBdTime(comment.createdTime)}
                        </span>
                        {comment.isHidden && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#6B7280] text-[10px] font-semibold border border-[#E5E7EB]">
                            <EyeOff className="w-2.5 h-2.5" />
                            Hidden from post
                          </span>
                        )}
                      </div>
                      {comment.postTitle && (
                        <p className="text-[11px] text-[#6B7280] truncate max-w-md">
                          On post: <span className="italic">{comment.postTitle}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Category Badges */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    {comment.category === "BAD" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#D97706] text-xs font-semibold border border-[#FDE68A]">
                        <AlertTriangle className="w-3 h-3 text-[#D97706]" />
                        Bad Sentiment
                      </span>
                    )}
                    {comment.category === "SPAM" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFEDD5] text-[#C2410C] text-xs font-semibold border border-[#FED7AA]">
                        <ShieldAlert className="w-3 h-3 text-[#C2410C]" />
                        Spam Link
                      </span>
                    )}
                    {comment.category === "OFFENSIVE" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#DC2626] text-xs font-semibold border border-[#FECACA]">
                        <ShieldAlert className="w-3 h-3 text-[#DC2626]" />
                        Offensive
                      </span>
                    )}
                    {comment.category === "SAFE" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#15803D] text-xs font-semibold border border-[#BBF7D0]">
                        <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                        Safe
                      </span>
                    )}
                  </div>
                </div>

                {/* Comment Body */}
                <div className="text-xs text-[#1F2937] leading-relaxed select-text font-normal">
                  {comment.message}
                </div>

                {/* Existing Replies List */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-4 border-l-2 border-[#F3F4F6] space-y-2 mt-2">
                    {comment.replies.map((rep) => (
                      <div key={rep.id} className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#111827] flex items-center gap-1.5">
                            <CornerDownRight className="w-3 h-3 text-[#9CA3AF]" />
                            {rep.authorName}
                          </span>
                          <span className="text-[#9CA3AF] text-[10px]">
                            {formatBdTime(rep.createdTime)}
                          </span>
                        </div>
                        <p className="text-xs text-[#374151] pl-4">{rep.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F3F4F6]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReplyingCommentId(isReplying ? null : comment.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        isReplying
                          ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                          : "bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]"
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isReplying ? "Cancel Reply" : "Reply"}</span>
                    </button>

                    <button
                      onClick={() => handleAiSuggest(comment)}
                      disabled={isAiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFDF5] hover:bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isAiLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>AI Suggest</span>
                    </button>

                    <button
                      onClick={() => handleToggleHide(comment)}
                      disabled={isToggling}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {comment.isHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-[#15803D]" />
                          <span>Unhide</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>Hide</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setDeleteCommentItem(comment)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                    title="Delete Comment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Reply Input Box */}
                {isReplying && (
                  <div className="pt-2 space-y-2 animate-in fade-in duration-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a public reply as your Facebook Page..."
                        value={draftText}
                        onChange={(e) =>
                          setReplyTextMap((prev) => ({
                            ...prev,
                            [comment.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendReply(comment);
                          }
                        }}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                      />
                      <button
                        onClick={() => handleSendReply(comment)}
                        disabled={isSending || !draftText.trim()}
                        className="px-4 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#D97706] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteCommentItem)}
        onClose={() => setDeleteCommentItem(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Facebook Comment"
        description={`Are you sure you want to permanently delete this comment by "${deleteCommentItem?.authorName}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Comment"}
        variant="danger"
      />
    </div>
  );
}
