"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Download,
  Phone,
  MapPin,
  MessageCircle,
  Facebook,
  Sparkles,
  ShoppingBag,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts } from "@/lib/api";

interface Contact {
  id: string;
  name: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
  score: string;
  sentiment: "HIGH_INTENT" | "PURCHASED" | "INQUIRY" | "COMPLAINT";
  lastActive: string;
  psid: string;
}

const mockContacts: Contact[] = [
  {
    id: "cnt-1",
    name: "Tanvir Khan",
    phone: "01819234567",
    address: "House 12, Road 4, Dhanmondi, Dhaka",
    ordersCount: 2,
    totalSpent: 4900,
    score: "+0.85",
    sentiment: "PURCHASED",
    lastActive: "10 mins ago",
    psid: "849204918239102",
  },
  {
    id: "cnt-2",
    name: "Sadia Afrin",
    phone: "01755112233",
    address: "Flat 4B, Sector 11, Uttara, Dhaka",
    ordersCount: 1,
    totalSpent: 3800,
    score: "+0.90",
    sentiment: "PURCHASED",
    lastActive: "1 hour ago",
    psid: "910284918239019",
  },
  {
    id: "cnt-3",
    name: "Rifat Ahmed",
    phone: "01711223344",
    address: "Mirpur 10, Dhaka",
    ordersCount: 0,
    totalSpent: 0,
    score: "+0.60",
    sentiment: "HIGH_INTENT",
    lastActive: "3 hours ago",
    psid: "593019284719283",
  },
  {
    id: "cnt-4",
    name: "Mahmud Hasan",
    phone: "01912998877",
    address: "Chawkbazar, Chattogram",
    ordersCount: 1,
    totalSpent: 1250,
    score: "+0.70",
    sentiment: "PURCHASED",
    lastActive: "Yesterday",
    psid: "482019482019381",
  },
  {
    id: "cnt-5",
    name: "Sabbir Mahmud",
    phone: "01711998877",
    address: "Agrabad, Chattogram",
    ordersCount: 1,
    totalSpent: 2450,
    score: "-0.85",
    sentiment: "COMPLAINT",
    lastActive: "2 days ago",
    psid: "392019482019281",
  },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "PHONE" | "PURCHASED" | "COMPLAINT">("ALL");

  useEffect(() => {
    fetchContacts().then((data) => {
      if (data && data.length > 0) {
        setContacts(data);
      }
    });
  }, []);

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === "ALL"
        ? true
        : filterType === "PHONE"
        ? Boolean(c.phone)
        : filterType === "PURCHASED"
        ? c.sentiment === "PURCHASED"
        : c.sentiment === "COMPLAINT";

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Contacts & Customer Directory
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            All customer leads automatically captured from Facebook Messenger with 1-click WhatsApp outreach.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-semibold text-[#EDEDED] flex items-center gap-2 transition-colors w-fit">
          <Download className="w-3.5 h-3.5" />
          <span>Export All Contacts (CSV)</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Contacts</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">2,850</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Verified Phone Numbers</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">1,920</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Confirmed Buyers</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">542</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Customer Lifetime Value</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">৳ 2,450</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, or area..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-[#444] placeholder:text-[#555]"
          />
        </div>

        {/* Filter Pills (No Scrollbar, clean fit) */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#111] border border-[#222] text-xs">
          {[
            { id: "ALL", label: "All Contacts" },
            { id: "PHONE", label: "With Phone" },
            { id: "PURCHASED", label: "Buyers" },
            { id: "COMPLAINT", label: "Complaints" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors",
                filterType === f.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#111] border-b border-[#222] text-[#888] font-semibold">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Delivery Location</th>
                <th className="p-4">Orders & Spend</th>
                <th className="p-4">AI Sentiment</th>
                <th className="p-4 text-right">Instant Outreach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredContacts.map((c) => (
                <tr key={c.id} className="hover:bg-[#111]/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center font-bold text-xs text-[#EDEDED] shrink-0 border border-[#333]">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#EDEDED]">{c.name}</p>
                        <p className="text-[10px] text-[#666] font-mono">PSID: {c.psid.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 font-mono font-semibold text-[#EDEDED]">
                    {c.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#666]" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-[#666]">--</span>
                    )}
                  </td>

                  <td className="p-4 text-[#888] max-w-xs truncate">
                    {c.address ? (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#666] shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </span>
                    ) : (
                      <span className="text-[#666]">--</span>
                    )}
                  </td>

                  <td className="p-4">
                    <p className="font-bold text-[#EDEDED] font-mono">{c.ordersCount} Orders</p>
                    <p className="text-[10px] text-[#888] font-mono">৳ {c.totalSpent.toLocaleString()}</p>
                  </td>

                  <td className="p-4">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        c.sentiment === "PURCHASED"
                          ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                          : c.sentiment === "HIGH_INTENT"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      {c.score} • {c.sentiment}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.phone && (
                        <a
                          href={`https://wa.me/88${c.phone.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(c.name)},%20thank%20you%20for%20contacting%20us!`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold text-[11px] border border-[#25D366]/30 flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      <Link
                        href="/dashboard/inbox"
                        className="p-1.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] transition-colors"
                        title="Open in Live Inbox"
                      >
                        <Facebook className="w-3.5 h-3.5 text-blue-400" />
                      </Link>
                    </div>
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
