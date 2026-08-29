"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Users,
  FileText,
  Ban,
  Send,
  Loader2,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchFollowupConfig,
  saveFollowupConfig,
  triggerFollowupScan,
  fetchContacts,
} from "@/lib/api";
import { toast } from "@/lib/toast";

type MainTab = "CAMPAIGNS" | "CUSTOMERS" | "TEMPLATES" | "DND";
type FilterStatus = "ALL" | "DRAFT" | "SENDING" | "COMPLETED";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("CAMPAIGNS");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Follow-up Config State
  const [isEnabled, setIsEnabled] = useState(true);
  const [delayHours, setDelayHours] = useState(2);
  const [messageText, setMessageText] = useState(
    "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊"
  );
  const [sentCount, setSentCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, contactsData] = await Promise.all([
        fetchFollowupConfig(),
        fetchContacts(),
      ]);

      if (configData) {
        setIsEnabled(configData.isEnabled !== false);
        setDelayHours(configData.delayHours || 2);
        if (configData.messageText) setMessageText(configData.messageText);
        setSentCount(configData.sentCount || 0);
      }

      if (contactsData) {
        setContacts(Array.isArray(contactsData) ? contactsData : (contactsData?.data || []));
      }
    } catch (err) {
      console.error("Failed to load campaigns data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveFollowupConfig({
        isEnabled,
        delayHours,
        messageText,
      });

      if (res?.success) {
        toast.success("Follow-up Rules Saved! ⚙️", {
          description: `Configured to auto-remind idle customers after ${delayHours} hours.`,
        });
      } else {
        toast.error("Failed to save follow-up configuration", {
          description: res?.error || "Please try again.",
        });
      }
    } catch (err: any) {
      toast.error("Network error while saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerFollowup = async () => {
    setIsTriggering(true);
    try {
      const res = await triggerFollowupScan();
      if (res?.success) {
        toast.success("Follow-up Scan Completed! 🚀", {
          description: `Dispatched follow-up reminders to ${res.sentCount || 0} idle customer conversations.`,
        });
        loadData();
      } else {
        toast.error("Follow-up scan failed", {
          description: res?.error || "Please check Facebook page connections.",
        });
      }
    } catch (err: any) {
      toast.error("Network error during follow-up scan");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Description & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#F59E0B]" />
            <span>ক্যাম্পেইন ও অটোমেটেড ফলো-আপ (Broadcasts & Follow-ups)</span>
          </h2>
          <p className="text-xs text-[#475569]">
            মেসেঞ্জার ও হোয়াটসঅ্যাপে ড্রপ-অফ কাস্টমারদের স্বয়ংক্রিয় অফার ও রিমাইন্ডার পাঠান।
          </p>
        </div>

        <button
          onClick={handleTriggerFollowup}
          disabled={isTriggering}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs transition-all shadow-sm cursor-pointer w-fit disabled:opacity-50"
        >
          {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
          <span>{isTriggering ? "Scanning Conversations..." : "রান ফলো-আপ স্ক্যান (Instant Scan)"}</span>
        </button>
      </div>

      {/* 4 Sub Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm w-fit overflow-x-auto scrollbar-none">
        {[
          { id: "CAMPAIGNS", label: "অটো ফলো-আপ ক্যাম্পেইন" },
          { id: "CUSTOMERS", label: `কাস্টমার অডিয়েন্স (${contacts.length})` },
          { id: "TEMPLATES", label: "টেমপ্লেট" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                active
                  ? "bg-[#F59E0B] text-black shadow-xs font-black"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Automated Follow-up Configuration */}
      {activeTab === "CAMPAIGNS" && (
        <div className="space-y-6">
          {/* Main Automation Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">অটোনোমাস কাস্টমার রি-এনগেজমেন্ট রুল</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  যেসব কাস্টমার চ্যাটে দাম জানার পর অর্ডার না দিয়ে নিষ্ক্রিয় হয়ে যান, এআই নির্দিষ্ট সময় পর তাদেরকে এই মেসেজটি পাঠাবে।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#475569]">{isEnabled ? "সক্রিয় (Active)" : "নিষ্ক্রিয়"}</span>
                <button
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={cn(
                    "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                    isEnabled ? "bg-[#F59E0B]" : "bg-[#CBD5E1]"
                  )}
                >
                  <div
                    className={cn(
                      "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  কত ঘণ্টা পর ফলো-আপ পাঠানো হবে? (Delay Hours)
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 4, 12, 24].map((hours) => (
                    <button
                      type="button"
                      key={hours}
                      onClick={() => setDelayHours(hours)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        delayHours === hours
                          ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] shadow-xs"
                          : "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-white"
                      )}
                    >
                      {hours} ঘণ্টা পর
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  স্বয়ংক্রিয় ফলো-আপ মেসেজ (Message Template) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] leading-relaxed font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                <div className="text-xs text-[#64748B] font-bold">
                  মোট ডেলিভারকৃত ফলো-আপ: <strong className="text-[#059669]">{sentCount} টি</strong>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isSaving ? "Saving Settings..." : "Save Follow-up Rule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Customers Audience */}
      {activeTab === "CUSTOMERS" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#475569]">
            Audience List ({contacts.length} Customers)
          </div>

          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
              <span className="text-xs font-bold text-[#64748B]">Loading audience...</span>
            </div>
          ) : contacts.length > 0 ? (
            <div className="divide-y divide-[#F1F5F9]">
              {contacts.map((c, i) => (
                <div key={c.id || i} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">{c.firstName} {c.lastName || ""}</h4>
                    <p className="text-[11px] text-[#64748B] font-mono">{c.phoneNumber || "Messenger User"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-[10px] font-bold">
                    Eligible for Broadcast
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <Users className="w-8 h-8 text-[#CBD5E1] mx-auto" />
              <p className="text-xs font-bold text-[#0F172A]">No audience contacts yet</p>
              <p className="text-[11px] text-[#64748B]">Contacts will automatically populate as customers interact with your Facebook Page.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Templates */}
      {activeTab === "TEMPLATES" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-[#0F172A]">Pre-built Promotional Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => {
                setMessageText("ভাইয়া, আমাদের নতুন স্টক চলে এসেছে! সাথে থাকছে ফ্রি ডেলিভারি অফার। অর্ডার করতে রিপ্লাই দিন 😊");
                setActiveTab("CAMPAIGNS");
              }}
              className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#F59E0B] hover:bg-[#FFFDF5] cursor-pointer transition-all space-y-1.5"
            >
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">Free Delivery Offer</span>
              <p className="text-xs text-[#334155] leading-relaxed">
                ভাইয়া, আমাদের নতুন স্টক চলে এসেছে! সাথে থাকছে ফ্রি ডেলিভারি অফার। অর্ডার করতে রিপ্লাই দিন 😊
              </p>
            </div>

            <div
              onClick={() => {
                setMessageText("প্রিয় কাস্টমার, আপনার পছন্দের প্রোডাক্টটির স্টক প্রায় শেষের দিকে। অর্ডারটি বুক করে রাখতে চান কি?");
                setActiveTab("CAMPAIGNS");
              }}
              className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#F59E0B] hover:bg-[#FFFDF5] cursor-pointer transition-all space-y-1.5"
            >
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669]">Stock Urgency Reminder</span>
              <p className="text-xs text-[#334155] leading-relaxed">
                প্রিয় কাস্টমার, আপনার পছন্দের প্রোডাক্টটির স্টক প্রায় শেষের দিকে। অর্ডারটি বুক করে রাখতে চান কি?
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
