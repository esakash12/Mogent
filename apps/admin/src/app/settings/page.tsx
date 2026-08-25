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
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Meta Developer App Settings
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("mogent_fb_verify_token_secure");

  // System Settings
  const [defaultModel, setDefaultModel] = useState("gemini-3.5-flash-lite");
  const [cooldownSecs, setCooldownSecs] = useState("60");
  const [masterKey, setMasterKey] = useState("shohag-mogent-super-secret-key-2026");

  // Master Telegram Bot Settings (Central Single Bot)
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgBotUsername, setTgBotUsername] = useState("MogentAlertBot");
  const [telegramChatId, setTelegramChatId] = useState("-1002349182390");

  // Cloudflare R2 Storage Settings
  const [cfAccountId, setCfAccountId] = useState("");
  const [cfAccessKeyId, setCfAccessKeyId] = useState("");
  const [cfSecretAccessKey, setCfSecretAccessKey] = useState("");
  const [cfBucketName, setCfBucketName] = useState("mogent-assets");
  const [cfPublicDomain, setCfPublicDomain] = useState("");

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? "https://api.mogent.tech"
      : "");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : "";
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/api/admin/meta-config`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/api/admin/telegram-master-config`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE}/api/admin/cloudflare-config`, { headers }).then((r) => r.json()),
    ])
      .then(([metaJson, tgJson, cfJson]) => {
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
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : "";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    try {
      await Promise.all([
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
      ]);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Global System & Meta Configuration
          </h1>
          <p className="text-[#888] text-xs mt-1">
            Configure centralized Meta Developer App for 1-click merchant onboarding and system-wide AI behavior.
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
        {/* 1. Meta Developer App Settings (For 1-Click Merchant Login) */}
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

          {/* Webhook Meta URL Details with Copy Buttons */}
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
                <option value="gemini-3.5-flash-lite">Mogent Engine Ultra (v3.5)</option>
                <option value="gemini-3.1-flash-lite">Mogent Engine Turbo (v3.1)</option>
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

        {/* 3. Platform Master Telegram Bot (Single Master Bot Architecture) */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Master Telegram Alert Bot (@BotFather)</h3>
              <p className="text-xs text-[#888]">Single central Telegram bot that dispatches instant customer escalation alerts to all merchants.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Master Telegram Bot Token</label>
              <input
                type="password"
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                placeholder="e.g. 7189204918:AAFlw902JkLmNoP..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Bot Username (without @)</label>
              <input
                type="text"
                value={tgBotUsername}
                onChange={(e) => setTgBotUsername(e.target.value)}
                placeholder="e.g. MogentAlertBot"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Super Admin Telegram Chat ID (For billing notifications)</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. -1002349182390"
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

        {/* 4. Cloudflare R2 Storage (For Product Catalog Images & Media) */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Cloudflare R2 Storage (Media & Product Images)</h3>
              <p className="text-xs text-[#888]">High-speed CDN image storage for merchant product catalogs.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Cloudflare Account ID</label>
              <input
                type="text"
                value={cfAccountId}
                onChange={(e) => setCfAccountId(e.target.value)}
                placeholder="e.g. 9b8c7d6e5f4a3b2c1..."
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

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All Global Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
}
