"use client";

import { useState } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Smartphone,
  Check,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TelegramAlertsPage() {
  const [botToken, setBotToken] = useState("7189204918:AAFlw902...");
  const [chatId, setChatId] = useState("-1002349182390");
  const [isTesting, setIsTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleTestAlert = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Telegram Escalations & Alerts
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Receive instant push notifications on your phone whenever a customer gets angry or requests a human manager.
          </p>
        </div>

        <button
          onClick={handleTestAlert}
          disabled={isTesting}
          className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-semibold text-[#EDEDED] flex items-center gap-2 transition-colors w-fit"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{isTesting ? "Sending Alert..." : testSent ? "Sent to Telegram!" : "Test Alert Notification"}</span>
        </button>
      </div>

      {testSent && (
        <div className="p-4 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center gap-3 text-xs text-[#10B981]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Test escalation alert successfully dispatched to your Telegram group!</span>
        </div>
      )}

      {/* Integration Card */}
      <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-[#EDEDED]">Telegram Bot Configuration</h3>
            <p className="text-xs text-[#888]">Connect your custom Telegram bot to receive instant alerts.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">
              Telegram Bot Token (from @BotFather)
            </label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">
              Manager / Support Group Chat ID
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-white"
            />
          </div>
        </div>
      </div>

      {/* Escalation Rules Triggers */}
      <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
        <h3 className="font-semibold text-base text-[#EDEDED]">Instant Alert Conditions</h3>
        <p className="text-xs text-[#888]">Choose which events should immediately ping your phone.</p>

        <div className="space-y-3 pt-2">
          {[
            {
              title: "Critical Negative Customer Sentiment",
              desc: "Sends alert if customer is furious or uses rude language (Sentiment score <= -0.7).",
              checked: true,
            },
            {
              title: "Human Manager Requested",
              desc: "Sends alert when customer asks for a human agent or manager.",
              checked: true,
            },
            {
              title: "High-Value Order Placed (> 5,000 BDT)",
              desc: "Sends instant order summary to Telegram group for VIP packing.",
              checked: true,
            },
            {
              title: "Delivery Complaint & Return Requests",
              desc: "Alerts when customer reports broken, missing, or defective item.",
              checked: true,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#111] border border-[#222] flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-[#EDEDED]">{item.title}</h4>
                <p className="text-[11px] text-[#888]">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={item.checked}
                className="w-4 h-4 rounded bg-[#222] accent-white shrink-0 mt-0.5"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
