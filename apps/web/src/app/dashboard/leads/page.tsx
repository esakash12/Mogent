"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadItem {
  id: string;
  name: string;
  psid: string;
  phone: string;
  address: string;
  sentiment: number;
  ordersCount: number;
  totalSpent: number;
  date: string;
  source: string;
}

const mockLeads: LeadItem[] = [
  {
    id: "l1",
    name: "Tanvir Khan",
    psid: "849204918239102",
    phone: "01819234567",
    address: "House 12, Road 4, Dhanmondi, Dhaka",
    sentiment: 0.9,
    ordersCount: 1,
    totalSpent: 2510,
    date: "Today, 10:15 AM",
    source: "TechGear Bangladesh",
  },
  {
    id: "l2",
    name: "Rifat Ahmed",
    psid: "192837465019283",
    phone: "01711223344",
    address: "Block C, Bashundhara R/A, Dhaka",
    sentiment: 0.7,
    ordersCount: 2,
    totalSpent: 4900,
    date: "Today, 9:20 AM",
    source: "TechGear Bangladesh",
  },
  {
    id: "l3",
    name: "Farhan Hossain",
    psid: "739281048291029",
    phone: "01912345678",
    address: "Nasirabad, Chattogram",
    sentiment: 0.6,
    ordersCount: 1,
    totalSpent: 1800,
    date: "Yesterday",
    source: "StyleFashion BD",
  },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>(mockLeads);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">Leads & Customer CRM</h1>
          <p className="text-[14px] text-[#888] mt-1">
            Customer phone numbers, addresses, and sales leads automatically captured by AI.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-md bg-[#111] hover:bg-[#222] text-[#EDEDED] text-[13px] font-medium border border-[#333] transition-colors flex items-center gap-2 w-fit">
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-2">
          <span className="text-[13px] font-medium text-[#888]">Total Captured Leads</span>
          <div className="text-2xl font-semibold tracking-tight text-[#EDEDED]">542</div>
          <p className="text-[11px] text-[#10B981] font-medium">+18 today</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-2">
          <span className="text-[13px] font-medium text-[#888]">Verified Phone Numbers</span>
          <div className="text-2xl font-semibold tracking-tight text-[#EDEDED]">489</div>
          <p className="text-[11px] text-[#888]">90.2% extraction accuracy</p>
        </div>

        <div className="p-5 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-2">
          <span className="text-[13px] font-medium text-[#888]">Estimated Order Value</span>
          <div className="text-2xl font-semibold tracking-tight text-[#EDEDED] font-mono">৳ 3,42,800</div>
          <p className="text-[11px] text-[#10B981] font-medium">+৳ 45,000 this week</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
        <input
          type="text"
          placeholder="Search by name, phone or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors placeholder:text-[#555]"
        />
      </div>

      {/* Leads Table */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#111] border-b border-[#222] text-[#888] font-medium text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Delivery Address</th>
                <th className="px-6 py-4">Sentiment</th>
                <th className="px-6 py-4">Orders</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#111] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[#EDEDED]">{lead.name}</div>
                    <div className="text-[11px] font-mono text-[#888] mt-0.5">PSID: {lead.psid}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-[#EDEDED]">
                      <Phone className="w-3.5 h-3.5 text-[#555]" />
                      <span>{lead.phone}</span>
                      <button
                        onClick={() => handleCopy(lead.phone, lead.id)}
                        className="text-[#555] hover:text-[#EDEDED] p-1 transition-colors"
                      >
                        {copiedId === lead.id ? (
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="px-6 py-4 max-w-xs">
                    <div className="flex items-start gap-2 text-[#EDEDED]">
                      <MapPin className="w-3.5 h-3.5 text-[#555] shrink-0 mt-0.5" />
                      <span className="truncate">{lead.address}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-1 rounded-sm",
                        lead.sentiment >= 0.5
                          ? "bg-[#10B981]/10 text-[#10B981]"
                          : "bg-amber-500/10 text-amber-500"
                      )}
                    >
                      {lead.sentiment >= 0.5 ? "Delighted" : "Neutral"} ({lead.sentiment})
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-medium font-mono text-[#EDEDED]">{lead.ordersCount} (৳ {lead.totalSpent})</span>
                  </td>

                  <td className="px-6 py-4 text-[#888] text-[12px]">
                    {lead.source}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link href="/dashboard/inbox" className="text-[#888] hover:text-[#EDEDED] font-medium text-[12px] inline-flex items-center gap-1.5 transition-colors">
                      <span>View Chat</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
