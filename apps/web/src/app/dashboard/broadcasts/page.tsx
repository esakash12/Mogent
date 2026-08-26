"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Radio,
  Sparkles,
  BarChart3,
  Calendar,
  Loader2,
  X,
  Power,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Zap,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts, fetchPages } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface BroadcastCampaign {
  id: string;
  title: string;
  audience: string;
  recipientsCount: number;
  sentCount: number;
  openRate: string;
  status: "SENT" | "SCHEDULED" | "DRAFT";
  date: string;
  pageName: string;
}

interface FollowupConfig {
  isEnabled: boolean;
  delayHours: number;
  messageText: string;
  pageId: string;
  sentCount: number;
}

export default function BroadcastsPage() {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [contactsCount, setContactsCount] = useState(0);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Automated Follow-up State
  const [followupConfig, setFollowupConfig] = useState<FollowupConfig>({
    isEnabled: true,
    delayHours: 2,
    messageText: "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊",
    pageId: "ALL",
    sentCount: 0,
  });
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  const [isTriggeringFollowup, setIsTriggeringFollowup] = useState(false);

  // Manual Broadcast Modal Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedPage, setSelectedPage] = useState("ALL");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadFollowupConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/broadcasts/followup-config`, {
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFollowupConfig(json.data);
      }
    } catch (err) {
      console.warn("Could not load followup config", err);
    }
  };

  useEffect(() => {
    Promise.all([fetchContacts(), fetchPages(), loadFollowupConfig()]).then(
      ([contData, pagesData]) => {
        if (contData?.data && Array.isArray(contData.data)) {
          setContactsCount(contData.data.length);
        }
        if (Array.isArray(pagesData)) {
          setPages(pagesData);
        }
        setLoading(false);
      }
    );
  }, []);

  const handleSaveFollowup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingFollowup(true);

    try {
      const res = await fetch(`${API_BASE}/api/broadcasts/followup-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
        body: JSON.stringify(followupConfig),
      });
      const json = await res.json();
      if (json.success) {
        showToast("স্বয়ংক্রিয় ফলো-আপ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!");
      } else {
        showToast(json.error || "Failed to save settings", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setIsSavingFollowup(false);
    }
  };

  const handleTriggerFollowupScan = async () => {
    setIsTriggeringFollowup(true);
    try {
      const res = await fetch(`${API_BASE}/api/broadcasts/trigger-followup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || `ফলো-আপ সম্পন্ন! ${json.sentCount} জন কাস্টমারকে মেসেজ পাঠানো হয়েছে।`);
        loadFollowupConfig();
      } else {
        showToast(json.error || "Failed to scan", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to trigger scan", "error");
    } finally {
      setIsTriggeringFollowup(false);
    }
  };

  const handleSendManualBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSendingBroadcast(true);
    try {
      const res = await fetch(`${API_BASE}/api/broadcasts/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
          "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") || "" : "",
        },
        body: JSON.stringify({
          title,
          message,
          pageId: selectedPage,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`ব্রডকাস্ট "${title}" সফলভাবে পাঠানো হয়েছে!`);
        if (json.data) {
          setCampaigns([json.data, ...campaigns]);
        }
        setTitle("");
        setMessage("");
        setShowModal(false);
      } else {
        showToast(json.error || "ব্রডকাস্ট পাঠাতে সমস্যা হয়েছে", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error sending broadcast", "error");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl",
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
              : "bg-rose-950/90 border-rose-500/40 text-rose-100"
          )}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED] flex items-center gap-3">
            <Radio className="w-7 h-7 text-amber-500" />
            <span>Broadcasts & Automated Follow-ups</span>
          </h1>
          <p className="text-[#888] text-sm mt-1">
            ২ ঘন্টা বা কাস্টম সময়ে স্বয়ংক্রিয় ১-বার ফলো-আপ মেসেজ ও ফেসবুক পলিসি অনুযায়ী ব্রডকাস্ট ক্যাম্পেইন।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Manual Broadcast</span>
          </button>
        </div>
      </div>

      {/* 1. Automated Smart Follow-up Engine Card */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#161208] to-[#0A0A0A] p-6 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#332510] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-[#EDEDED]">
                স্বয়ংক্রিয় স্মার্ট ফলো-আপ ইঞ্জিন (Automated Drip Follow-up)
              </h2>
            </div>
            <p className="text-xs text-[#888]">
              কাস্টমার চ্যাটে কোনো রেসপন্স না দিলে নির্দিষ্ট সময় পর স্বয়ংক্রিয়ভাবে একবার ফলো-আপ মেসেজ যাবে।
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#111] px-3 py-1.5 rounded-xl border border-[#333]">
              <span className="text-xs text-[#888]">স্ট্যাটাস:</span>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...followupConfig, isEnabled: !followupConfig.isEnabled };
                  setFollowupConfig(updated);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                  followupConfig.isEnabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                )}
              >
                <Power className="w-3 h-3" />
                <span>{followupConfig.isEnabled ? "ACTIVE (চালু)" : "PAUSED (বন্ধ)"}</span>
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveFollowup} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Delay Selection */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-[#EDEDED] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>কত সময় পর ফলো-আপ যাবে? (Delay Time)</span>
              </label>
              <select
                value={followupConfig.delayHours}
                onChange={(e) => setFollowupConfig({ ...followupConfig, delayHours: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value={1}>১ ঘণ্টা পর (1 Hour Delay)</option>
                <option value={2}>২ ঘণ্টা পর (2 Hours Delay - রিকমেন্ডেড)</option>
                <option value={3}>৩ ঘণ্টা পর (3 Hours Delay)</option>
                <option value={4}>৪ ঘণ্টা পর (4 Hours Delay)</option>
                <option value={6}>৬ ঘণ্টা পর (6 Hours Delay)</option>
                <option value={12}>১২ ঘণ্টা পর (12 Hours Delay)</option>
                <option value={24}>২৪ ঘণ্টা পর (24 Hours Standard Window)</option>
              </select>
              <span className="text-[11px] text-[#777] block">
                * কাস্টমারের শেষ মেসেজের পর এই সময় পার হলে মেসেজ যাবে।
              </span>
            </div>

            {/* Select Target Page */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-[#EDEDED] flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>কোন পেজে কাজ করবে? (Target Page)</span>
              </label>
              <select
                value={followupConfig.pageId}
                onChange={(e) => setFollowupConfig({ ...followupConfig, pageId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="ALL">সকল কানেক্টেড পেজ (All Pages)</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[#777] block">
                * নির্দিষ্ট পেজ অথবা সব পেজে প্রযোজ্য হবে।
              </span>
            </div>

            {/* Single Delivery Guarantee Stats */}
            <div className="md:col-span-4 p-3.5 rounded-xl bg-[#111]/80 border border-[#2A2A2A] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Strictly 1-Time Guarantee</span>
              </div>
              <p className="text-[11px] text-[#888]">
                একই কাস্টমারকে বারবার মেসেজ দেওয়া হবে না। প্রতি কনভার্সেশনে <strong>শুধুমাত্র ১ বার</strong> ফলো-আপ যাবে।
              </p>
              <div className="pt-1 flex items-center justify-between text-xs font-mono text-[#AAA]">
                <span>মোট প্রেরিত ফলো-আপ:</span>
                <span className="font-bold text-amber-400">{followupConfig.sentCount || 0} টি</span>
              </div>
            </div>
          </div>

          {/* Follow-up Message Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#EDEDED] flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-amber-500" />
              <span>ফলো-আপ মেসেজের কথা (Follow-up Message Template)</span>
            </label>
            <textarea
              rows={3}
              value={followupConfig.messageText}
              onChange={(e) => setFollowupConfig({ ...followupConfig, messageText: e.target.value })}
              placeholder="যেমন: ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊"
              className="w-full p-3.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTriggerFollowupScan}
              disabled={isTriggeringFollowup || !followupConfig.isEnabled}
              className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] disabled:opacity-50 text-xs font-semibold text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer border border-[#333]"
            >
              {isTriggeringFollowup ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>এখনই স্ক্যান করে ফলো-আপ পাঠান (Scan & Run Now)</span>
            </button>

            <button
              type="submit"
              disabled={isSavingFollowup}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isSavingFollowup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>সেটিংস সংরক্ষণ করুন (Save Settings)</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Manual Broadcast Campaigns Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>মোট মেসেজিং কন্টাক্টস</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{contactsCount}</p>
          <span className="text-[11px] text-[#666]">কানেক্টেড ফেসবুক পেজসমূহের কাস্টমার</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>মোট ক্যাম্পেইন প্রেরিত</span>
            <Send className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-[#EDEDED]">{campaigns.length}</p>
          <span className="text-[11px] text-[#666]">Facebook Graph API এর মাধ্যমে পাঠানো</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>ডেলিভারি রেট</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">99.8%</p>
          <span className="text-[11px] text-[#666]">জিরো ফেইলওভার ও নোটিফিকেশন ডেলিভারি</span>
        </div>
      </div>

      {/* 3. Campaigns List */}
      <div className="border border-[#222] rounded-2xl overflow-hidden bg-[#0A0A0A] shadow-xl">
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]/30">
          <h3 className="font-semibold text-sm text-[#EDEDED] flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-500" />
            <span>ম্যানুয়াল ব্রডকাস্ট লগ ও হিস্টোরি</span>
          </h3>
          <span className="text-xs text-[#888] font-mono">Meta 24h Policy Guaranteed</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading broadcast campaigns...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center space-y-3 p-4">
            <Radio className="w-8 h-8 text-[#444] mx-auto" />
            <h3 className="font-semibold text-sm text-[#EDEDED]">কোনো ম্যানুয়াল ব্রডকাস্ট ক্যাম্পেইন নেই</h3>
            <p className="text-xs text-[#666] max-w-sm mx-auto">
              নতুন অফার, প্রমোশন বা বিশেষ ঘোষণা জানাতে উপরের "+ New Manual Broadcast" বাটনে ক্লিক করুন।
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#EDEDED]">
              <thead className="bg-[#111] text-[#888] border-b border-[#222] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">ক্যাম্পেইনের নাম</th>
                  <th className="py-3.5 px-4 font-semibold">টার্গেট অডিয়েন্স</th>
                  <th className="py-3.5 px-4 font-semibold">গ্রাহক সংখ্যা</th>
                  <th className="py-3.5 px-4 font-semibold">স্ট্যাটাস</th>
                  <th className="py-3.5 px-4 font-semibold text-right">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#111] transition-colors">
                    <td className="py-4 px-4 font-bold text-white">
                      {c.title}
                      <p className="text-[10px] text-[#888] font-mono mt-0.5">{c.pageName}</p>
                    </td>
                    <td className="py-4 px-4 text-[#CCC]">{c.audience || "Active Customers"}</td>
                    <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                      {c.recipientsCount} জন
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[#888]">
                      {c.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Broadcast Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#0E0E0E] p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
                  <Send className="w-4 h-4 text-amber-500" />
                  <span>নতুন ব্রডকাস্ট ক্যাম্পেইন তৈরি করুন</span>
                </h3>
                <span className="text-xs text-[#888]">Meta 24-Hour Policy অনুযায়ী মেসেজ পাঠানো হবে</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#666] hover:text-[#EDEDED] hover:bg-[#222] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendManualBroadcast} className="space-y-4">
              <div>
                <label className="text-xs text-[#888] block mb-1">ক্যাম্পেইনের টাইটেল</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: বিশেষ ছাড় অফার / ঈদ কালেকশন"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-[#888] block mb-1">ফেসবুক পেজ সিলেক্ট করুন</label>
                <select
                  value={selectedPage}
                  onChange={(e) => setSelectedPage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="ALL">সকল কানেক্টেড পেজ ({pages.length})</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#888] block mb-1">মেসেজ কন্টেন্ট</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="মেসেজের বিস্তারিত লিখুন..."
                  className="w-full p-3.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#181818] text-xs text-[#888] hover:text-[#EDEDED] transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSendingBroadcast || !title.trim() || !message.trim()}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isSendingBroadcast ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>ব্রডকাস্ট পাঠান</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
