"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Key,
  Bot,
  Bell,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Facebook,
  Loader2,
  Copy,
  Check,
  Zap,
  Cloud,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminGlobalSettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Meta Developer App Settings
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("mogent_fb_verify_token_secure");

  // System Settings
  const [defaultModel, setDefaultModel] = useState("gemini-3.5-flash-lite");
  const [cooldownSecs, setCooldownSecs] = useState("60");
  // Master Telegram Bot Settings
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgBotUsername, setTgBotUsername] = useState("MogentAlertBot");
  const [telegramChatId, setTelegramChatId] = useState("-1002349182390");

  // Cloudflare R2 Storage Settings
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfAccessKeyId, setCfAccessKeyId] = useState("");
  const [cfSecretAccessKey, setCfSecretAccessKey] = useState("");
  const [cfBucketName, setCfBucketName] = useState("mogent-assets");
  const [cfPublicDomain, setCfPublicDomain] = useState("");

  // Payment Gateways Settings (bKash, Nagad, Rocket)
  const [bkashNumber, setBkashNumber] = useState("01711998877");
  const [bkashType, setBkashType] = useState("Personal (Send Money)");
  const [nagadNumber, setNagadNumber] = useState("01711998877");
  const [nagadType, setNagadType] = useState("Personal (Send Money)");
  const [rocketNumber, setRocketNumber] = useState("01711998877-0");
  const [rocketType, setRocketType] = useState("Personal (Send Money)");
  const [paymentInstructions, setPaymentInstructions] = useState(
    "Send the exact plan amount to any number above, then enter your mobile number and Transaction ID (TrxID) for instant admin verification."
  );

  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : "";
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/api/admin/meta-config`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/api/admin/telegram-master-config`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/api/admin/cloudflare-config`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/api/admin/payment-config`, { headers }).then((r) => r.json()),
    ])
      .then(([metaJson, tgJson, cfJson, payJson]) => {
        if (metaJson.success && metaJson.data) {
          setAppId(metaJson.data.appId || "");
          setAppSecret(metaJson.data.appSecret || "");
          setVerifyToken(metaJson.data.verifyToken || "mogent_fb_verify_token_secure");
        }
        if (tgJson.success && tgJson.data) {
          setTgBotToken(tgJson.data.botToken || "");
          setTgBotUsername(tgJson.data.botUsername || "MogentAlertBot");
          setTelegramChatId(tgJson.data.adminChatId || "-1002349182390");
        }
        if (cfJson.success && cfJson.data) {
          setCfAccountId(cfJson.data.accountId || "");
          setCfAccessKeyId(cfJson.data.accessKeyId || "");
          setCfSecretAccessKey(cfJson.data.secretAccessKey || "");
          setCfBucketName(cfJson.data.bucketName || "mogent-assets");
          setCfPublicDomain(cfJson.data.publicDomain || "");
        }
        if (payJson.success && payJson.data) {
          setBkashNumber(payJson.data.bkashNumber || "01711998877");
          setBkashType(payJson.data.bkashType || "Personal (Send Money)");
          setNagadNumber(payJson.data.nagadNumber || "01711998877");
          setNagadType(payJson.data.nagadType || "Personal (Send Money)");
          setRocketNumber(payJson.data.rocketNumber || "01711998877-0");
          setRocketType(payJson.data.rocketType || "Personal (Send Money)");
          setPaymentInstructions(payJson.data.instructions || "");
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingTg, setIsVerifyingTg] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; title: string; desc: string } | null>(null);

  const showToast = (type: "success" | "error", title: string, desc: string) => {
    setToastMessage({ type, title, desc });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerifyTelegramBot = async () => {
    if (!tgBotToken.trim()) {
      showToast("error", "Bot Token Required", "Please enter the Telegram Bot Token from BotFather.");
      return;
    }
    setIsVerifyingTg(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : "";
    try {
      const res = await fetch(`${API_BASE}/api/admin/telegram-master-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botToken: tgBotToken.trim(),
          botUsername: tgBotUsername.trim(),
          adminChatId: telegramChatId.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.botUsername) {
          setTgBotUsername(data.data.botUsername);
        }
        showToast(
          "success",
          "Telegram Bot Verified & Webhook Active! 🎉",
          `Connected to @${data.data?.botUsername || "Bot"}. Webhook is live and ready to receive /start pairing.`
        );
      } else {
        showToast("error", "Verification Failed", data.error || "Could not verify bot token.");
      }
    } catch (err: any) {
      showToast("error", "Verification Error", err.message || "Failed to connect to server.");
    }
    setIsVerifyingTg(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : "";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      const [metaRes, tgRes, cfRes, payRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/meta-config`, {
          method: "POST",
          headers,
          body: JSON.stringify({ appId, appSecret, verifyToken }),
        }),
        fetch(`${API_BASE}/api/admin/telegram-master-config`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            botToken: tgBotToken,
            botUsername: tgBotUsername,
            adminChatId: telegramChatId,
          }),
        }),
        fetch(`${API_BASE}/api/admin/cloudflare-config`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            accountId: cfAccountId,
            accessKeyId: cfAccessKeyId,
            secretAccessKey: cfSecretAccessKey,
            bucketName: cfBucketName,
            publicDomain: cfPublicDomain,
          }),
        }),
        fetch(`${API_BASE}/api/admin/payment-config`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            bkashNumber,
            bkashType,
            nagadNumber,
            nagadType,
            rocketNumber,
            rocketType,
            instructions: paymentInstructions,
          }),
        }),
      ]);

      const tgJson = await tgRes.json();
      if (tgJson.success && tgJson.data?.botUsername) {
        setTgBotUsername(tgJson.data.botUsername);
      }

      setIsSaved(true);
      showToast(
        "success",
        "Configurations Saved Successfully! ✅",
        "Meta OAuth, Telegram Master Webhook, Cloudflare Storage & Payment Accounts are now live."
      );
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err: any) {
      console.error("Save error:", err);
      showToast("error", "Failed to Save", err.message || "Something went wrong while saving settings.");
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin Global Config</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Meta Developer App & Global AI Settings
          </h1>
          <p className="text-[#888] text-xs mt-1">
            Configure centralized Meta Developer App for 1-click merchant onboarding and system-wide AI defaults.
          </p>
        </div>

        {isSaved && (
          <span className="px-3.5 py-2 rounded-xl bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-4 h-4" />
            Configurations Saved & Live!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Meta Developer App Settings */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              <Facebook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Central Meta Developer App (OAuth)</h3>
              <p className="text-xs text-[#888]">
                All merchants will connect their Facebook Pages using this App ID without needing their own developer account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Meta App ID (Facebook App ID)</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="e.g. 10928491823901"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Meta App Secret</label>
              <input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="••••••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Webhook Verify Token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Webhook Meta URL Details */}
          <div className="p-4 rounded-xl bg-[#111] border border-[#222] space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Meta Webhook Callback URL:</span>
              <button
                type="button"
                onClick={() => handleCopy("https://api.mogent.tech/webhook/facebook", "admin_wb")}
                className="text-amber-500 hover:text-amber-400 flex items-center gap-1 text-[11px]"
              >
                {copiedField === "admin_wb" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === "admin_wb" ? "Copied" : "Copy URL"}</span>
              </button>
            </div>
            <div className="p-2 rounded bg-[#0A0A0A] text-[#EDEDED] select-all">
              https://api.mogent.tech/webhook/facebook
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[10px] font-sans">
              <div className="p-2.5 rounded bg-[#0A0A0A] border border-[#222]">
                <span className="text-[#666] block">Privacy Policy URL:</span>
                <span className="text-[#EDEDED] font-mono">https://mogent.tech/privacy</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0A0A] border border-[#222]">
                <span className="text-[#666] block">Terms of Service URL:</span>
                <span className="text-[#EDEDED] font-mono">https://mogent.tech/terms</span>
              </div>
              <div className="p-2.5 rounded bg-[#0A0A0A] border border-[#222]">
                <span className="text-[#666] block">Data Deletion URL:</span>
                <span className="text-[#EDEDED] font-mono">https://mogent.tech/data-deletion</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. AI Engine & Key Rotator Defaults */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">AI Engine Defaults</h3>
              <p className="text-xs text-[#888]">Global defaults for all customer Facebook Messenger chatbots.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Default LLM Model</label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="gemini-3.5-flash-lite">Mogent Engine Ultra v3.5 (Recommended, Ultra Fast)</option>
                <option value="gemini-3.1-flash-lite">Mogent Engine Turbo v3.1 (High Speed, Lightweight)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Rate-Limit 429 Cooldown (Seconds)</label>
              <input
                type="number"
                value={cooldownSecs}
                onChange={(e) => setCooldownSecs(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. Single Master Telegram Bot Settings */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Single Master Telegram Bot (Platform Bot)</h3>
              <p className="text-xs text-[#888]">
                All merchants will connect their workspace to this central bot using 1-click deep links without creating their own bot tokens.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Master Telegram Bot Token (@BotFather)</label>
              <input
                type="password"
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                placeholder="e.g. 8784653620:AAF2Y-Hy3De5YLZ7WFqPVhzE26kHeitddoY"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Master Bot Username</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tgBotUsername}
                  onChange={(e) => setTgBotUsername(e.target.value)}
                  placeholder="e.g. MogentAlertBot"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyTelegramBot}
                  disabled={isVerifyingTg || !tgBotToken.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isVerifyingTg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{isVerifyingTg ? "Verifying..." : "Verify & Connect"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Super Admin Notifications Chat ID</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#111] border border-[#222] flex items-center justify-between text-xs font-mono">
            <div className="space-y-0.5">
              <span className="text-[11px] text-[#888] block">Telegram Webhook Endpoint:</span>
              <span className="text-[#EDEDED] text-[11px]">https://api.mogent.tech/webhook/telegram</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy("https://api.mogent.tech/webhook/telegram", "tg_wb")}
              className="text-amber-500 hover:text-amber-400 flex items-center gap-1 text-[11px] cursor-pointer"
            >
              {copiedField === "tg_wb" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedField === "tg_wb" ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* 4. Cloudflare R2 Storage Settings */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Cloudflare R2 Object Storage (Product Images)</h3>
              <p className="text-xs text-[#888]">
                Central image CDN credentials for merchant commerce catalog image uploads.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Cloudflare Account ID</label>
              <input
                type="text"
                value={cfAccountId}
                onChange={(e) => setCfAccountId(e.target.value)}
                placeholder="e.g. 9b8c7d6e5f4a3b2..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">R2 Bucket Name</label>
              <input
                type="text"
                value={cfBucketName}
                onChange={(e) => setCfBucketName(e.target.value)}
                placeholder="e.g. mogent-assets"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">R2 Access Key ID</label>
              <input
                type="text"
                value={cfAccessKeyId}
                onChange={(e) => setCfAccessKeyId(e.target.value)}
                placeholder="e.g. a1b2c3d4e5f6..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">R2 Secret Access Key</label>
              <input
                type="password"
                value={cfSecretAccessKey}
                onChange={(e) => setCfSecretAccessKey(e.target.value)}
                placeholder="••••••••••••••••••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Public CDN Domain / R2 Public URL</label>
            <input
              type="text"
              value={cfPublicDomain}
              onChange={(e) => setCfPublicDomain(e.target.value)}
              placeholder="e.g. https://cdn.mogent.tech or https://pub-xxx.r2.dev"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 5. Manual Payment Gateways / Receiver Accounts */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 shrink-0">
              <span className="font-bold text-sm">৳</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Manual Payment Receiver Accounts (bKash, Nagad, Rocket)</h3>
              <p className="text-xs text-[#888]">
                These numbers and instructions are shown dynamically to merchants on their billing checkout modal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-pink-400">bKash Receiver Number</label>
              <input
                type="text"
                value={bkashNumber}
                onChange={(e) => setBkashNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">bKash Account Type</label>
              <input
                type="text"
                value={bkashType}
                onChange={(e) => setBkashType(e.target.value)}
                placeholder="e.g. Personal (Send Money) / Merchant (Make Payment)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-orange-400">Nagad Receiver Number</label>
              <input
                type="text"
                value={nagadNumber}
                onChange={(e) => setNagadNumber(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Nagad Account Type</label>
              <input
                type="text"
                value={nagadType}
                onChange={(e) => setNagadType(e.target.value)}
                placeholder="e.g. Personal (Send Money)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-purple-400">Rocket Receiver Number</label>
              <input
                type="text"
                value={rocketNumber}
                onChange={(e) => setRocketNumber(e.target.value)}
                placeholder="017XXXXXXXX-X"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Rocket Account Type</label>
              <input
                type="text"
                value={rocketType}
                onChange={(e) => setRocketType(e.target.value)}
                placeholder="e.g. Personal (Send Money)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Custom Payment Instructions Note</label>
            <textarea
              rows={2}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="Instructions shown to merchant above the payment submit form..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? "Saving Configurations..." : "Save All Global Configurations"}</span>
          </button>
        </div>
      </form>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#111] border border-[#333] shadow-2xl flex items-start gap-3 max-w-md animate-in slide-in-from-bottom-5">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[#EDEDED]">{toastMessage.title}</h4>
            <p className="text-[11px] text-[#AAA] leading-relaxed">{toastMessage.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
