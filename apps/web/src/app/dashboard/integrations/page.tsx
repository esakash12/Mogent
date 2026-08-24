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
  Bot,
  Copy,
  Check,
  Shield,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchPages,
  createPage,
  deletePage,
  updatePageSettings,
  inspectFacebookToken,
  connectFacebookPagesOAuth,
  fetchFacebookConfig
} from "@/lib/api";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"FACEBOOK" | "TELEGRAM" | "WEBHOOKS">("FACEBOOK");
  const [pages, setPages] = useState<any[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  // Telegram States
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);

  // New Page Modal States
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [modalTab, setModalTab] = useState<"OAUTH" | "MANUAL">("OAUTH");
  const [manualToken, setManualToken] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [manualCategory, setManualCategory] = useState("E-Commerce");
  const [manualSystemPrompt, setManualSystemPrompt] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedSuccess, setDetectedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth States
  const [isSdkLoading, setIsSdkLoading] = useState(false);
  const [fetchedUserPages, setFetchedUserPages] = useState<any[]>([]);
  const [selectedOAuthPages, setSelectedOAuthPages] = useState<{ [id: string]: boolean }>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

    // Init Facebook SDK
    if (typeof window !== "undefined") {
      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: "10928491823901",
          cookie: true,
          xfbml: true,
          version: "v20.0",
        });
      };
      if (!document.getElementById("facebook-jssdk")) {
        const js = document.createElement("script");
        js.id = "facebook-jssdk";
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        document.body.appendChild(js);
      }
    }
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 1-Click Facebook Login
  const handleContinueWithFacebook = () => {
    setIsSdkLoading(true);
    setError(null);

    const FB = (window as any).FB;
    if (!FB) {
      setError("Facebook SDK is initializing. You can also use the Smart Token Paste tab.");
      setIsSdkLoading(false);
      return;
    }

    FB.login(
      (response: any) => {
        if (response.authResponse) {
          FB.api(
            "/me/accounts?fields=id,name,category,access_token,picture{url}",
            (res: any) => {
              setIsSdkLoading(false);
              if (res.data && res.data.length > 0) {
                setFetchedUserPages(res.data);
                const initialSelected: { [id: string]: boolean } = {};
                res.data.forEach((p: any) => {
                  initialSelected[p.id] = true;
                });
                setSelectedOAuthPages(initialSelected);
              } else {
                setError("No Facebook Pages found on this account.");
              }
            }
          );
        } else {
          setIsSdkLoading(false);
          setError("Facebook authorization was cancelled.");
        }
      },
      {
        scope: "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,public_profile",
        return_scopes: true,
      }
    );
  };

  const handleSaveOAuthPages = async () => {
    const pagesToSave = fetchedUserPages
      .filter((p) => selectedOAuthPages[p.id])
      .map((p) => ({
        id: p.id,
        name: p.name,
        accessToken: p.access_token,
        category: p.category || "E-Commerce",
      }));

    if (pagesToSave.length === 0) {
      setError("Please select at least one page.");
      return;
    }

    setIsSubmitting(true);
    const res = await connectFacebookPagesOAuth(pagesToSave);

    if (res.success) {
      setShowAddPageModal(false);
      setFetchedUserPages([]);
      loadPages();
    } else {
      setError(res.error || "Failed to connect Facebook Pages.");
    }
    setIsSubmitting(false);
  };

  const handleTokenChange = async (tokenVal: string) => {
    setManualToken(tokenVal);
    setDetectedSuccess(false);

    if (tokenVal.trim().length > 25) {
      setIsDetecting(true);
      setError(null);
      const inspection = await inspectFacebookToken(tokenVal.trim());
      setIsDetecting(false);

      if (inspection.success && inspection.data) {
        setManualName(inspection.data.name);
        setManualPageId(inspection.data.pageId);
        setManualCategory(inspection.data.category || "E-Commerce");
        setDetectedSuccess(true);
      } else {
        setError(inspection.error || "Invalid Page Access Token.");
      }
    }
  };

  const handleManualCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;

    setIsSubmitting(true);
    const res = await createPage({
      name: manualName || "Facebook Page",
      pageId: manualPageId,
      accessToken: manualToken.trim(),
      systemPrompt: manualSystemPrompt || undefined,
      category: manualCategory,
    });

    if (res) {
      setShowAddPageModal(false);
      setManualToken("");
      setManualName("");
      setManualPageId("");
      setManualSystemPrompt("");
      setDetectedSuccess(false);
      loadPages();
    } else {
      setError("Failed to connect Facebook Page. Please verify your token.");
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

        {/* Sector Top Navigation Tabs */}
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
              onClick={() => {
                setError(null);
                setFetchedUserPages([]);
                setShowAddPageModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Facebook Page</span>
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
                  Connect your business Facebook Page via 1-Click login or token to start automating Messenger replies and order booking with Gemini AI.
                </p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setFetchedUserPages([]);
                  setShowAddPageModal(true);
                }}
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
                        <h4 className="font-bold text-sm text-[#EDEDED]">{p.name || p.pageName}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] text-[#888] border border-[#333]">
                          ID: {p.pageId || p.facebookPageId}
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
                      Mode: {p.aiMode || "AUTO"}
                    </button>

                    <button
                      onClick={() => handleDeletePage(p.id, p.name || p.pageName)}
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
              <div className="flex items-center justify-between">
                <span className="text-[#888]">Callback URL:</span>
                <button
                  type="button"
                  onClick={() => handleCopy("https://api.mogent.tech/webhook/facebook", "webhook_tab")}
                  className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedField === "webhook_tab" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === "webhook_tab" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-[#EDEDED] select-all font-mono">
                https://api.mogent.tech/webhook/facebook
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#888]">Verify Token:</span>
                <button
                  type="button"
                  onClick={() => handleCopy("mogent_fb_verify_token_secure", "verify_tab")}
                  className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedField === "verify_tab" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === "verify_tab" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[#111] border border-[#222] text-amber-500 select-all font-mono">
                mogent_fb_verify_token_secure
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Connect Facebook Page (Dual-Mode: 1-Click + Manual) */}
      {showAddPageModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div className="flex items-center gap-2.5">
                <Facebook className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-[#EDEDED]">Connect Facebook Page</h3>
              </div>
              <button
                onClick={() => setShowAddPageModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0A0A0A] border border-[#222] text-xs">
              <button
                onClick={() => {
                  setModalTab("OAUTH");
                  setError(null);
                }}
                className={cn(
                  "py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  modalTab === "OAUTH"
                    ? "bg-white text-black shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>1-Click OAuth Login</span>
              </button>

              <button
                onClick={() => {
                  setModalTab("MANUAL");
                  setError(null);
                }}
                className={cn(
                  "py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                  modalTab === "MANUAL"
                    ? "bg-white text-black shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Smart Token Paste</span>
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {modalTab === "OAUTH" && (
              <div className="space-y-4">
                {fetchedUserPages.length === 0 ? (
                  <div className="p-6 rounded-xl border border-[#222] bg-[#0A0A0A] text-center space-y-4">
                    <p className="text-xs text-[#888] leading-relaxed max-w-xs mx-auto">
                      Click below to authorize your Facebook Pages in 1-click. No developer account required.
                    </p>

                    <button
                      onClick={handleContinueWithFacebook}
                      disabled={isSdkLoading}
                      className="w-full py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                      {isSdkLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Connecting with Facebook...</span>
                        </>
                      ) : (
                        <>
                          <Facebook className="w-4 h-4 fill-current" />
                          <span>Continue with Facebook</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-[#EDEDED] block">
                      Select Facebook Pages to Connect ({fetchedUserPages.length} found):
                    </span>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {fetchedUserPages.map((p) => {
                        const isChecked = Boolean(selectedOAuthPages[p.id]);
                        return (
                          <div
                            key={p.id}
                            onClick={() =>
                              setSelectedOAuthPages((prev) => ({
                                ...prev,
                                [p.id]: !prev[p.id],
                              }))
                            }
                            className={cn(
                              "p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer",
                              isChecked
                                ? "bg-blue-500/10 border-blue-500/40 text-[#EDEDED]"
                                : "bg-[#0A0A0A] border-[#222] text-[#888] hover:border-[#333]"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded accent-blue-500"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-xs truncate">{p.name}</p>
                                <p className="text-[10px] text-[#666] font-mono">ID: {p.id}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111] border border-[#222] text-[#888]">
                              {p.category || "Page"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleSaveOAuthPages}
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Subscribing Webhooks & Saving...</span>
                        </>
                      ) : (
                        <span>Connect Selected Facebook Pages</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {modalTab === "MANUAL" && (
              <form onSubmit={handleManualCreatePage} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#888]">Page Access Token (EAA...)</label>
                    {isDetecting && (
                      <span className="text-[11px] text-amber-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Auto-detecting...</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Paste Page Access Token (EAAB...)"
                    value={manualToken}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {detectedSuccess && (
                  <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="font-bold">Verified: {manualName}</p>
                      <p className="text-[10px] text-[#888] font-mono">Page ID: {manualPageId} • {manualCategory}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#888]">Page Name (Auto)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. My Shop"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#888]">Page ID (Auto)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 109284918239"
                      value={manualPageId}
                      onChange={(e) => setManualPageId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222]">
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
