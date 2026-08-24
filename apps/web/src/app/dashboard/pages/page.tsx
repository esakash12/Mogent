"use client";

import { useState, useEffect } from "react";
import {
  Facebook,
  Plus,
  Zap,
  ShieldCheck,
  Settings2,
  Trash2,
  CheckCircle2,
  Bot,
  Sliders,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPages, createPage, updatePageSettings, deletePage } from "@/lib/api";

interface FacebookPageItem {
  id: string;
  name: string;
  pageId: string;
  category: string;
  aiMode: "AUTO" | "HYBRID" | "MANUAL" | "OFF";
  webhookStatus: "SUBSCRIBED" | "PENDING";
  systemPrompt: string;
  temperature: number;
}

export default function PagesManagementPage() {
  const [pages, setPages] = useState<FacebookPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPage, setNewPage] = useState({
    name: "",
    pageId: "",
    accessToken: "",
    systemPrompt: "",
    aiMode: "HYBRID" as const,
  });

  const loadPages = async () => {
    setLoading(true);
    const data = await fetchPages();
    setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleModeChange = async (pageId: string, newMode: "AUTO" | "HYBRID" | "MANUAL" | "OFF") => {
    // Optimistic update
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, aiMode: newMode } : p))
    );
    await updatePageSettings(pageId, { aiMode: newMode });
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPage.name || !newPage.pageId || !newPage.accessToken) {
      setError("Please provide Page Name, Page ID, and Page Access Token.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const created = await createPage(newPage);
    if (created) {
      setPages((prev) => [created, ...prev.filter((p) => p.pageId !== created.pageId)]);
      setShowModal(false);
      setNewPage({ name: "", pageId: "", accessToken: "", systemPrompt: "", aiMode: "HYBRID" });
    } else {
      setError("Failed to connect Facebook page. Please verify your token.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm("Are you sure you want to disconnect this Facebook Page?")) return;
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    await deletePage(pageId);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">Facebook Pages</h1>
          <p className="text-[14px] text-[#888]">
            Connect Facebook Pages and manage AI automation modes & system personas.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="px-4 py-2.5 rounded-md bg-white text-black text-[13px] font-medium hover:bg-[#EDEDED] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Page</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          <span className="text-xs text-[#888]">Loading connected pages...</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#333] bg-[#0A0A0A] flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center text-[#888]">
            <Facebook className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#EDEDED]">No Facebook Pages Connected Yet</h3>
            <p className="text-xs text-[#777] max-w-sm">
              Connect your business Facebook page to start automating Messenger sales and support with Gemini AI.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect First Page</span>
          </button>
        </div>
      ) : (
        /* Pages List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pages.map((page) => (
            <div
              key={page.id}
              className="p-6 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-6 hover:border-[#444] transition-colors relative group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#222] text-[#EDEDED] flex items-center justify-center">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[14px] text-[#EDEDED]">{page.name}</h3>
                    <p className="text-[11px] text-[#888] font-mono mt-0.5">Page ID: {page.pageId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-sm bg-[#10B981]/10 text-[#10B981]">
                    <CheckCircle2 className="w-3 h-3" />
                    {page.webhookStatus || "SUBSCRIBED"}
                  </span>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="p-1.5 rounded hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors"
                    title="Disconnect page"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* AI Mode Selector */}
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[#888]">
                  AI Automation Mode
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#111] border border-[#222] text-[12px]">
                  {(["AUTO", "HYBRID", "MANUAL", "OFF"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => handleModeChange(page.id, mode)}
                      className={cn(
                        "py-1.5 rounded-md font-medium transition-colors cursor-pointer",
                        page.aiMode === mode
                          ? "bg-[#333] text-[#EDEDED] shadow-sm"
                          : "text-[#888] hover:text-[#EDEDED]"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Persona Snippet */}
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-[#888] flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#EDEDED]" />
                  <span>Active System Prompt</span>
                </label>
                <p className="text-[12px] text-[#888] bg-[#111] p-3.5 rounded-lg border border-[#222] leading-relaxed">
                  "{page.systemPrompt}"
                </p>
              </div>

              {/* Footer Settings Info */}
              <div className="pt-4 border-t border-[#222] flex items-center justify-between text-[11px] text-[#888]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  Token Encrypted (AES-256)
                </span>
                <span>Temperature: {page.temperature || 0.3}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Page Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h3 className="font-semibold text-[15px] text-[#EDEDED]">Connect Facebook Page</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-[#EDEDED] transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddPage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Page Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Online Shop"
                  value={newPage.name}
                  onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Facebook Page ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 109283749281723"
                  value={newPage.pageId}
                  onChange={(e) => setNewPage({ ...newPage, pageId: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Page Access Token</label>
                <input
                  type="password"
                  required
                  placeholder="EAAB..."
                  value={newPage.accessToken}
                  onChange={(e) => setNewPage({ ...newPage, accessToken: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
                <p className="text-[10px] text-[#555]">
                  Automatically encrypted with AES-256-GCM before saving to database.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">AI System Prompt (Persona)</label>
                <textarea
                  rows={3}
                  placeholder="Define how the AI should talk, tone, and guidelines..."
                  value={newPage.systemPrompt}
                  onChange={(e) => setNewPage({ ...newPage, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md text-[13px] font-medium text-[#888] hover:text-[#EDEDED] hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting & Saving...</span>
                    </>
                  ) : (
                    <span>Save & Connect Page</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
