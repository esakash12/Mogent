"use client";

import { useState } from "react";
import {
  Settings,
  Shield,
  Key,
  Bot,
  Bell,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [defaultModel, setDefaultModel] = useState("gemini-2.0-flash");
  const [cooldownSecs, setCooldownSecs] = useState("60");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [masterKey, setMasterKey] = useState("shohag-mogent-super-secret-key-2026");
  const [telegramChatId, setTelegramChatId] = useState("-1002349182390");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Global System Settings
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Configure system-wide AI behavior, security master keys, and escalation alert gateways.
          </p>
        </div>

        {isSaved && (
          <span className="px-3 py-1.5 rounded-lg bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Settings updated successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Security & Master API Keys */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#EDEDED]">Gateway Security & Master Key</h3>
              <p className="text-xs text-[#888]">Used by Core Backend to authenticate with the AI Proxy Gateway.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">
                AI Proxy Master Authentication Secret
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={masterKey}
                  onChange={(e) => setMasterKey(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setMasterKey(`shohag-${Math.random().toString(36).substring(2, 15)}`)}
                  className="px-3 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs text-[#EDEDED] transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. AI Engine & Key Rotator Defaults */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#EDEDED]">AI Engine Defaults</h3>
              <p className="text-xs text-[#888]">Global defaults for all customer Facebook Messenger chatbots.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">
                Default LLM Model
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended, Ultra Fast)</option>
                <option value="gemini-2.0-flash-lite-preview">gemini-2.0-flash-lite-preview (Cost Saver)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Reasoning)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">
                Rate-Limit 429 Cooldown (Seconds)
              </label>
              <input
                type="number"
                value={cooldownSecs}
                onChange={(e) => setCooldownSecs(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. Global Telegram Notification Channel */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#EDEDED]">System Owner Telegram Broadcast</h3>
              <p className="text-xs text-[#888]">Channel or Chat ID to receive instant alerts when a critical system error occurs.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">
              Shohag Admin Telegram Chat ID
            </label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <Save className="w-4 h-4" />
            <span>Save Global Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
}
