"use client";

import { useState } from "react";
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
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const mockCampaigns: BroadcastCampaign[] = [
  {
    id: "bc-1",
    title: "Weekend Flash Sale 20% OFF",
    audience: "Active customers in last 24h",
    recipientsCount: 420,
    sentCount: 420,
    openRate: "94.2%",
    status: "SENT",
    date: "23 Aug, 2026",
    pageName: "TechGadgets BD",
  },
  {
    id: "bc-2",
    title: "New Smartwatch Pro Stock Arrival",
    audience: "Customers with Tag 'Interested in Watch'",
    recipientsCount: 180,
    sentCount: 180,
    openRate: "89.5%",
    status: "SENT",
    date: "19 Aug, 2026",
    pageName: "TechGadgets BD",
  },
  {
    id: "bc-3",
    title: "Follow-up on Unconfirmed Orders",
    audience: "Abandoned checkout customers",
    recipientsCount: 65,
    sentCount: 0,
    openRate: "--",
    status: "SCHEDULED",
    date: "Tomorrow at 10:00 AM",
    pageName: "TechGadgets BD",
  },
];

export default function BroadcastsPage() {
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>(mockCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newCampaign: BroadcastCampaign = {
      id: `bc-${Date.now()}`,
      title,
      audience: "All active customers (24h standard window)",
      recipientsCount: 310,
      sentCount: 310,
      openRate: "Pending",
      status: "SENT",
      date: "Just now",
      pageName: "TechGadgets BD",
    };

    setCampaigns([newCampaign, ...campaigns]);
    setTitle("");
    setMessage("");
    setShowModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Messenger Broadcasts & Campaigns
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Send targeted promotional announcements and re-engagement updates to your Facebook customers.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-[#EDEDED] transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>New Broadcast Campaign</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Total Messages Delivered</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-2">600+</p>
          <span className="text-[11px] text-[#10B981] mt-1 block">Facebook 24h Policy Compliant</span>
        </div>

        <div className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Average Open Rate</span>
          <p className="text-2xl font-bold text-[#10B981] mt-2">91.8%</p>
          <span className="text-[11px] text-[#888] mt-1 block">4x higher than Email</span>
        </div>

        <div className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Re-engaged Customers</span>
          <p className="text-2xl font-bold text-amber-500 mt-2">142 Orders</p>
          <span className="text-[11px] text-[#888] mt-1 block">Generated via Broadcasts</span>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[#EDEDED]">Campaign History</h3>
          <span className="text-xs text-[#888]">{campaigns.length} campaigns</span>
        </div>

        <div className="divide-y divide-[#222]">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#111]/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-[#EDEDED]">{c.title}</h4>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      c.status === "SENT"
                        ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-[#888]">{c.audience} • {c.pageName}</p>
                <div className="flex items-center gap-2 text-[11px] text-[#666] pt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{c.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs">
                <div className="text-right">
                  <span className="text-[#888] block text-[11px]">Recipients</span>
                  <span className="font-mono font-semibold text-[#EDEDED]">{c.recipientsCount}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#888] block text-[11px]">Open Rate</span>
                  <span className="font-mono font-bold text-[#10B981]">{c.openRate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#0A0A0A] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-[#EDEDED]">Create Broadcast Campaign</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 10% Discount on Wireless Earbuds"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Target Audience</label>
                <select className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white">
                  <option>Customers active in last 24 hours (Recommended)</option>
                  <option>Customers who placed orders previously</option>
                  <option>All opted-in Messenger subscribers</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Broadcast Message Content</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type the message to send to all selected customers..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#111] text-xs text-[#888] hover:text-[#EDEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-[#EDEDED]"
                >
                  Launch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
