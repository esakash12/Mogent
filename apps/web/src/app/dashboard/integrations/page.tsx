"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Share2,
  Facebook,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  RefreshCw,
  Zap,
  Globe,
  Lock,
  ExternalLink,
  Trash2,
  Settings2,
  Loader2,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchPages, createPage, deletePage, updatePageSettings } from "@/lib/api";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"FACEBOOK" | "TELEGRAM" | "WEBHOOKS">("FACEBOOK");
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  // Telegram States
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // New Page Modal States
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [pageName, setPageName] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPages = async () => {
    setLoadingPages(true);
    const data = await fetchPages();
    if (Array.isArray(data)) {
      setPages(data);
    } else {
      setPages([]);
    }
    setLoadingPages(false);
  };

  useEffect(() => {
    loadPages();

    // Fetch Telegram Config if available
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_BASE}/api/telegram`, {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") || "" : "",
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setBotToken(json.data.botToken || "");
          setChatId(json.data.chatId || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageName || !facebookPageId || !pageAccessToken) return;

    setIsSubmitting(true);
    const res = await createPage({
      name: pageName,
      pageId: facebookPageId,
      accessToken: pageAccessToken,
      systemPrompt: systemPrompt || undefined,
    });

    if (res) {
      setShowAddPageModal(false);
      setPageName("");
      setFacebookPageId("");
      setPageAccessToken("");
      setSystemPrompt("");
      loadPages();
    } else {
      alert(res.error || "Failed to connect Facebook Page");
    }
    setIsSubmitting(false);
  };

  const handleDeletePage = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect Facebook Page [${name}]?`)) return;
    await deletePage(id);
    loadPages();
  };

  const handleToggleMode = async (id: string, currentMode: string) => {
    const nextMode =
      currentMode === "AUTO" ? "HYBRID" : currentMode === "HYBRID" ? "MANUAL" : "AUTO";
    await updatePageSettings(id, { aiMode: nextMode });
    loadPages();
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTelegram(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

    try {
      const res = await fetch(`${API_BASE}/api/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") || "" : "",
        },
        body: JSON.stringify({ botToken, chatId }),
      });
      if (res.ok) {
        setTelegramSaved(true);
        setTimeout(() => setTelegramSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save telegram:", err);
    } finally {
      setSavingTelegram(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Sector Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Integrations & Channels
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Connect Facebook Pages, Telegram Manager Push Notifications, and custom webhooks.
          </p>
        </div>

        {/* The Sector Top Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
          <button
            onClick={() => setActiveTab("FACEBOOK")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "FACEBOOK"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Facebook className="w-3.5 h-3.5 text-blue-400" />
            <span>Facebook Pages ({pages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("TELEGRAM")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "TELEGRAM"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Telegram Alerts</span>
          </button>

          <button
            onClick={() => setActiveTab("WEBHOOKS")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "WEBHOOKS"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Custom Webhooks</span>
          </button>
        </div>
      </div>

      {/* 1. FACEBOOK TAB */}
      {activeTab === "FACEBOOK" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888]">
              Connected Facebook Page accounts receiving live customer messages.
            </span>

            <button
              onClick={() => setShowAddPageModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect New Facebook Page</span>
            </button>
          </div>

          {loadingPages ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 border border-[#222] bg-[#0A0A0A] rounded-2xl">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="text-xs text-[#888]">Loading connected pages...</span>
            </div>
          ) : pages.length === 0 ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 border border-[#222] bg-[#0A0A0A] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-blue-400">
                <Facebook className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#EDEDED]">No Facebook Pages Connected</h3>
                <p className="text-xs text-[#777] max-w-sm leading-relaxed">
                  Connect your business Facebook Page to start automating Messenger replies, answering customer FAQs, and extracting leads with Gemini 2.0 AI.
                </p>
              </div>
              <button
                onClick={() => setShowAddPageModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Your First Facebook Page</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#333] transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#EDEDED]">{p.pageName}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] text-[#888] border border-[#333]">
                          ID: {p.facebookPageId}
                        </span>
                      </div>
                      <span className="text-xs text-[#888] mt-0.5 block">
                        AI Mode: <strong className="text-amber-500">{p.aiMode || "AUTO"}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                      Webhook Active
                    </span>

                    <button
                      onClick={() => handleToggleMode(p.id, p.aiMode || "AUTO")}
                      className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-medium text-[#EDEDED] transition-colors cursor-pointer"
                    >
                      Switch Mode ({p.aiMode || "AUTO"})
                    </button>

                    <button
                      onClick={() => handleDeletePage(p.id, p.pageName)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[#666] hover:text-red-400 transition-colors cursor-pointer"
                      title="Disconnect Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. TELEGRAM TAB */}
      {activeTab === "TELEGRAM" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] max-w-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">Telegram Push Alert Gateway</h3>
              <p className="text-xs text-[#888]">Get instant notification on your smartphone when a customer requires human manager.</p>
            </div>
          </div>

          <form onSubmit={handleSaveTelegram} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Telegram Bot Token</label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="e.g. 7189204918:AAFlw902JkLmNoP..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Manager Group / Chat ID</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="e.g. -1002349182390"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {telegramSaved && (
              <div className="p-3 rounded-lg text-xs bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Telegram notification settings saved successfully!</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingTelegram}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Save Telegram Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. WEBHOOKS TAB */}
      {activeTab === "WEBHOOKS" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">Facebook Graph Webhook URL</h3>
              <p className="text-xs text-[#888]">Use this URL in your Facebook Meta Developer App Webhook settings.</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-[#888]">Callback URL:</span>
              <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-[#EDEDED] select-all">
                https://api.mogent.tech/webhook/facebook
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[#888]">Verify Token:</span>
              <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-amber-500 select-all">
                mogent_facebook_verify_token_2026
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Connect Facebook Page */}
      {showAddPageModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div className="flex items-center gap-2.5">
                <Facebook className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-[#EDEDED]">Connect Facebook Page</h3>
              </div>
              <button
                onClick={() => setShowAddPageModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Page Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Awesome Shop"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Facebook Page ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10928491823901"
                  value={facebookPageId}
                  onChange={(e) => setFacebookPageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Page Access Token (EAA...)</label>
                <input
                  type="password"
                  required
                  placeholder="EAA..."
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Custom Persona / Prompt (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="You are a friendly customer service assistant for My Awesome Shop..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowAddPageModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-[#EDEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Connect Page</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
