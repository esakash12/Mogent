"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  Smartphone,
  Check,
  Bot,
  Lock,
  ExternalLink,
  Copy,
  Loader2,
  RefreshCw,
  Unlink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";

export default function TelegramAlertsPage() {
  const [data, setData] = useState<{
    workspaceId: string;
    workspaceName: string;
    plan: string;
    isPlanEligible: boolean;
    botUsername: string;
    connectionKey: string;
    deepLink: string;
    isConnected: boolean;
    chatId: string | null;
    notifyOnEscalation: boolean;
    notifyOnNewOrder: boolean;
    notifyOnNegativeReview: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchTelegramStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/automation/telegram`, {
        headers: {
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load Telegram status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelegramStatus();
    const interval = setInterval(fetchTelegramStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyKey = () => {
    if (!data?.connectionKey) return;
    navigator.clipboard.writeText(data.connectionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/automation/telegram/test`, {
        method: "POST",
        headers: {
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
      });
      const json = await res.json();
      if (json.success) {
        setTestMsg({ type: "success", text: json.message || "Test alert delivered to Telegram!" });
      } else {
        setTestMsg({ type: "error", text: json.error || "Failed to send test alert" });
      }
    } catch (err: any) {
      setTestMsg({ type: "error", text: err.message || "Failed to dispatch test alert" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await fetch(`${API_BASE}/api/automation/telegram/disconnect`, {
        method: "POST",
        headers: {
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
      });
      setShowDisconnectModal(false);
      fetchTelegramStatus();
    } catch (err) {
      console.error("Failed to disconnect telegram:", err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  // 1. PLAN GATING: If Free/Starter, show Locked State
  if (data && !data.isPlanEligible) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
        <div className="border-b border-[#222] pb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              Telegram Escalations & Alerts
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              PRO / ENTERPRISE FEATURE
            </span>
          </div>
          <p className="text-[#888] text-sm mt-1">
            Receive instant push notifications on your phone whenever a customer gets angry or requests a human manager.
          </p>
        </div>

        {/* Locked Card */}
        <div className="p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#111] to-[#0A0A0A] text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto shadow-lg shadow-amber-500/5">
            <Lock className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-[#EDEDED]">
              Telegram Alerts is Locked for {data.plan} Plan
            </h3>
            <p className="text-xs text-[#888] leading-relaxed">
              Never lose a sales deal or an angry customer again. Upgrade to <span className="text-[#EDEDED] font-semibold">Pro</span> or <span className="text-[#EDEDED] font-semibold">Enterprise</span> to receive real-time mobile push notifications on critical customer escalations and new orders.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Upgrade to Pro to Unlock (৳999/month)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNLOCKED: Pro/Enterprise Master Bot 1-Click Connection
  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              Telegram Escalations & Alerts
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" />
              <span>{data?.plan} PLAN ACTIVE</span>
            </span>
          </div>
          <p className="text-[#888] text-sm mt-1">
            Receive instant push notifications on your phone whenever a customer gets angry or requests a human manager.
          </p>
        </div>

        {data?.isConnected && (
          <button
            onClick={handleTestAlert}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2 transition-colors w-fit cursor-pointer"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isTesting ? "Dispatching..." : "Send Test Alert"}</span>
          </button>
        )}
      </div>

      {testMsg && (
        <div
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 text-xs",
            testMsg.type === "success"
              ? "bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          )}
        >
          {testMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{testMsg.text}</span>
        </div>
      )}

      {/* Connection Card */}
      <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#EDEDED]">
                Single Master Bot Architecture (@{data?.botUsername || "MogentAlertBot"})
              </h3>
              <p className="text-xs text-[#888]">
                Connect your account in 1-click. No complex Telegram API tokens needed.
              </p>
            </div>
          </div>

          <div>
            {data?.isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Connected (Chat ID: {data.chatId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Waiting for Telegram Connect
              </span>
            )}
          </div>
        </div>

        {/* 1-Click Connect vs Connected Details */}
        {!data?.isConnected ? (
          <div className="p-5 rounded-xl bg-[#111] border border-[#222] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-[#EDEDED]">Method 1: 1-Click Telegram Deep Link</h4>
                <p className="text-[11px] text-[#888]">
                  Click the button below to open Telegram and tap <b>Start</b>. Your shop will automatically pair!
                </p>
              </div>

              <a
                href={data?.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg shadow-blue-600/20"
              >
                <Bot className="w-4 h-4" />
                <span>Connect @{data?.botUsername} in Telegram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="border-t border-[#1C1C1C] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-[#EDEDED]">Method 2: Manual Link Key</h4>
                <p className="text-[11px] text-[#888]">
                  Or send <code className="text-amber-400 font-mono text-[10px]">{`/link ${data?.connectionKey}`}</code> to @{data?.botUsername} in Telegram.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={data?.connectionKey || ""}
                  className="px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#333] text-xs font-mono text-[#EDEDED] select-all w-44"
                />
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] text-xs font-medium text-[#EDEDED] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-emerald-950/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Telegram Bot Alert Pairing is Active!</span>
              </h4>
              <p className="text-[11px] text-[#888]">
                Critical customer escalations and new order notifications are being dispatched to Telegram Chat ID: <code className="text-emerald-300 font-mono">{data.chatId}</code>.
              </p>
            </div>

            <button
              onClick={() => setShowDisconnectModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>

      {/* Escalation Rules Triggers */}
      <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
        <h3 className="font-semibold text-base text-[#EDEDED]">Instant Push Alert Triggers</h3>
        <p className="text-xs text-[#888]">Choose which events should immediately ping your phone.</p>

        <div className="space-y-3 pt-2">
          {[
            {
              title: "Critical Negative Customer Sentiment (Anger / Refund / Fraud)",
              desc: "Sends instant alert if customer expresses extreme anger or uses abusive words.",
              checked: true,
            },
            {
              title: "Human Manager Requested",
              desc: "Sends alert when customer asks to talk with the business owner or live agent.",
              checked: true,
            },
            {
              title: "New E-Commerce Order Placed",
              desc: "Sends customer name, phone number, delivery address, and product details to Telegram.",
              checked: true,
            },
            {
              title: "Delivery & Damaged Product Complaints",
              desc: "Alerts when customer reports broken, delayed, or defective parcels.",
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
                className="w-4 h-4 rounded bg-[#222] accent-white shrink-0 mt-0.5 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Telegram Alerts"
        description="Are you sure you want to disconnect Telegram notifications? You will no longer receive mobile alerts for customer escalations until you re-link."
        confirmText="Disconnect Bot"
        variant="danger"
        isLoading={isDisconnecting}
      />
    </div>
  );
}
