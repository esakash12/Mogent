"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScrollText,
  Edit3,
  Save,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Loader2,
  Check,
  X,
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

// ─────────────────────────────────────────────────────────
// Minimal zero-dependency Markdown renderer
// ─────────────────────────────────────────────────────────
function inlineRender(text: string) {
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Price badges: ৳150 or 150 টাকা
    const priceRe = /(৳\s*\d[\d,]*|\d[\d,]*\s*(?:টাকা|tk))/gi;
    const priceSegments = part.split(priceRe);
    return priceSegments.map((seg, j) => {
      if (priceRe.test(seg)) {
        priceRe.lastIndex = 0;
        return (
          <span
            key={`${i}-${j}`}
            className="inline-flex items-center mx-0.5 px-1.5 py-px rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold font-mono border border-emerald-200 dark:border-emerald-500/25"
          >
            {seg}
          </span>
        );
      }
      return seg;
    });
  });
}

function MarkdownNote({ content }: { content: string }) {
  const lines = useMemo(() => content.split("\n"), [content]);
  return (
    <div className="space-y-1.5 text-sm text-foreground leading-relaxed select-text">
      {lines.map((line, idx) => {
        const t = line.trim();
        if (!t) return <div key={idx} className="h-3" />;

        if (t.startsWith("# ")) {
          return (
            <h1
              key={idx}
              className="text-base font-bold text-foreground flex items-center gap-2 pb-2 mt-4 first:mt-0 border-b border-[#E2E8F0] dark:border-[#2D3F50]"
            >
              {t.replace(/^#\s+/, "")}
            </h1>
          );
        }
        if (t.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-4 first:mt-0 flex items-center gap-1.5"
            >
              {t.replace(/^##\s+/, "")}
            </h2>
          );
        }
        if (t.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-xs font-semibold text-foreground mt-2">
              {t.replace(/^###\s+/, "")}
            </h3>
          );
        }
        if (t.startsWith("- ") || t.startsWith("* ")) {
          const body = t.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
              <div className="flex-1 text-sm text-muted-foreground">
                {inlineRender(body)}
              </div>
            </div>
          );
        }
        if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
          return (
            <p key={idx} className="text-xs italic text-muted-foreground">
              {t.slice(1, -1)}
            </p>
          );
        }
        return (
          <p key={idx} className="text-sm text-muted-foreground">
            {inlineRender(t)}
          </p>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Card Component
// ─────────────────────────────────────────────────────────
export function StoreBrainNoteCard({
  pageId = "ALL",
  pages = [],
  isPulseTriggered = false,
  onNoteUpdated,
  className,
  isFullScreen = false,
}: StoreBrainNoteCardProps) {
  const [note, setNote] = useState<StoreBrainNoteData | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pulse, setPulse] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchBrainNote(pageId);
      if (data) {
        setNote(data);
        setDraft(data.content);
        onNoteUpdated?.(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pageId]);

  useEffect(() => {
    if (!isPulseTriggered) return;
    load();
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 2800);
    return () => clearTimeout(t);
  }, [isPulseTriggered]);

  const handleSave = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await saveBrainNote({
        pageId: pageId && pageId !== "ALL" ? pageId : undefined,
        content: draft.trim(),
      });
      if (updated) {
        setNote(updated);
        setEditing(false);
        setSaved(true);
        toast.success("Store notebook saved.");
        onNoteUpdated?.(updated);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const pageName = useMemo(() => {
    if (!pageId || pageId === "ALL") return "Master Notebook";
    return pages.find((p) => p.id === pageId)?.name ?? "Page Notebook";
  }, [pageId, pages]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-white dark:bg-[#111B25] border overflow-hidden shadow-xs transition-all duration-500",
        pulse
          ? "border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-400/20 dark:ring-emerald-500/15"
          : "border-[#E2E8F0] dark:border-[#1E2D3D]",
        isFullScreen ? "h-[calc(100vh-140px)]" : "h-full",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] dark:border-[#1E2D3D] bg-[#FAFBFC] dark:bg-[#0F1923] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
            <ScrollText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground truncate">
                Living Store Notebook
              </span>
              {note && (
                <span className="px-1.5 py-px rounded text-[9px] font-mono font-semibold bg-[#F1F5F9] dark:bg-[#1E2A35] text-muted-foreground border border-[#E2E8F0] dark:border-[#2D3F50] shrink-0">
                  v{note.version}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{pageName}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pulse && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-pulse">
              <Sparkles className="w-3 h-3" />
              Updated
            </span>
          )}

          {editing ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setDraft(note?.content ?? "");
                  setEditing(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-[#F1F5F9] dark:hover:bg-[#1E2A35] transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E2A35] hover:bg-[#F8FAFC] dark:hover:bg-[#243040] border border-[#E2E8F0] dark:border-[#2D3F50] text-xs font-medium text-foreground transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="text-xs">Loading notebook…</span>
          </div>
        ) : editing ? (
          <div className="p-4 flex flex-col h-full gap-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Edit pricing, offers, and rules in plain text or Markdown:</span>
              <span className="font-mono">{draft.length} chars</span>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder="Write store facts, prices, delivery policies…"
              className="flex-1 min-h-[320px] w-full p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2A35] border border-[#E2E8F0] dark:border-[#2D3F50] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-mono text-xs text-foreground leading-relaxed resize-none transition-all"
            />
            <p className="text-[10px] text-muted-foreground">
              Markdown supported: # heading · - bullet · **bold** · ৳price
            </p>
          </div>
        ) : note?.content ? (
          <div className="p-4 sm:p-5">
            <MarkdownNote content={note.content} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-52 text-center gap-3 text-muted-foreground px-6">
            <BookOpen className="w-8 h-8 opacity-25 text-emerald-500" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">No notebook yet</p>
              <p className="text-xs opacity-70">
                Chat with Co-Pilot or click Edit to create your first note.
              </p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium cursor-pointer"
            >
              Create Note
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-[#F1F5F9] dark:border-[#1E2D3D] bg-[#FAFBFC] dark:bg-[#0F1923] text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Synced to Facebook & WhatsApp
        </span>
        {note?.updatedAt && (
          <span className="font-mono">
            {new Date(note.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
