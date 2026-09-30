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
  Save,
  Activity,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Info,
  Wrench,
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
  inspectFacebookToken,
  diagnoseFacebookPage,
  resubscribeFacebookPage,
} from "@/lib/api";
import { toast } from "@/lib/toast";

export default function IntegrationsPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "CONNECTED">("ALL");

  // Facebook Drawer State
  const [showFacebookDrawer, setShowFacebookDrawer] = useState(false);
  const [pageToggles, setPageToggles] = useState<Record<string, { chat: boolean; comment: boolean; privateInbox: boolean }>>({});

  // Add Page Modal with Auto-Detect
  const [showAddModal, setShowAddModal] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [pageNameInput, setPageNameInput] = useState("");
  const [fbPageIdInput, setFbPageIdInput] = useState("");
  const [isDetectingToken, setIsDetectingToken] = useState(false);
  const [detectedSuccess, setDetectedSuccess] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Page Settings Modal
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editAiMode, setEditAiMode] = useState<"AUTO" | "HYBRID" | "MANUAL" | "OFF">("AUTO");
  const [editTemperature, setEditTemperature] = useState(0.3);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Diagnostic Modal State
  const [diagnosingPage, setDiagnosingPage] = useState<any | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [isResubscribing, setIsResubscribing] = useState(false);

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

      const waConfigData = waRes?.data || waRes;
      if (waConfigData && (waConfigData.phoneNumberId || waConfigData.accessToken)) {
        setWhatsAppConfig((prev) => ({
          ...prev,
          ...waConfigData,
          isConnected: Boolean(waConfigData.phoneNumberId && waConfigData.accessToken),
        }));
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("mogent_whatsapp_config", JSON.stringify(waConfigData));
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

  const handleTokenChange = async (tokenVal: string) => {
    setTokenInput(tokenVal);
    setDetectedSuccess(false);
    setAddModalError(null);

    if (tokenVal.trim().length > 25) {
      setIsDetectingToken(true);
      const inspection = await inspectFacebookToken(tokenVal.trim());
      setIsDetectingToken(false);
      if (inspection.success && inspection.data) {
        setPageNameInput(inspection.data.name);
        setFbPageIdInput(inspection.data.pageId);
        setDetectedSuccess(true);
      } else {
        setAddModalError(inspection.error || "Invalid token or permissions.");
      }
    }
  };

  const handleOpenPageSettings = (p: any) => {
    setEditingPage(p);
    setEditPrompt(p.systemPrompt || "");
    setEditAiMode(p.aiMode || "AUTO");
    setEditTemperature(p.temperature ?? 0.3);
  };

  const handleSavePageSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    setIsSavingSettings(true);
    try {
      await updatePageSettings(editingPage.id, {
        systemPrompt: editPrompt,
        aiMode: editAiMode,
        temperature: Number(editTemperature),
      });
      toast.success("Page AI Persona & Settings Saved! 🤖");
      setPages((prev) =>
        prev.map((p) =>
          p.id === editingPage.id
            ? { ...p, systemPrompt: editPrompt, aiMode: editAiMode, temperature: Number(editTemperature) }
            : p
        )
      );
      setEditingPage(null);
    } catch {
      toast.error("Failed to update page settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !pageNameInput.trim()) return;
    setIsAdding(true);
    setAddModalError(null);
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
      setDetectedSuccess(false);
      toast.success("Facebook Page Connected! 🎉");
      await loadData();
    } catch (err: any) {
      setAddModalError(err.message || "Failed to connect Facebook Page");
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

  const handleOpenDiagnose = async (page: any) => {
    setDiagnosingPage(page);
    setDiagnosticResult(null);
    setDiagnosticError(null);
    setIsDiagnosing(true);
    try {
      const res = await diagnoseFacebookPage(page.id);
      if (res?.success && res.data) {
        setDiagnosticResult(res.data);
      } else {
        setDiagnosticError(res?.error || "ডায়াগনসিস সম্পন্ন করতে সমস্যা হয়েছে");
      }
    } catch (err: any) {
      setDiagnosticError(err?.message || "ডায়াগনসিস রিকোয়েস্টে সমস্যা হয়েছে");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleResubscribe = async (pageId: string) => {
    setIsResubscribing(true);
    try {
      const res = await resubscribeFacebookPage(pageId);
      if (res?.success) {
        toast.success("মেটা ওয়েবহুক সফলভাবে রি-সাবস্ক্রাইব করা হয়েছে! 🎉");
        const diagRes = await diagnoseFacebookPage(pageId);
        if (diagRes?.success && diagRes.data) {
          setDiagnosticResult(diagRes.data);
        }
        loadData();
      } else {
        toast.error("রি-সাবস্ক্রাইব ব্যর্থ হয়েছে", { description: res?.error || "মেটা এরর পাওয়া গেছে।" });
      }
    } catch (err: any) {
      toast.error("রিকোয়েস্টে সমস্যা হয়েছে", { description: err.message });
    } finally {
      setIsResubscribing(false);
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#FFFBEB] text-[#D97706] font-bold text-xs flex items-center justify-center border border-[#FDE68A] shrink-0">
                          {p.name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111827] truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={cn(
                                "text-[10px] font-medium flex items-center gap-0.5",
                                p.webhookStatus === "SUBSCRIBED"
                                  ? "text-[#059669]"
                                  : "text-[#D97706] font-bold"
                              )}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {p.webhookStatus || "SUBSCRIBED"}
                            </span>
                            <span className="text-[#D1D5DB]">•</span>
                            <span className="text-[10px] text-[#6B7280]">
                              AI: {p.aiMode || "AUTO"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenDiagnose(p)}
                          className="px-2.5 py-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-xs font-bold text-[#1D4ED8] flex items-center gap-1 transition-colors cursor-pointer"
                          title="কানেকশন ডায়াগনসিস ও অটো-ফিক্স"
                        >
                          <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>ডায়াগনসিস</span>
                        </button>

                        <button
                          onClick={() => handleOpenPageSettings(p)}
                          className="px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-bold text-[#374151] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Configure AI Persona & Prompt"
                        >
                          <Bot className="w-3.5 h-3.5 text-[#F59E0B]" />
                          <span>AI Persona</span>
                        </button>

                        <button
                          onClick={() => setDeleteItem(p)}
                          className="p-1.5 rounded-lg text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                          title="Delete Page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Add Facebook Page Modal with Smart Token Auto-Detect */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                <h3 className="text-sm font-bold text-[#111827]">Connect Facebook Page</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#9CA3AF] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {addModalError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs">
                {addModalError}
              </div>
            )}

            <form onSubmit={handleAddPage} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#374151]">Page Access Token *</label>
                  {isDetectingToken && (
                    <span className="text-[11px] text-[#F59E0B] flex items-center gap-1 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" /> Auto-detecting...
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Paste Page Access Token (EAAB...)"
                  value={tokenInput}
                  onChange={(e) => handleTokenChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#CBD5E1] text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {detectedSuccess && (
                <div className="p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold">Verified: {pageNameInput}</span>
                    <span className="block text-[10px] text-[#059669] font-mono">Page ID: {fbPageIdInput}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Page Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Shop Name"
                    value={pageNameInput}
                    onChange={(e) => setPageNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Page ID</label>
                  <input
                    type="text"
                    placeholder="Page ID"
                    value={fbPageIdInput}
                    onChange={(e) => setFbPageIdInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-[#4B5563]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !tokenInput.trim() || !pageNameInput.trim()}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-extrabold disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isAdding ? "Connecting..." : "Connect Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Page AI Persona & Settings Modal */}
      {editingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="text-sm font-bold text-[#111827]">
                  AI Persona & Settings: {editingPage.name}
                </h3>
              </div>
              <button onClick={() => setEditingPage(null)} className="text-[#9CA3AF] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePageSettings} className="space-y-4">
              {/* AI Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1.5">
                  AI Automation Mode
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
                  {(["AUTO", "HYBRID", "MANUAL", "OFF"] as const).map((mode) => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setEditAiMode(mode)}
                      className={cn(
                        "py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center",
                        editAiMode === mode
                          ? "bg-[#F59E0B] text-black shadow-xs"
                          : "text-[#6B7280] hover:text-[#111827]"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1">
                  AUTO: Full AI response. HYBRID: AI assists agents. MANUAL: Agent only. OFF: Disabled.
                </p>
              </div>

              {/* System Persona */}
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1">
                  AI System Persona & Rules
                </label>
                <textarea
                  rows={4}
                  placeholder="You are a polite, helpful customer service executive for this Facebook page. Answer customer questions concisely in friendly Bangla..."
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B] leading-relaxed font-medium"
                />
              </div>

              {/* Temperature */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#374151]">
                    Creativity / Temperature ({editTemperature})
                  </label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editTemperature}
                  onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-[#F59E0B]"
                />
                <div className="flex justify-between text-[10px] text-[#6B7280]">
                  <span>0.0 (Strict / Factual)</span>
                  <span>0.5 (Balanced)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#4B5563]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-extrabold disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingSettings ? "Saving..." : "Save Settings"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostic & Webhook Auto-Fix Modal */}
      {diagnosingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8]">
                  <Activity className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <span>লাইভ ডায়াগনসিস ও ফিক্স: {diagnosingPage.name}</span>
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    Page ID: <span className="font-mono font-medium">{diagnosingPage.pageId}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiagnosingPage(null)}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#E2E8F0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {isDiagnosing ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
                  <p className="text-sm font-bold text-[#1E293B]">মেটা গ্রাফ এপিআই ও ওয়েবহুক চেক করা হচ্ছে...</p>
                  <p className="text-xs text-[#64748B]">টোকেন ভ্যালিডিটি, পেজ পারমিশন ও সাবস্ক্রিপশন স্ট্যাটাস যাচাই চলছে।</p>
                </div>
              ) : diagnosticError ? (
                <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#991B1B]">ডায়াগনসিসে সমস্যা হয়েছে</h4>
                      <p className="text-xs text-[#B91C1C] mt-0.5">{diagnosticError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenDiagnose(diagnosingPage)}
                    className="px-3 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>আবার চেষ্টা করুন</span>
                  </button>
                </div>
              ) : diagnosticResult ? (
                <div className="space-y-5">
                  {/* Status Banner */}
                  {diagnosticResult.issues && diagnosticResult.issues.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-[#166534]">সবকিছু প্রস্তুত ও সক্রিয়!</h4>
                        <p className="text-xs text-[#15803D] mt-0.5">
                          টোকেন ভ্যালিড এবং মেটা ওয়েবহুক সঠিকভাবে সাবস্ক্রাইব করা রয়েছে।
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-[#92400E]">
                          {diagnosticResult.issues?.length || 1} টি সম্ভাব্য সমস্যা শনাক্ত হয়েছে
                        </h4>
                        <p className="text-xs text-[#B45309] mt-0.5">
                          নিচের তথ্য ও সমাধানগুলো অনুসরণ করুন যাতে বট নিরবচ্ছিন্নভাবে কাজ করে।
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Auto-fix success banner if triggered */}
                  {diagnosticResult.autoFixSuccess && (
                    <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <p className="text-xs font-bold text-[#1E40AF]">
                        ⚡ মেটা ওয়েবহুক সংযোগ বিচ্ছিন্ন ছিল, ডায়াগনসিস স্বয়ংক্রিয়ভাবে Re-Subscribe করে ঠিক করে দিয়েছে!
                      </p>
                    </div>
                  )}

                  {/* Diagnostic Checks Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Check 1: Token Validity */}
                    <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#64748B]">Facebook Token</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            diagnosticResult.tokenValid
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEE2E2] text-[#991B1B]"
                          )}
                        >
                          {diagnosticResult.tokenValid ? "VALID (সক্রিয়)" : "EXPIRED / INVALID"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1E293B]">
                        {diagnosticResult.metaPageName || diagnosticResult.pageName}
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        Type:{" "}
                        <span
                          className={cn(
                            "font-bold font-mono",
                            diagnosticResult.tokenType === "PAGE"
                              ? "text-[#16A34A]"
                              : "text-[#DC2626]"
                          )}
                        >
                          {diagnosticResult.tokenType === "PAGE"
                            ? "Page Access Token ✅"
                            : diagnosticResult.tokenType === "USER"
                            ? "User Token ⚠️ (Page Token দিন)"
                            : "Unknown"}
                        </span>
                      </p>
                    </div>

                    {/* Check 2: Webhook Subscription */}
                    <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#64748B]">Meta Webhook</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            diagnosticResult.isWebhookSubscribed
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEE2E2] text-[#991B1B]"
                          )}
                        >
                          {diagnosticResult.isWebhookSubscribed ? "SUBSCRIBED ✅" : "NOT SUBSCRIBED ❌"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1E293B]">Subscribed Fields</p>
                      <p className="text-[10px] text-[#64748B] truncate font-mono">
                        {diagnosticResult.subscribedFields?.length > 0
                          ? diagnosticResult.subscribedFields.join(", ")
                          : "None"}
                      </p>
                    </div>

                    {/* Check 3: Permissions */}
                    <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#64748B]">Messaging Permission</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            diagnosticResult.hasMessagingPermission
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEF3C7] text-[#92400E]"
                          )}
                        >
                          {diagnosticResult.hasMessagingPermission ? "GRANTED ✅" : "MISSING ⚠️"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1E293B]">pages_messaging</p>
                      <p className="text-[10px] text-[#64748B]">
                        Required for auto-reply & read receipts
                      </p>
                    </div>

                    {/* Check 4: Mogent Status */}
                    <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#64748B]">Mogent Status</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            diagnosticResult.isActive
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEE2E2] text-[#991B1B]"
                          )}
                        >
                          {diagnosticResult.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#1E293B]">
                        AI Mode: <span className="text-[#D97706] font-bold">{diagnosticResult.aiMode}</span>
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        System Prompt & Guardrails Ready
                      </p>
                    </div>
                  </div>

                  {/* Issues List */}
                  {diagnosticResult.issues && diagnosticResult.issues.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] space-y-2">
                      <h4 className="text-xs font-bold text-[#991B1B] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                        <span>শনাক্ত হওয়া সমস্যাগুলো:</span>
                      </h4>
                      <ul className="space-y-1.5 pl-5 list-disc text-xs text-[#B91C1C]">
                        {diagnosticResult.issues.map((iss: string, idx: number) => (
                          <li key={idx} className="leading-relaxed font-medium">
                            {iss}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Step-by-Step Actionable Advice & Meta Dev Rules */}
                  <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2.5">
                    <h4 className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#16A34A]" />
                      <span>সমাধান ও মেটা কনফিগারেশন নির্দেশিকা:</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-[#15803D]">
                      {diagnosticResult.actionableSteps?.map((step: string, idx: number) => (
                        <li key={idx} className="leading-relaxed pl-1 font-medium">
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Webhook Configuration Quick Info */}
                  <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2 text-xs">
                    <p className="font-bold text-[#334155]">Meta Developer Webhook Settings (যদি ম্যানুয়ালি সেট করতে চান):</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#64748B]">Callback URL:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="bg-white px-2 py-1 rounded border border-[#CBD5E1] text-[#0F172A] font-mono break-all text-[10px]">
                            {diagnosticResult.webhookCallbackUrl}
                          </code>
                        </div>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Verify Token:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="bg-white px-2 py-1 rounded border border-[#CBD5E1] text-[#0F172A] font-mono text-[10px]">
                            {diagnosticResult.verifyToken}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDiagnosingPage(null)}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-[#F1F5F9] transition-colors"
              >
                বন্ধ করুন
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDiagnosing}
                  onClick={() => handleOpenDiagnose(diagnosingPage)}
                  className="px-3.5 py-2 rounded-xl border border-[#CBD5E1] hover:bg-[#F1F5F9] text-xs font-bold text-[#334155] flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isDiagnosing && "animate-spin")} />
                  <span>পুনরায় ডায়াগনসিস</span>
                </button>

                <button
                  type="button"
                  disabled={isResubscribing || isDiagnosing}
                  onClick={() => handleResubscribe(diagnosingPage.id)}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isResubscribing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5" />
                  )}
                  <span>{isResubscribing ? "ফিক্স করা হচ্ছে..." : "Webhook Re-Subscribe ফিক্স"}</span>
                </button>
              </div>
            </div>
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

