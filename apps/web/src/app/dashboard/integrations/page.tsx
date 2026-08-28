"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Facebook,
  Globe,
  Plus,
  Trash2,
  Settings,
  CheckCircle2,
  X,
  Loader2,
  Copy,
  Check,
  Smartphone,
  MessageCircle,
  Code,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  fetchPages,
  createPage,
  deletePage,
  updatePageSettings,
} from "@/lib/api";

export default function IntegrationsPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "CONNECTED">("ALL");

  // Facebook Drawer State
  const [showFacebookDrawer, setShowFacebookDrawer] = useState(false);
  const [pageToggles, setPageToggles] = useState<Record<string, { chat: boolean; comment: boolean; privateInbox: boolean }>>({});

  // Add Page Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [pageNameInput, setPageNameInput] = useState("");
  const [fbPageIdInput, setFbPageIdInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Delete modal
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Telegram State
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingTg, setSavingTg] = useState(false);
  const [tgSaved, setTgSaved] = useState(false);

  // Copy state
  const [copiedWidget, setCopiedWidget] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPages();
      if (Array.isArray(data)) {
        setPages(data);
        const toggles: Record<string, { chat: boolean; comment: boolean; privateInbox: boolean }> = {};
        data.forEach((p) => {
          toggles[p.id] = {
            chat: p.autoReplyEnabled ?? true,
            comment: p.commentReplyEnabled ?? true,
            privateInbox: p.privateReplyEnabled ?? true,
          };
        });
        setPageToggles(toggles);
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Fetch Telegram
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_BASE}/api/telegram`, {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") || "" : "",
      },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setTelegramToken(res.data.botToken || "");
          setTelegramChatId(res.data.chatId || "");
        }
      })
      .catch(() => {});
  }, []);

  const handleToggle = async (pageId: string, type: "chat" | "comment" | "privateInbox") => {
    const current = pageToggles[pageId] || { chat: true, comment: true, privateInbox: true };
    const updated = { ...current, [type]: !current[type] };
    setPageToggles({ ...pageToggles, [pageId]: updated });

    try {
      await updatePageSettings(pageId, {
        autoReplyEnabled: updated.chat,
        commentReplyEnabled: updated.comment,
        privateReplyEnabled: updated.privateInbox,
      });
    } catch (err) {
      console.error("Failed to update toggle:", err);
    }
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !pageNameInput.trim()) return;
    setIsAdding(true);
    try {
      await createPage({
        name: pageNameInput,
        pageId: fbPageIdInput || `page_${Date.now()}`,
        accessToken: tokenInput,
      });
      setShowAddModal(false);
      setTokenInput("");
      setPageNameInput("");
      setFbPageIdInput("");
      await loadData();
    } catch (err) {
      console.error("Add page error:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeletePage = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await deletePage(deleteItem.id);
      setPages(pages.filter((p) => p.id !== deleteItem.id));
      setDeleteItem(null);
    } catch (err) {
      console.error("Delete page error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTg(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${API_BASE}/api/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") || "" : "",
        },
        body: JSON.stringify({
          botToken: telegramToken,
          chatId: telegramChatId,
          enabled: true,
        }),
      });
      if (res.ok) {
        setTgSaved(true);
        setTimeout(() => setTgSaved(false), 2500);
      }
    } catch (err) {
      console.error("Telegram save error:", err);
    } finally {
      setSavingTg(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Description Banner */}
      <div className="space-y-1">
        <h2 className="text-base font-bold text-[#111827]">Feel free to connect your accounts.</h2>
        <p className="text-xs text-[#6B7280]">
          This will help you to easily chat with your customers and provide them with a better experience.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-white border border-[#E5E7EB] w-fit shadow-sm">
        <button
          onClick={() => setActiveTab("ALL")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeTab === "ALL"
              ? "bg-[#FEF3C7] text-[#D97706] font-bold shadow-sm"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          All Integrations
        </button>
        <button
          onClick={() => setActiveTab("CONNECTED")}
          className={cn(
            "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            activeTab === "CONNECTED"
              ? "bg-[#FEF3C7] text-[#D97706] font-bold shadow-sm"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          Connected ({pages.length})
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Website Widget */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Website Widget</h3>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                Embed our chat widget directly into your website.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const snippet = `<script src="https://cdn.mogent.ai/widget.js" data-workspace="${typeof window !== 'undefined' ? localStorage.getItem('mogent_workspace') || 'demo' : 'demo'}" async></script>`;
              navigator.clipboard.writeText(snippet);
              setCopiedWidget(true);
              setTimeout(() => setCopiedWidget(false), 2000);
            }}
            className="w-full py-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-semibold text-[#374151] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            {copiedWidget ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{copiedWidget ? "Snippet Copied!" : "+ Connect"}</span>
          </button>
        </div>

        {/* Card 2: Facebook */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1877F2]">
              <Facebook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Facebook</h3>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                Connect your audience with Facebook and Messenger
              </p>
            </div>

            {pages.length > 0 && (
              <div className="p-3 rounded-xl bg-[#FFFDF5] border border-[#FEF3C7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {pages.slice(0, 3).map((p, i) => (
                      <div
                        key={p.id || i}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-[#FDE68A] text-[#92400E] font-bold text-[10px] flex items-center justify-center"
                      >
                        {p.name?.[0]?.toUpperCase() || "P"}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#92400E]">{pages.length} টি অ্যাকাউন্ট যুক্ত</span>
                </div>
                <span className="text-[10px] text-[#D97706] font-semibold">⚡ AI সক্রিয়</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFacebookDrawer(true)}
            className="w-full py-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-bold text-[#374151] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>অ্যাকাউন্ট ম্যানেজ করুন</span>
          </button>
        </div>

        {/* Card 3: WhatsApp */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#10B981]">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Whatsapp</h3>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                Connect your audience with Whatsapp
              </p>
            </div>
          </div>

          <button
            onClick={() => alert("WhatsApp Cloud API integration ready for configuration.")}
            className="w-full py-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-semibold text-[#374151] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Connect Integration</span>
          </button>
        </div>
      </div>

      {/* Extra Mogent Power: Telegram 1-Click Mobile Takeover Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#2563EB]" />
            <span>টেলিগ্রাম ১-ক্লিক মোবাইল টেকওভার (1-Click Bot Connect)</span>
          </h3>
          <p className="text-xs text-[#475569]">
            কোনো জটিল API টোকেন ছাড়া মাত্র ১-ক্লিকে টেলিগ্রাম বট পেয়ার করুন এবং মোবাইলে লাইভ অ্যালার্ট পান।
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/telegram"
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Connect Telegram Bot (1-Click)</span>
          </Link>
        </div>
      </div>

      {/* FACEBOOK RIGHT DRAWER (Exact Match to Screenshot 6) */}
      {showFacebookDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center">
                  <Facebook className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Facebook</h3>
                  <p className="text-[11px] text-[#6B7280]">{pages.length} টি অ্যাকাউন্ট যুক্ত</p>
                </div>
              </div>
              <button
                onClick={() => setShowFacebookDrawer(false)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connected Pages List with 3 Autonomous Toggles */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {pages.map((p) => {
                const toggles = pageToggles[p.id] || { chat: true, comment: true, privateInbox: true };
                return (
                  <div key={p.id} className="rounded-2xl border border-[#E5E7EB] p-4 space-y-4 bg-white shadow-sm">
                    {/* Page Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#FFFBEB] text-[#D97706] font-bold text-xs flex items-center justify-center border border-[#FDE68A]">
                          {p.name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <span className="text-xs font-bold text-[#111827]">{p.name}</span>
                      </div>
                      <button
                        onClick={() => setDeleteItem(p)}
                        className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                        title="Delete Page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Toggle 1: AI Chat Reply */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div>
                        <p className="text-xs font-bold text-[#111827]">এআই চ্যাট রিপ্লাই</p>
                        <p className="text-[10px] text-[#6B7280]">এজেন্ট সরাসরি মেসেজে স্বয়ংক্রিয়ভাবে উত্তর দেয়।</p>
                      </div>
                      <button
                        onClick={() => handleToggle(p.id, "chat")}
                        className={cn(
                          "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                          toggles.chat ? "bg-[#F59E0B]" : "bg-[#D1D5DB]"
                        )}
                      >
                        <div
                          className={cn(
                            "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                            toggles.chat ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Toggle 2: AI Comment Reply */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div>
                        <p className="text-xs font-bold text-[#111827]">এআই কমেন্ট রিপ্লাই</p>
                        <p className="text-[10px] text-[#6B7280]">এজেন্ট ফেসবুক ও ইন্সটাগ্রাম কমেন্টে স্বয়ংক্রিয়ভাবে উত্তর দেয়।</p>
                      </div>
                      <button
                        onClick={() => handleToggle(p.id, "comment")}
                        className={cn(
                          "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                          toggles.comment ? "bg-[#F59E0B]" : "bg-[#D1D5DB]"
                        )}
                      >
                        <div
                          className={cn(
                            "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                            toggles.comment ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Toggle 3: Private Inbox Reply */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                      <div>
                        <p className="text-xs font-bold text-[#111827]">প্রাইভেট ইনবক্স রিপ্লাই</p>
                        <p className="text-[10px] text-[#6B7280]">কমেন্টকারীর ইনবক্সেও মেসেজ পাঠান। বন্ধ থাকলে শুধু পাবলিক রিপ্লাই।</p>
                      </div>
                      <button
                        onClick={() => handleToggle(p.id, "privateInbox")}
                        className={cn(
                          "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                          toggles.privateInbox ? "bg-[#F59E0B]" : "bg-[#D1D5DB]"
                        )}
                      >
                        <div
                          className={cn(
                            "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                            toggles.privateInbox ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Drawer Action */}
            <div className="p-4 border-t border-[#E5E7EB] bg-white">
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-2.5 rounded-xl border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-bold text-[#374151] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#F59E0B]" />
                <span>+ আরেকটি অ্যাকাউন্ট যুক্ত করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#111827]">Connect Facebook Page</h3>
            <form onSubmit={handleAddPage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Page Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shohag Bazar"
                  value={pageNameInput}
                  onChange={(e) => setPageNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Page Access Token *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="EAAB..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E5E7EB] text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-1.5 rounded-lg bg-[#F59E0B] text-black text-xs font-bold disabled:opacity-50"
                >
                  {isAdding ? "Connecting..." : "Connect Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        title="Delete Facebook Page"
        description={`Are you sure you want to disconnect "${deleteItem?.name}"?`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeletePage}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
}
