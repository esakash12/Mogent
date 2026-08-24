"use client";

import { useState } from "react";
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
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"FACEBOOK" | "TELEGRAM" | "WEBHOOKS">("FACEBOOK");
  const [botToken, setBotToken] = useState("7189204918:AAFlw902...");
  const [chatId, setChatId] = useState("-1002349182390");
  const [testSent, setTestSent] = useState(false);

  const pages = [
    {
      id: "p-1",
      name: "TechGadgets BD",
      pageId: "10928491823901",
      status: "CONNECTED",
      aiMode: "AUTO",
      messagesToday: 420,
    },
    {
      id: "p-2",
      name: "Fashion House BD",
      pageId: "49204918204918",
      status: "CONNECTED",
      aiMode: "AUTO",
      messagesToday: 280,
    },
    {
      id: "p-3",
      name: "Organic Mart",
      pageId: "78204918203912",
      status: "CONNECTED",
      aiMode: "AUTO",
      messagesToday: 95,
    },
  ];

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
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "FACEBOOK"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Facebook className="w-3.5 h-3.5 text-blue-400" />
            <span>Facebook Pages (3)</span>
          </button>

          <button
            onClick={() => setActiveTab("TELEGRAM")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
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
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "WEBHOOKS"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Custom Webhooks</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FACEBOOK PAGES */}
      {activeTab === "FACEBOOK" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#888]">Connected Facebook Page accounts receiving live customer messages.</p>
            <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Connect New Facebook Page</span>
            </button>
          </div>

          <div className="space-y-3">
            {pages.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#333] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-[#EDEDED]">{p.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-[#111] text-[#888] border border-[#222]">
                        ID: {p.pageId}
                      </span>
                    </div>
                    <span className="text-xs text-[#888] mt-0.5 block">
                      {p.messagesToday} customer messages processed today
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                    Webhook Active
                  </span>
                  <button className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-medium text-[#EDEDED]">
                    Configure AI Settings
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TELEGRAM ALERTS */}
      {activeTab === "TELEGRAM" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6 max-w-3xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-[#222]">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Telegram Push Alert Gateway</h3>
              <p className="text-xs text-[#888]">Get instant notification on your smartphone when customer requires manager.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#888] mb-1.5 font-medium">Telegram Bot Token</label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1.5 font-medium">Manager Group Chat ID</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-mono focus:outline-none"
              />
            </div>

            <button
              onClick={() => {
                setTestSent(true);
                setTimeout(() => setTestSent(false), 3000);
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-[#EDEDED] flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testSent ? "Test Alert Sent to Phone!" : "Send Test Notification"}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM WEBHOOKS */}
      {activeTab === "WEBHOOKS" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4 max-w-3xl animate-in fade-in duration-200">
          <h3 className="font-semibold text-sm text-[#EDEDED]">Outbound Webhooks</h3>
          <p className="text-xs text-[#888]">Forward captured leads and order payloads to your external CRM or Google Sheets.</p>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl bg-[#111] border border-[#222] flex items-center justify-between">
              <div>
                <p className="font-semibold text-xs text-[#EDEDED]">Order Placed Webhook</p>
                <p className="text-[11px] font-mono text-[#888] mt-0.5">https://your-crm.com/api/orders</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#10B981]/10 text-[#10B981]">Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
