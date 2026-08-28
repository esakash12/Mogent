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
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";
import {
  fetchTelegramStatus as getTelegramStatusApi,
  disconnectTelegram as disconnectTelegramApi,
  sendTestTelegramAlert as sendTestTelegramApi,
} from "@/lib/api";

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

  const fetchTelegramStatus = async () => {
    try {
      const json = await getTelegramStatusApi();
      if (json?.success && json.data) {
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
    const interval = setInterval(fetchTelegramStatus, 5000);
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
      const json = await sendTestTelegramApi();
      if (json?.success) {
        setTestMsg({ type: "success", text: json.message || "Test alert delivered to your Telegram!" });
      } else {
        setTestMsg({ type: "error", text: json?.error || "Failed to send test alert" });
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
      await disconnectTelegramApi();
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-[#F59E0B]" />
        <span className="text-xs font-bold text-[#64748B]">Loading Telegram Pairing...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-[#0F172A]">
              Telegram Escalations & Mobile Takeover
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center gap-1">
              <Zap className="w-3 h-3 fill-current" />
              <span>1-CLICK BOT READY</span>
            </span>
          </div>
          <p className="text-[#475569] text-xs mt-1">
            Receive instant push notifications on your phone whenever a customer gets angry or requests human assistance.
          </p>
        </div>

        {data?.isConnected && (
          <button
            onClick={handleTestAlert}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold flex items-center gap-2 transition-all w-fit cursor-pointer shadow-xs"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isTesting ? "Dispatching..." : "Send Test Alert"}</span>
          </button>
        )}
      </div>

      {testMsg && (
        <div
          className={cn(
            "p-4 rounded-xl flex items-center gap-3 text-xs font-bold",
            testMsg.type === "success"
              ? "bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669]"
              : "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
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

      {/* 1-Click Master Bot Connection Card */}
      <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">
                Single Master Bot (@{data?.botUsername || "MogentAlertBot"})
              </h3>
              <p className="text-xs text-[#64748B]">
                Connect in 1 click. No complex Telegram API tokens needed.
              </p>
            </div>
          </div>

          <div>
            {data?.isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                Connected (Chat ID: {data.chatId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                Waiting for 1-Click Connect
              </span>
            )}
          </div>
        </div>

        {/* 1-Click Connect vs Connected Details */}
        {!data?.isConnected ? (
          <div className="p-5 rounded-xl bg-[#FFFDF5] border border-[#FDE68A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-[#0F172A]">১-ক্লিকে টেলিগ্রাম বট কানেক্ট (1-Click Link)</h4>
                <p className="text-xs text-[#78350F]">
                  নিচের বাটনে ক্লিক করলে সরাসরি টেলিগ্রাম ওপেন হবে, শুধু <b>Start</b> প্রেস করলেই আপনার শপ কানেক্ট হয়ে যাবে!
                </p>
              </div>

              <a
                href={data?.deepLink || `https://t.me/${data?.botUsername || "MogentAlertBot"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-md shadow-blue-500/20"
              >
                <Bot className="w-4 h-4" />
                <span>Connect @{data?.botUsername || "MogentAlertBot"} (1-Click)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="border-t border-[#FDE68A] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-[#0F172A]">ম্যানুয়াল লিঙ্ক কি (Link Key)</h4>
                <p className="text-[11px] text-[#78350F]">
                  অথবা টেলিগ্রাম বটের চ্যাটে <code className="text-[#92400E] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-[#FDE68A]">{`/link ${data?.connectionKey || "TOKEN"}`}</code> লিখে পাঠান।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={data?.connectionKey || ""}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-xs font-mono text-[#0F172A] select-all w-44 font-bold"
                />
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-[#059669] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>টেলিগ্রাম বট সফলভাবে যুক্ত রয়েছে! (Connected)</span>
              </h4>
              <p className="text-xs text-[#065F46]">
                কাস্টমার সাপোর্ট প্রয়োজন হলে বা নতুন অর্ডার আসলে সরাসরি আপনার টেলিগ্রাম চ্যাট আইডিতে (<code className="font-mono font-bold">{data.chatId}</code>) নোটিফিকেশন পৌঁছে যাবে।
              </p>
            </div>

            <button
              onClick={() => setShowDisconnectModal(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        )}
      </div>

      {/* Disconnect Modal */}
      <ConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Telegram Bot"
        description="Are you sure you want to disconnect Telegram alerts? You will no longer receive instant escalation notifications on your phone."
        confirmText="Disconnect Bot"
        variant="danger"
        isLoading={isDisconnecting}
      />
    </div>
  );
}
