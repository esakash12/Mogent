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
  const [telegramChatId, setTelegramChatId] = useState("-1002349182390");

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? "https://api.mogent.tech"
      : "");

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/meta-config`, {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setAppId(json.data.appId || "");
          setAppSecret(json.data.appSecret || "");
          setVerifyToken(json.data.verifyToken || "mogent_fb_verify_token_secure");
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

    try {
      await fetch(`${API_BASE}/api/admin/meta-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
        body: JSON.stringify({
          appId,
          appSecret,
          verifyToken,
        }),
      });

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
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (main)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (backup)</option>
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

        {/* 3. Global Telegram Notification Channel */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Super Admin Telegram Alerts</h3>
              <p className="text-xs text-[#888]">Receive instant push notifications when a merchant requests manual payment approval.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Admin Telegram Chat ID</label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
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
