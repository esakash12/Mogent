"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScrollText,
  Edit3,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  BookOpen,
  FileText,
  Loader2,
  Check,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { fetchBrainNote, saveBrainNote, StoreBrainNoteData } from "@/lib/api";

interface StoreBrainNoteCardProps {
  pageId?: string;
  pages?: Array<{ id: string; name: string }>;
  isPulseTriggered?: boolean;
  onNoteUpdated?: (note: StoreBrainNoteData) => void;
  className?: string;
  isFullScreen?: boolean;
}

/**
 * Lightweight, zero-dependency Markdown renderer for Store Brain Notes.
 * Formats headings, bullet points, bold text, numbers, and price pills cleanly.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = useMemo(() => content.split("\n"), [content]);

  return (
    <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed text-foreground select-text font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Heading 1 (# ...)
        if (trimmed.startsWith("# ")) {
          const headingText = trimmed.replace(/^#\s+/, "");
          return (
            <h1
              key={idx}
              className="text-base sm:text-lg font-bold text-foreground pb-1.5 border-b border-border/60 flex items-center gap-2 mt-2"
            >
              <span>{headingText}</span>
            </h1>
          );
        }

        // Heading 2 (## ...)
        if (trimmed.startsWith("## ")) {
          const headingText = trimmed.replace(/^##\s+/, "");
          return (
            <h2
              key={idx}
              className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 pt-3 pb-1 flex items-center gap-1.5"
            >
              <span>{headingText}</span>
            </h2>
          );
        }

        // Heading 3 (### ...)
        if (trimmed.startsWith("### ")) {
          const headingText = trimmed.replace(/^###\s+/, "");
          return (
            <h3 key={idx} className="text-xs sm:text-sm font-semibold text-foreground pt-1.5">
              {headingText}
            </h3>
          );
        }

        // Unordered Bullet points (- or *)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletContent = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
              <div className="flex-1">
                {renderInlineFormatting(bulletContent)}
              </div>
            </div>
          );
        }

        // Regular paragraph or italic note
        if (trimmed.startsWith("*") && trimmed.endsWith("*")) {
          return (
            <p key={idx} className="text-xs text-muted-foreground italic">
              {trimmed.slice(1, -1)}
            </p>
          );
        }

        return (
          <p key={idx} className="text-muted-foreground">
            {renderInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parses bold text (**text**), code (`code`), and price tags (৳150)
 */
function renderInlineFormatting(text: string) {
  // Split on **bold**
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <span key={i} className="font-bold text-foreground">
          {boldText}
        </span>
      );
    }

    // Split on code `code`
    const subParts = part.split(/(`.*?`)/g);
    return subParts.map((sub, j) => {
      if (sub.startsWith("`") && sub.endsWith("`")) {
        return (
          <code
            key={`${i}-${j}`}
            className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-emerald-600 dark:text-emerald-400"
          >
            {sub.slice(1, -1)}
          </code>
        );
      }

      // Highlight prices with a gentle badge
      const priceSplit = sub.split(/(৳\s*\d+(?:\.\d+)?|\d+\s*টাকা|\d+\s*tk)/gi);
      return priceSplit.map((p, k) => {
        if (/^(?:৳\s*\d+|\d+\s*টাকা|\d+\s*tk)$/i.test(p)) {
          return (
            <span
              key={`${i}-${j}-${k}`}
              className="inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold font-mono text-xs mx-0.5"
            >
              {p}
            </span>
          );
        }
        return p;
      });
    });
  });
}

export function StoreBrainNoteCard({
  pageId = "ALL",
  pages = [],
  isPulseTriggered = false,
  onNoteUpdated,
  className,
  isFullScreen = false,
}: StoreBrainNoteCardProps) {
  const [note, setNote] = useState<StoreBrainNoteData | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);

  const loadNote = async () => {
    try {
      setLoading(true);
      const data = await fetchBrainNote(pageId);
      if (data) {
        setNote(data);
        setDraftContent(data.content);
        if (onNoteUpdated) onNoteUpdated(data);
      }
    } catch (err) {
      console.error("Failed to load store brain note:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNote();
  }, [pageId]);

  // Flash highlight animation when Co-Pilot updates the note in the background
  useEffect(() => {
    if (isPulseTriggered) {
      loadNote();
      setHighlightPulse(true);
      const timer = setTimeout(() => setHighlightPulse(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isPulseTriggered]);

  const handleSave = async () => {
    if (!draftContent.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await saveBrainNote({
        pageId: pageId && pageId !== "ALL" ? pageId : undefined,
        content: draftContent.trim(),
      });
      if (updated) {
        setNote(updated);
        setIsEditing(false);
        setJustSaved(true);
        toast.success("Living Store Note updated successfully!");
        if (onNoteUpdated) onNoteUpdated(updated);
        setTimeout(() => setJustSaved(false), 2000);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (note) {
      setDraftContent(note.content);
    }
    setIsEditing(false);
  };

  const targetPageName = useMemo(() => {
    if (!pageId || pageId === "ALL") return "Master Store Note";
    const found = pages.find((p) => p.id === pageId);
    return found ? found.name : "Page Note";
  }, [pageId, pages]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-card border transition-all duration-500 overflow-hidden shadow-2xs",
        highlightPulse
          ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10"
          : "border-border",
        isFullScreen ? "h-[calc(100vh-160px)]" : "h-full",
        className
      )}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between p-3.5 sm:px-4 sm:py-3 border-b border-border/60 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <ScrollText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                Living Store Brain Note
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                v{note?.version || 1}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {targetPageName} • Supreme Single Source of Truth
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {highlightPulse && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse mr-1">
              <Sparkles className="w-3 h-3" /> Updated by Co-Pilot
            </span>
          )}

          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : justSaved ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saving ? "Saving..." : "Save Note"}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-medium text-foreground transition-all shadow-2xs cursor-pointer hover:border-emerald-500/30"
              title="Edit rough notes, pricing, and rules directly"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Edit Note</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs">Loading living store note...</span>
          </div>
        ) : isEditing ? (
          /* Manual Markdown Textarea Editor */
          <div className="space-y-2 h-full flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Write natural store facts, prices, discounts, and delivery policies:</span>
              <span className="font-mono text-[10px]">{draftContent.length} chars</span>
            </div>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Write your store prices, discounts, delivery policies in natural Bengali, Banglish, or Markdown..."
              className="w-full flex-1 min-h-[300px] p-3.5 rounded-xl bg-muted/30 border border-border focus:border-emerald-500 focus:outline-none font-mono text-xs text-foreground leading-relaxed resize-y selection:bg-emerald-500/20"
            />
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
              <span>Markdown formatting (# heading, - bullet, **bold**) supported.</span>
              <span>Changes take effect in customer chats immediately upon saving.</span>
            </div>
          </div>
        ) : note?.content ? (
          /* Rendered Markdown Living Note */
          <div className="space-y-4">
            <MarkdownRenderer content={note.content} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 text-muted-foreground">
            <BookOpen className="w-8 h-8 opacity-40 text-emerald-500" />
            <p className="text-xs font-medium">No note found for this page yet.</p>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer"
            >
              Create Starter Note
            </button>
          </div>
        )}
      </div>

      {/* Footnote Bar */}
      <div className="p-2.5 sm:px-4 border-t border-border/60 bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Used by Customer AI on Facebook & WhatsApp</span>
        </span>
        <span className="font-mono">
          Updated: {note?.updatedAt ? new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
        </span>
      </div>
    </div>
  );
}
