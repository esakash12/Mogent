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
  UserPlus,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts, fetchPages } from "@/lib/api";

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
  pageId?: string;
  pageName?: string;
  profilePic?: string | null;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "PHONE" | "PURCHASED" | "COMPLAINT">("ALL");

  const loadData = async (pageFilter = selectedPageFilter) => {
    try {
      const [contactsRes, pagesData] = await Promise.all([
        fetchContacts(undefined, pageFilter),
        fetchPages(),
      ]);
      if (contactsRes && Array.isArray(contactsRes.data)) {
        setContacts(contactsRes.data);
      } else if (Array.isArray(contactsRes)) {
        setContacts(contactsRes);
      } else {
        setContacts([]);
      }
      if (Array.isArray(pagesData)) {
        setPages(pagesData);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    const initialPage = saved || "ALL";
    setSelectedPageFilter(initialPage);
    loadData(initialPage);

    const handleGlobalPageChange = (e: any) => {
      const newPageId = e.detail?.pageId || "ALL";
      setSelectedPageFilter(newPageId);
      loadData(newPageId);
    };

    window.addEventListener("mogent_page_changed", handleGlobalPageChange);
    return () => window.removeEventListener("mogent_page_changed", handleGlobalPageChange);
  }, []);

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.pageName && c.pageName.toLowerCase().includes(searchQuery.toLowerCase()));

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

  const verifiedPhonesCount = contacts.filter((c) => Boolean(c.phone)).length;
  const confirmedBuyersCount = contacts.filter((c) => c.ordersCount > 0).length;
  const avgSpend =
    confirmedBuyersCount > 0
      ? Math.round(
          contacts.reduce((acc, c) => acc + (c.totalSpent || 0), 0) / confirmedBuyersCount
        )
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-500" />
              <span>Contacts & Customer Directory</span>
            </h1>
            {selectedPageFilter !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold font-mono">
                📄 {pages.find((p) => p.id === selectedPageFilter)?.name || "Selected Page"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#888] mt-0.5">
            All customer leads automatically captured from Facebook Messenger with 1-click WhatsApp outreach.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={contacts.length === 0}
            className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-semibold text-[#EDEDED] flex items-center gap-2 transition-colors w-fit disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Contacts</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{contacts.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Verified Phone Numbers</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">{verifiedPhonesCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Confirmed Buyers</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{confirmedBuyersCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Avg. Customer Spend</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">৳ {avgSpend.toLocaleString()}</p>
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
            placeholder="Search customer, phone, page..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-[#444] placeholder:text-[#555]"
          />
        </div>

        {/* Filter Pills */}
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
                "px-3 py-1 rounded-md font-medium transition-colors cursor-pointer",
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
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading contacts directory...</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-[#555]">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#EDEDED]">No customer contacts captured yet</h3>
              <p className="text-xs text-[#777] max-w-sm leading-relaxed">
                When customers message your Facebook Page, Mogent AI will automatically extract their name, verified mobile phone, and delivery address here.
              </p>
            </div>
            <Link
              href="/dashboard/pages"
              className="mt-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Connect Facebook Page</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222] text-[#888] font-semibold">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Facebook Page</th>
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
                        <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center font-bold text-xs text-amber-400 shrink-0 border border-[#333] overflow-hidden">
                          {c.profilePic ? (
                            <img src={c.profilePic} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{c.name.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#EDEDED]">{c.name}</p>
                          <p className="text-[10px] text-[#666] font-mono">PSID: {c.psid ? c.psid.substring(0, 8) + "..." : "--"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {c.pageName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold">
                          📄 {c.pageName}
                        </span>
                      ) : (
                        <span className="text-[#666]">--</span>
                      )}
                    </td>

                    <td className="p-4 font-mono font-semibold text-[#EDEDED]">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#10B981]" />
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
                      <p className="font-semibold text-[#EDEDED]">{c.ordersCount} Orders</p>
                      <p className="text-[11px] text-[#888] font-mono">৳ {c.totalSpent.toLocaleString()}</p>
                    </td>

                    <td className="p-4">
                      {c.sentiment === "PURCHASED" && (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                          {c.score} PURCHASED
                        </span>
                      )}
                      {c.sentiment === "HIGH_INTENT" && (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {c.score} HIGH_INTENT
                        </span>
                      )}
                      {c.sentiment === "INQUIRY" && (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {c.score} INQUIRY
                        </span>
                      )}
                      {c.sentiment === "COMPLAINT" && (
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                          {c.score} COMPLAINT
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {c.phone ? (
                        <a
                          href={`https://wa.me/88${c.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 border border-[#10B981]/30 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-[#555]">No Phone</span>
                      )}
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
