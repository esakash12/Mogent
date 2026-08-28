"use client";

import { useState } from "react";
import {
  Megaphone,
  Plus,
  Users,
  FileText,
  Ban,
  Send,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MainTab = "CAMPAIGNS" | "CUSTOMERS" | "TEMPLATES" | "DND";
type FilterStatus = "ALL" | "DRAFT" | "SENDING" | "COMPLETED";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("CAMPAIGNS");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [campaigns, setCampaigns] = useState<any[]>([]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;
    setIsSending(true);

    setTimeout(() => {
      setCampaigns([
        {
          id: Date.now().toString(),
          name: campaignName,
          sentCount: 146,
          status: "COMPLETED",
          createdAt: "Just now",
        },
        ...campaigns,
      ]);
      setCampaignName("");
      setMessageTemplate("");
      setIsSending(false);
      setShowModal(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Description & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#111827]">ক্যাম্পেইন</h2>
          <p className="text-xs text-[#6B7280]">
            আপনার নিজের কাস্টমারদের WhatsApp-এ অফার পাঠান।
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs transition-all shadow-sm cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন ক্যাম্পেইন</span>
        </button>
      </div>

      {/* 4 Sub Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm w-fit overflow-x-auto scrollbar-none">
        {[
          { id: "CAMPAIGNS", label: "ক্যাম্পেইন" },
          { id: "CUSTOMERS", label: "কাস্টমার" },
          { id: "TEMPLATES", label: "টেমপ্লেট" },
          { id: "DND", label: "মেসেজ পাঠাবেন না" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                active
                  ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Status Pills (for Campaigns tab) */}
      {activeTab === "CAMPAIGNS" && (
        <div className="flex items-center gap-2">
          {[
            { id: "ALL", label: "সব" },
            { id: "DRAFT", label: "ড্রাফট" },
            { id: "SENDING", label: "পাঠানো হচ্ছে" },
            { id: "COMPLETED", label: "শেষ" },
          ].map((pill) => {
            const active = filterStatus === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setFilterStatus(pill.id as FilterStatus)}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                    : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Area / Empty State (Exact Match to Screenshot 11) */}
      {activeTab === "CAMPAIGNS" && campaigns.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-20 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[360px]">
          <div className="w-16 h-16 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF]">
            <Megaphone className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111827]">এখনো কোনো ক্যাম্পেইন নেই</h3>
            <p className="text-xs text-[#6B7280]">
              কাস্টমারদের একটি অফার পাঠান — যারা উত্তর দেবে, AI তাদের সামলাবে।
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            নতুন ক্যাম্পেইন
          </button>
        </div>
      )}

      {/* Other Tabs content */}
      {activeTab === "CUSTOMERS" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-16 text-center space-y-2">
          <Users className="w-8 h-8 text-[#9CA3AF] mx-auto" />
          <p className="text-sm font-bold text-[#111827]">১৪৬ জন কাস্টমার প্রস্তুত</p>
          <p className="text-xs text-[#6B7280]">পূর্বে মেসেজ পাঠানো সকল কাস্টমার ডাটাবেসে সেইভ আছে।</p>
        </div>
      )}

      {activeTab === "TEMPLATES" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-16 text-center space-y-2">
          <FileText className="w-8 h-8 text-[#9CA3AF] mx-auto" />
          <p className="text-sm font-bold text-[#111827]">মেসেজ টেমপ্লেট</p>
          <p className="text-xs text-[#6B7280]">ডিসকাউন্ট বা প্রমোশনাল অফার টেমপ্লেট তৈরি করুন।</p>
        </div>
      )}

      {activeTab === "DND" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-16 text-center space-y-2">
          <Ban className="w-8 h-8 text-[#9CA3AF] mx-auto" />
          <p className="text-sm font-bold text-[#111827]">DND তালিকা খালি</p>
          <p className="text-xs text-[#6B7280]">অফার মেসেজ বন্ধ করতে চাওয়া কাস্টমারদের তালিকা।</p>
        </div>
      )}

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">নতুন ব্রডকাস্ট ক্যাম্পেইন</h3>
              <button onClick={() => setShowModal(false)} className="text-[#9CA3AF] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">ক্যাম্পেইনের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. উইকেন্ড স্পেশাল অফার"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">মেসেজ কন্টেন্ট *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="আসসালামু আলাইকুম! আমাদের স্পেশাল অফার শুরু হয়েছে..."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-[#4B5563]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs disabled:opacity-50"
                >
                  {isSending ? "পাঠানো হচ্ছে..." : "এখনই পাঠান"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
