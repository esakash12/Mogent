"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchPages,
  createPage,
  updatePageSettings,
  deletePage,
  inspectFacebookToken,
  connectFacebookPagesOAuth,
  fetchFacebookConfig
} from "@/lib/api";

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
  const [modalTab, setModalTab] = useState<"OAUTH" | "MANUAL">("OAUTH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Meta App Config from backend
  const [fbConfig, setFbConfig] = useState<{
    appId: string;
    webhookUrl: string;
    verifyToken: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // OAuth Flow States
  const [isSdkLoading, setIsSdkLoading] = useState(false);
  const [fetchedUserPages, setFetchedUserPages] = useState<any[]>([]);
  const [selectedOAuthPages, setSelectedOAuthPages] = useState<{ [id: string]: boolean }>({});

  // Manual Auto-Detect States
  const [manualToken, setManualToken] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPageId, setManualPageId] = useState("");
  const [manualCategory, setManualCategory] = useState("E-Commerce");
  const [manualSystemPrompt, setManualSystemPrompt] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedSuccess, setDetectedSuccess] = useState(false);

  const loadPages = async () => {
    setLoading(true);
    const data = await fetchPages();
    setPages(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPages();
    fetchFacebookConfig().then((cfg) => {
      if (cfg) setFbConfig(cfg);
    });

    // Initialize Facebook JavaScript SDK
    if (typeof window !== "undefined") {
      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: "10928491823901", // Default fallback if not yet set
          cookie: true,
          xfbml: true,
          version: "v20.0",
        });
      };

      // Load SDK if not loaded
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

  // 1-Click "Continue with Facebook" OAuth Action
  const handleContinueWithFacebook = () => {
    setIsSdkLoading(true);
    setError(null);

    const FB = (window as any).FB;
    if (!FB) {
      setError("Facebook SDK is loading or blocked by your browser extension. You can use the Smart Manual Token tab.");
      setIsSdkLoading(false);
      return;
    }

    // Re-init with latest app ID if available
    if (fbConfig?.appId) {
      FB.init({
        appId: fbConfig.appId,
        cookie: true,
        xfbml: true,
        version: "v20.0",
      });
    }

    FB.login(
      (response: any) => {
        if (response.authResponse) {
          // Fetch user's pages with access tokens
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
                setError("No Facebook Pages found on this account. Please make sure you are an Admin of a Facebook Page.");
              }
            }
          );
        } else {
          setIsSdkLoading(false);
          setError("Facebook authorization was cancelled or closed.");
        }
      },
      {
        scope: "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,public_profile",
        return_scopes: true,
      }
    );
  };

  // Submit selected OAuth pages
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
      setError("Please select at least one Facebook Page to connect.");
      return;
    }

    setIsSubmitting(true);
    const res = await connectFacebookPagesOAuth(pagesToSave);

    if (res.success) {
      setShowModal(false);
      setFetchedUserPages([]);
      loadPages();
    } else {
      setError(res.error || "Failed to connect Facebook Pages.");
    }
    setIsSubmitting(false);
  };

  // Auto-Detect Manual Token on Change/Paste
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

  const handleManualAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setError("Please paste your Page Access Token.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const created = await createPage({
      name: manualName || "Facebook Page",
      pageId: manualPageId,
      accessToken: manualToken.trim(),
      systemPrompt: manualSystemPrompt || undefined,
      category: manualCategory,
    });

    if (created) {
      setPages((prev) => [created, ...prev.filter((p) => p.pageId !== created.pageId)]);
      setShowModal(false);
      setManualToken("");
      setManualName("");
      setManualPageId("");
      setManualSystemPrompt("");
      setDetectedSuccess(false);
    } else {
      setError("Failed to connect Facebook page. Please verify your token.");
    }
    setIsSubmitting(false);
  };

  const handleModeChange = async (pageId: string, newMode: "AUTO" | "HYBRID" | "MANUAL" | "OFF") => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, aiMode: newMode } : p))
    );
    await updatePageSettings(pageId, { aiMode: newMode });
  };

  const handleDelete = async (pageId: string, pageName: string) => {
    if (!confirm(`Are you sure you want to disconnect Facebook Page [${pageName}]?`)) return;
    setPages((prev) => prev.filter((p) => p.id !== pageId));
    await deletePage(pageId);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">Connected Facebook Pages</h1>
          <p className="text-xs text-[#888]">
            Connect your business Facebook Pages with 1-click or Graph API token for Gemini 2.0 AI automation.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setFetchedUserPages([]);
            setShowModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Facebook Page</span>
        </button>
      </div>

      {/* Developer Webhook & Meta Compliance Resource Bar */}
      <div className="p-4 rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Facebook className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-[#EDEDED] block">Meta Webhook Gateway Status: <strong className="text-[#10B981]">Active & Ready</strong></span>
            <span className="text-[11px] text-[#777]">Callback: <code className="text-[#AAA] font-mono select-all">https://api.mogent.tech/webhook/facebook</code></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <Link href="/privacy" target="_blank" className="text-[#888] hover:text-amber-500 transition-colors flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Privacy Policy</span>
          </Link>
          <span className="text-[#333]">•</span>
          <Link href="/terms" target="_blank" className="text-[#888] hover:text-amber-500 transition-colors">
            Terms
          </Link>
          <span className="text-[#333]">•</span>
          <Link href="/data-deletion" target="_blank" className="text-[#888] hover:text-amber-500 transition-colors">
            Data Deletion
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          <span className="text-xs text-[#888]">Loading connected pages...</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-[#222] bg-[#0A0A0A] flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-blue-400">
            <Facebook className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#EDEDED]">No Facebook Pages Connected Yet</h3>
            <p className="text-xs text-[#777] max-w-sm">
              Connect your business Facebook page to start automating Messenger sales, answering customer inquiries, and capturing orders with Gemini 2.0 AI.
            </p>
          </div>
          <button
            onClick={() => {
              setError(null);
              setFetchedUserPages([]);
              setShowModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect First Facebook Page</span>
          </button>
        </div>
      ) : (
        /* Pages List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] space-y-4 hover:border-[#333] transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#EDEDED]">{page.name}</h3>
                      <p className="text-[10px] text-[#888] font-mono mt-0.5">Page ID: {page.pageId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                      <CheckCircle2 className="w-3 h-3" />
                      {page.webhookStatus || "SUBSCRIBED"}
                    </span>
                    <button
                      onClick={() => handleDelete(page.id, page.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors cursor-pointer"
                      title="Disconnect page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* AI Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-[#888]">AI Automation Mode</label>
                  <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#111] border border-[#222] text-[11px]">
                    {(["AUTO", "HYBRID", "MANUAL", "OFF"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => handleModeChange(page.id, mode)}
                        className={cn(
                          "py-1 rounded-lg font-medium transition-colors cursor-pointer text-center",
                          page.aiMode === mode
                            ? "bg-amber-500 text-black font-bold shadow-sm"
                            : "text-[#888] hover:text-[#EDEDED]"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Persona Snippet */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#888] flex items-center gap-1">
                    <Bot className="w-3 h-3 text-amber-500" />
                    <span>AI Persona</span>
                  </label>
                  <p className="text-[11px] text-[#AAA] bg-[#111] p-3 rounded-xl border border-[#222] leading-relaxed line-clamp-2">
                    "{page.systemPrompt}"
                  </p>
                </div>
              </div>

              {/* Footer Settings Info */}
              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-[10px] text-[#777]">
                <span className="flex items-center gap-1 text-[#10B981]">
                  <ShieldCheck className="w-3 h-3" />
                  AES-256 Encrypted
                </span>
                <span>Temp: {page.temperature || 0.3}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Facebook Page Modal (Dual-Mode: 1-Click OAuth + Smart Auto-Detect) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Facebook className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#EDEDED]">Connect Facebook Page</h3>
                  <p className="text-[10px] text-[#888]">Choose 1-Click OAuth or Manual Graph API token</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Selector Tabs: 1-Click vs Manual */}
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

            {/* TAB 1: 1-CLICK OAUTH FACEBOOK LOGIN */}
            {modalTab === "OAUTH" && (
              <div className="space-y-4">
                {fetchedUserPages.length === 0 ? (
                  <div className="p-6 rounded-xl border border-[#222] bg-[#0A0A0A] text-center space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-sm text-[#EDEDED]">Zero Configuration Required</h4>
                      <p className="text-xs text-[#888] leading-relaxed max-w-xs mx-auto">
                        No developer accounts or manual tokens needed. Click below to grant permissions and select your business Facebook Pages.
                      </p>
                    </div>

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
                  /* Fetched Pages List Selector */
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

            {/* TAB 2: SMART MANUAL GRAPH API TOKEN PASTE (WITH AUTO-DETECT) */}
            {modalTab === "MANUAL" && (
              <form onSubmit={handleManualAddPage} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[#888]">Page Access Token (EAA...)</label>
                    {isDetecting && (
                      <span className="text-[11px] text-amber-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Auto-detecting Page...</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Paste Page Access Token (EAAB...)"
                    value={manualToken}
                    onChange={(e) => handleTokenChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-[#666]">
                    Paste your token to automatically fetch Page Name, ID, and category from Meta Graph API.
                  </p>
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
                    <label className="text-[11px] font-medium text-[#888]">Page Name (Auto)</label>
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
                    <label className="text-[11px] font-medium text-[#888]">Page ID (Auto)</label>
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

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#888]">AI System Persona (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="You are a friendly customer service assistant..."
                    value={manualSystemPrompt}
                    onChange={(e) => setManualSystemPrompt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Developer Setup Info Box */}
                <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#888]">Webhook Callback URL:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("https://api.mogent.tech/webhook/facebook", "webhook")}
                      className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-mono"
                    >
                      {copiedField === "webhook" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "webhook" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-1.5 rounded bg-[#111] font-mono text-[10px] text-[#EDEDED] select-all">
                    https://api.mogent.tech/webhook/facebook
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#888]">Verify Token:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy("mogent_fb_verify_token_secure", "verify")}
                      className="text-amber-500 hover:text-amber-400 flex items-center gap-1 font-mono"
                    >
                      {copiedField === "verify" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "verify" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="p-1.5 rounded bg-[#111] font-mono text-[10px] text-amber-500 select-all">
                    mogent_fb_verify_token_secure
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-[#EDEDED]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Connect Facebook Page</span>}
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
