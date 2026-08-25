"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts } from "@/lib/api";

interface LeadItem {
  id: string;
  name: string;
  psid: string;
  phone: string;
  address: string;
  sentiment: string;
  score: string;
  ordersCount: number;
  totalSpent: number;
  lastActive: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadLeads = async () => {
    setLoading(true);
    const data = await fetchContacts();
    if (data && Array.isArray(data.data)) {
      setLeads(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search)) ||
      (l.address && l.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCopy = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert("No leads to export!");
      return;
    }
    let csv = "ID,Name,Phone,Address,Orders Count,Total Spent,Sentiment,PSID\n";
    for (const l of leads) {
      const name = `"${l.name}"`;
      const phone = `"${l.phone || ""}"`;
      const addr = `"${(l.address || "").replace(/"/g, '""')}"`;
      csv += `${l.id},${name},${phone},${addr},${l.ordersCount},${l.totalSpent},${l.sentiment},${l.psid}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mogent_leads_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const totalWithPhone = leads.filter((l) => Boolean(l.phone)).length;
  const totalWithAddress = leads.filter((l) => Boolean(l.address)).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">Leads & Customer CRM</h1>
          <p className="text-[14px] text-[#888] mt-1">
            Customer phone numbers, addresses, and sales leads automatically captured by AI from Messenger.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] text-[#EDEDED] text-[13px] font-medium border border-[#333] transition-colors flex items-center gap-2 w-fit cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export All Leads (CSV)</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Total Captured Leads</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-[#EDEDED]">{leads.length}</p>
          <span className="text-[11px] text-[#666]">Tracked across Facebook Messenger</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Verified Phone Numbers</span>
            <Phone className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{totalWithPhone}</p>
          <span className="text-[11px] text-[#666]">Ready for SMS & WhatsApp campaigns</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Delivery Addresses</span>
            <MapPin className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400">{totalWithAddress}</p>
          <span className="text-[11px] text-[#666]">Extracted for parcel delivery</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#888] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, phone, or address..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
        />
      </div>

      {/* Leads Table */}
      <div className="border border-[#222] rounded-2xl overflow-hidden bg-[#0A0A0A]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading customer leads...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-8 h-8 text-[#444] mx-auto" />
            <h3 className="font-semibold text-sm text-[#EDEDED]">No leads captured yet</h3>
            <p className="text-xs text-[#666]">
              When Facebook customers share their phone numbers or address, the AI captures them here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#EDEDED]">
              <thead className="bg-[#111] text-[#888] border-b border-[#222] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Address</th>
                  <th className="py-3.5 px-4 font-semibold">Orders & Spent</th>
                  <th className="py-3.5 px-4 font-semibold">Sentiment</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#111] transition-colors">
                    <td className="py-4 px-4">
                      <p className="font-bold text-white">{lead.name}</p>
                      <p className="text-[10px] text-[#888] font-mono mt-0.5">PSID: {lead.psid}</p>
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {lead.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#10B981] font-semibold">{lead.phone}</span>
                          <button
                            onClick={() => handleCopy(lead.phone, lead.id)}
                            className="text-[#666] hover:text-white p-1 rounded"
                            title="Copy Phone"
                          >
                            {copiedId === lead.id ? (
                              <Check className="w-3.5 h-3.5 text-[#10B981]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#666] italic">Not captured</span>
                      )}
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="truncate text-[#CCC]" title={lead.address}>
                        {lead.address || <span className="text-[#666] italic">Not captured</span>}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-white">{lead.ordersCount} Orders</p>
                      <p className="text-[10px] text-[#10B981] font-mono">৳ {lead.totalSpent.toLocaleString()}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono font-bold border",
                        lead.sentiment === "PURCHASED" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        lead.sentiment === "HIGH_INTENT" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        lead.sentiment === "INQUIRY" && "bg-[#222] text-[#888] border-[#333]",
                        lead.sentiment === "COMPLAINT" && "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {lead.sentiment} ({lead.score})
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[#888]">
                      {lead.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
