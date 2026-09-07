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
  fetchTelegramStatus,
  fetchWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppConnection,
} from "@/lib/api";
import { toast } from "@/lib/toast";

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
  const [telegramData, setTelegramData] = useState<any>(null);
  const [copiedWidget, setCopiedWidget] = useState(false);

  // WhatsApp Drawer & Config State
  const [showWhatsAppDrawer, setShowWhatsAppDrawer] = useState(false);
  const [whatsAppTab, setWhatsAppTab] = useState<"GUIDE" | "CONFIG" | "TEST">("GUIDE");
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [whatsAppConfig, setWhatsAppConfig] = useState({
    phoneNumber: "",
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    autoReplyEnabled: true,
    isConnected: false,
    webhookUrl: "https://api.mogent.tech/api/webhook/whatsapp",
    verifyToken: "mogent_fb_verify_token_secure",
  });
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [testPhoneInput, setTestPhoneInput] = useState("");
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);

  const loadData = async () => {
    setLoading(true);

    // Load instantly from localStorage cache if available
    try {
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("mogent_whatsapp_config");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.phoneNumberId || parsed.accessToken) {
            setWhatsAppConfig((prev) => ({
              ...prev,
              ...parsed,
              isConnected: Boolean(parsed.phoneNumberId && parsed.accessToken),
            }));
          }
        }
      }
    } catch {}

    try {
      const [pagesData, tgRes, waRes] = await Promise.all([
        fetchPages(),
        fetchTelegramStatus(),
        fetchWhatsAppConfig(),
      ]);

      if (Array.isArray(pagesData)) {
        setPages(pagesData);
        const toggles: Record<string, { chat: boolean; comment: boolean; privateInbox: boolean }> = {};
        pagesData.forEach((p) => {
          toggles[p.id] = {
            chat: p.autoReplyEnabled ?? true,
            comment: p.commentReplyEnabled ?? true,
            privateInbox: p.privateReplyEnabled ?? true,
          };
        });
        setPageToggles(toggles);
      }

      if (tgRes?.success && tgRes.data) {
        setTelegramData(tgRes.data);
      }

      if (waRes?.success && waRes.data && (waRes.data.phoneNumberId || waRes.data.accessToken)) {
        setWhatsAppConfig((prev) => ({
          ...prev,
          ...waRes.data,
          isConnected: Boolean(waRes.data.phoneNumberId && waRes.data.accessToken),
        }));
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("mogent_whatsapp_config", JSON.stringify(waRes.data));
          }
        } catch {}
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);

    // Save to localStorage immediately so data is never lost on refresh
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "mogent_whatsapp_config",
          JSON.stringify({
            phoneNumber: whatsAppConfig.phoneNumber,
            phoneNumberId: whatsAppConfig.phoneNumberId,
            wabaId: whatsAppConfig.wabaId,
            accessToken: whatsAppConfig.accessToken,
            autoReplyEnabled: whatsAppConfig.autoReplyEnabled,
          })
        );
      }
    } catch {}

    try {
      const res = await saveWhatsAppConfig({
        phoneNumber: whatsAppConfig.phoneNumber,
        phoneNumberId: whatsAppConfig.phoneNumberId,
        wabaId: whatsAppConfig.wabaId,
        accessToken: whatsAppConfig.accessToken,
        autoReplyEnabled: whatsAppConfig.autoReplyEnabled,
      });

      if (res?.success) {
        toast.success("WhatsApp কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে! 🎉");
        setWhatsAppConfig((prev) => ({ ...prev, isConnected: Boolean(prev.phoneNumberId && prev.accessToken) }));
      } else {
        toast.error("সার্ভার সেভ এরর", { description: res?.error || "আবার চেষ্টা করুন।" });
      }
    } catch (err: any) {
      toast.error("সেভ করতে সমস্যা হয়েছে");
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhoneInput.trim()) {
      toast.error("টেস্ট ফোন নম্বর আবশ্যক", { description: "অনুগ্রহ করে আপনার WhatsApp নম্বরটি লিখুন।" });
      return;
    }
    setIsTestingWhatsApp(true);
    try {
      const res = await testWhatsAppConnection({ testPhone: testPhoneInput.trim() });
      if (res?.success) {
        toast.success("টেস্ট মেসেজ পাঠানো হয়েছে! 💬", { description: res.message });
      } else {
        toast.error("মেসেজ পাঠানো যায়নি", { description: res?.error || "ক্রেডেনশিয়াল যাচাই করুন।" });
      }
    } catch (err: any) {
      toast.error("টেস্ট রিকোয়েস্টে সমস্যা হয়েছে");
    } finally {
      setIsTestingWhatsApp(false);
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
          Connected ({pages.length + (whatsAppConfig.isConnected ? 1 : 0)})
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111827]">WhatsApp</h3>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                    whatsAppConfig.isConnected
                      ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                      : "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                  )}
                >
                  {whatsAppConfig.isConnected ? "Connected (সক্রিয়)" : "Ready to Connect"}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                Connect your audience with WhatsApp Cloud API & Direct Inbox
              </p>
            </div>

            {whatsAppConfig.phoneNumber && (
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] font-bold">
                    W
                  </div>
                  <span className="text-xs font-bold text-[#166534]">{whatsAppConfig.phoneNumber}</span>
                </div>
                <span className="text-[10px] text-[#15803D] font-semibold">⚡ Cloud API</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowWhatsAppDrawer(true)}
            className="w-full py-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-bold text-[#374151] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#10B981]" />
            <span>কনফিগার ও সহজে কানেক্ট করুন</span>
          </button>
        </div>
      </div>

      {/* Telegram 1-Click Mobile Takeover Card */}
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

      {/* FACEBOOK RIGHT DRAWER */}
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

      {/* WHATSAPP RIGHT DRAWER (SUPER EASY & GUIDED) */}
      {showWhatsAppDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">WhatsApp Integration Setup</h3>
                  <p className="text-[11px] text-[#6B7280]">সহজ ও সম্পূর্ণ স্টেপ-বাই-স্টেপ কানেক্ট সিস্টেম</p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppDrawer(false)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Interactive Tabs */}
            <div className="flex items-center border-b border-[#E5E7EB] px-5 bg-[#F9FAFB]">
              <button
                type="button"
                onClick={() => setWhatsAppTab("GUIDE")}
                className={cn(
                  "py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  whatsAppTab === "GUIDE"
                    ? "border-[#25D366] text-[#166534] bg-white"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                )}
              >
                1. 📋 সেটআপ গাইড
              </button>
              <button
                type="button"
                onClick={() => setWhatsAppTab("CONFIG")}
                className={cn(
                  "py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  whatsAppTab === "CONFIG"
                    ? "border-[#25D366] text-[#166534] bg-white"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                )}
              >
                2. ⚙️ ক্রেডেনশিয়াল ও সেভ
              </button>
              <button
                type="button"
                onClick={() => setWhatsAppTab("TEST")}
                className={cn(
                  "py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  whatsAppTab === "TEST"
                    ? "border-[#25D366] text-[#166534] bg-white"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                )}
              >
                3. 🧪 টেস্ট কানেকশন
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              {/* TAB 1: STEP-BY-STEP GUIDE */}
              {whatsAppTab === "GUIDE" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#166534]">হোয়াটসঅ্যাপ কানেক্ট করার ৫টি সহজ ধাপ:</h4>
                      <p className="text-[11px] text-[#15803D] mt-0.5 leading-relaxed">
                        নিচের তথ্যগুলো দিয়ে Meta for Developers-এ Webhook সেট করে নিন। এরপর দ্বিতীয় ট্যাবে ফোন নম্বর ও টোকেন দিয়ে সেভ করলেই চ্যাট শুরু হবে!
                      </p>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                      <h4 className="text-xs font-bold text-[#111827]">Meta Developer পোর্টালে যান</h4>
                    </div>
                    <p className="text-[11px] text-[#6B7280] leading-relaxed">
                      <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline font-bold inline-flex items-center gap-1">
                        developers.facebook.com
                      </a> এ লগইন করে আপনার তৈরি করা Meta App সিলেক্ট করুন।
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                      <h4 className="text-xs font-bold text-[#111827]">WhatsApp Webhook কনফিগার করুন</h4>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      App ড্যাশবোর্ডের বাম মেনু থেকে <b>WhatsApp &gt; Configuration</b> বা <b>API Setup</b> এ গিয়ে <b>Edit</b> ক্লিক করুন:
                    </p>

                    {/* Copy Callback URL */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-[#374151]">Callback URL (ক্লিক করে কপি করুন):</label>
                      <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#CBD5E1] rounded-xl p-2">
                        <input
                          type="text"
                          readOnly
                          value="https://api.mogent.tech/api/webhook/whatsapp"
                          className="bg-transparent text-xs text-[#111827] font-mono flex-1 outline-none truncate"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("https://api.mogent.tech/api/webhook/whatsapp");
                            setCopiedWebhookUrl(true);
                            setTimeout(() => setCopiedWebhookUrl(false), 2000);
                          }}
                          className="p-1 rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#E5E7EB] text-[#374151] transition-colors shrink-0 cursor-pointer flex items-center gap-1 text-[10px] font-bold px-2"
                        >
                          {copiedWebhookUrl ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedWebhookUrl ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Copy Verify Token */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-[#374151]">Verify Token (ক্লিক করে কপি করুন):</label>
                      <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#CBD5E1] rounded-xl p-2">
                        <input
                          type="text"
                          readOnly
                          value="mogent_fb_verify_token_secure"
                          className="bg-transparent text-xs text-[#111827] font-mono flex-1 outline-none truncate"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("mogent_fb_verify_token_secure");
                            setCopiedVerifyToken(true);
                            setTimeout(() => setCopiedVerifyToken(false), 2000);
                          }}
                          className="p-1 rounded-lg bg-white border border-[#CBD5E1] hover:bg-[#E5E7EB] text-[#374151] transition-colors shrink-0 cursor-pointer flex items-center gap-1 text-[10px] font-bold px-2"
                        >
                          {copiedVerifyToken ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedVerifyToken ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#25D366] text-white text-[11px] font-bold flex items-center justify-center">3</span>
                      <h4 className="text-xs font-bold text-[#111827]">Webhook Fields-এ `messages` সাবস্ক্রাইব করুন</h4>
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Webhook ভেরিফাই হওয়ার পর <b>Manage</b> বাটনে ক্লিক করে <b>messages</b> ফিল্ডে <b>Subscribe</b> করে দিন।
                    </p>
                  </div>

                  {/* Next Step Button */}
                  <button
                    type="button"
                    onClick={() => setWhatsAppTab("CONFIG")}
                    className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>পরের ধাপ: ফোন নম্বর ও ক্রেডেনশিয়াল সেভ করুন &rarr;</span>
                  </button>
                </div>
              )}

              {/* TAB 2: CREDENTIALS & SETTINGS */}
              {whatsAppTab === "CONFIG" && (
                <form onSubmit={handleSaveWhatsApp} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                    <h4 className="text-xs font-bold text-[#166534]">WhatsApp Cloud API ক্রেডেনশিয়াল ফর্ম</h4>
                    <p className="text-[10px] text-[#15803D] mt-0.5">Meta Dashboard &gt; WhatsApp &gt; API Setup থেকে নিচের তথ্যগুলো কপি করে বসান।</p>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-[#374151] mb-1">
                      WhatsApp Business ফোন নম্বর (যেমনঃ 017XXXXXXXX) *
                    </label>
                    <input
                      type="text"
                      placeholder="017XXXXXXXX বা 88017XXXXXXXX"
                      value={whatsAppConfig.phoneNumber}
                      onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, phoneNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#CBD5E1] text-xs text-[#111827] focus:outline-none focus:border-[#25D366]"
                    />
                  </div>

                  {/* Phone Number ID */}
                  <div>
                    <label className="block text-xs font-bold text-[#374151] mb-1">
                      Phone Number ID (Meta Dashboard থেকে) *
                    </label>
                    <input
                      type="text"
                      placeholder="যেমনঃ 103948572019485"
                      value={whatsAppConfig.phoneNumberId}
                      onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, phoneNumberId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
                    />
                  </div>

                  {/* WABA ID */}
                  <div>
                    <label className="block text-xs font-bold text-[#374151] mb-1">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমনঃ 984729104820194"
                      value={whatsAppConfig.wabaId}
                      onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, wabaId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
                    />
                  </div>

                  {/* Permanent Access Token */}
                  <div>
                    <label className="block text-xs font-bold text-[#374151] mb-1">
                      Permanent Access Token / System User Token *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="EAAB..."
                      value={whatsAppConfig.accessToken}
                      onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, accessToken: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
                    />
                  </div>

                  {/* AI Auto Reply Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                    <div>
                      <p className="text-xs font-bold text-[#111827]">WhatsApp এআই চ্যাট রিপ্লাই</p>
                      <p className="text-[10px] text-[#6B7280]">হোয়াটসঅ্যাপে মেসেজ আসলে এআই স্বয়ংক্রিয়ভাবে উত্তর দেবে।</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWhatsAppConfig({ ...whatsAppConfig, autoReplyEnabled: !whatsAppConfig.autoReplyEnabled })}
                      className={cn(
                        "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                        whatsAppConfig.autoReplyEnabled ? "bg-[#25D366]" : "bg-[#D1D5DB]"
                      )}
                    >
                      <div
                        className={cn(
                          "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                          whatsAppConfig.autoReplyEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={isSavingWhatsApp}
                    className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{isSavingWhatsApp ? "সংরক্ষণ হচ্ছে..." : "ক্রেডেনশিয়াল সংরক্ষণ করুন"}</span>
                  </button>
                </form>
              )}

              {/* TAB 3: TEST CONNECTION */}
              {whatsAppTab === "TEST" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-3">
                    <MessageCircle className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#166534]">কানেকশন ও টেস্ট মেসেজ</h4>
                      <p className="text-[11px] text-[#15803D] mt-0.5 leading-relaxed">
                        আপনার সেভ করা ক্রেডেনশিয়াল কাজ করছে কিনা তা যাচাই করতে নিচে যেকোনো একটি WhatsApp নম্বর লিখে টেস্ট মেসেজ পাঠান।
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleTestWhatsApp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#374151] mb-1">
                        টেস্ট গ্রহণকারীর WhatsApp ফোন নম্বর *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="01XXXXXXXXX বা 8801XXXXXXXXX"
                        value={testPhoneInput}
                        onChange={(e) => setTestPhoneInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isTestingWhatsApp}
                      className="w-full py-2.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-white font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isTestingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4 text-[#25D366]" />}
                      <span>{isTestingWhatsApp ? "মেসেজ পাঠানো হচ্ছে..." : "টেস্ট মেসেজ পাঠান"}</span>
                    </button>
                  </form>

                  {/* Direct Inbox Jump */}
                  <div className="rounded-2xl border border-[#BBF7D0] p-4 bg-[#F0FDF4] space-y-2">
                    <h4 className="text-xs font-bold text-[#166534]">লাইভ হোয়াটসঅ্যাপ ইনবক্স</h4>
                    <p className="text-[11px] text-[#15803D] leading-relaxed">
                      ইনবক্স থেকে সরাসরি যেকোনো কাস্টমারের সাথে মেসেজিং ও অর্ডার কনফার্ম করতে পারবেন।
                    </p>
                    <Link
                      href="/dashboard/inbox"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold shadow-xs transition-all mt-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>হোয়াটসঅ্যাপ লাইভ ইনবক্স খুলুন</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Drawer Footer */}
            <div className="p-4 border-t border-[#E5E7EB] bg-white flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowWhatsAppDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-xs font-bold text-white transition-all shadow-sm cursor-pointer text-center"
              >
                সম্পন্ন / বন্ধ করুন
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

