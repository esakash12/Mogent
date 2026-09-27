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
  ShoppingBag,
  Filter,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Loader2,
  Plus,
  X,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts, fetchPages, createContactLead } from "@/lib/api";
import { toast } from "@/lib/toast";

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

  // Add Contact Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", address: "" });

  const loadData = async (pageFilter = selectedPageFilter) => {
    try {
      const [contactsRes, pagesData] = await Promise.all([
        fetchContacts({ all: true, pageId: pageFilter !== "ALL" ? pageFilter : undefined }),
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
        ? c.sentiment === "PURCHASED" || c.ordersCount > 0
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

  const [isExporting, setIsExporting] = useState(false);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.phone) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticLead: Contact = {
      id: optimisticId,
      name: newLead.name,
      phone: newLead.phone,
      address: newLead.address,
      ordersCount: 0,
      totalSpent: 0,
      score: "0.80",
      sentiment: "INQUIRY",
      lastActive: "Just now",
      psid: optimisticId,
      pageName: "Direct",
    };

    setContacts((prev) => [optimisticLead, ...prev]);
    setShowAddModal(false);
    setIsSubmittingLead(true);

    const payload = { ...newLead };
    setNewLead({ name: "", phone: "", address: "" });

    try {
      const res = await createContactLead(payload);
      if (res?.success && res.data) {
        setContacts((prev) =>
          prev.map((c) => (c.id === optimisticId ? { ...c, id: res.data.id, ...res.data } : c))
        );
        toast.success("Customer Contact Created! 👤", {
          description: `${payload.name} added with phone ${payload.phone}`,
        });
      } else {
        toast.error("Failed to save contact", {
          description: res?.error || "Please try again.",
        });
      }
    } catch {
      toast.error("Network error while creating contact");
      loadData();
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const res = await fetchContacts({ all: true, pageId: selectedPageFilter !== "ALL" ? selectedPageFilter : undefined });
      const listToExport = res?.data && Array.isArray(res.data) && res.data.length > 0 ? res.data : (filteredContacts.length > 0 ? filteredContacts : contacts);
      if (listToExport.length === 0) return;

      const headers = [
        "Customer Name",
        "Phone Number",
        "Delivery Address",
        "Orders Count",
        "Total Spent (BDT)",
        "Sentiment",
        "Facebook Page",
        "PSID",
        "Last Active",
      ];

      const escape = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;

      const rows = listToExport.map((c) =>
        [
          escape(c.name || "Customer"),
          escape(c.phone || ""),
          escape(c.address || ""),
          c.ordersCount || 0,
          c.totalSpent || 0,
          escape(c.sentiment || "INQUIRY"),
          escape(c.pageName || ""),
          escape(c.psid || ""),
          escape(c.lastActive || ""),
        ].join(",")
      );

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `mogent_contacts_${selectedPageFilter !== "ALL" ? `${selectedPageFilter}_` : ""}${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] flex items-center gap-2.5">
              <Users className="w-6 h-6 text-[#F59E0B]" />
              <span>Contacts & Customer Directory</span>
            </h1>
            {selectedPageFilter !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-semibold font-mono">
                📄 {pages.find((p) => p.id === selectedPageFilter)?.name || "Selected Channel"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            All customer leads captured across Messenger and WhatsApp with one-click outreach and order metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={contacts.length === 0 || isExporting}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] flex items-center gap-2 transition-colors w-fit disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#F59E0B]" />
            )}
            <span>Export CSV ({filteredContacts.length})</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Total Contacts</span>
          <p className="text-2xl font-black text-[#0F172A] mt-1.5">{contacts.length}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Verified Phone Numbers</span>
          <p className="text-2xl font-black text-[#10B981] mt-1.5">{verifiedPhonesCount}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Confirmed Buyers</span>
          <p className="text-2xl font-black text-[#4F46E5] mt-1.5">{confirmedBuyersCount}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Avg. Customer Spend</span>
          <p className="text-2xl font-black text-[#0F172A] mt-1.5">৳ {avgSpend.toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, phone, page..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] placeholder:text-[#94A3B8] shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-xs">
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
                "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
                filterType === f.id
                  ? "bg-white text-[#0F172A] font-bold shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            <span className="text-xs text-[#64748B]">Loading contacts directory...</span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#92400E]">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#0F172A]">No customer contacts found</h3>
              <p className="text-xs text-[#64748B] max-w-sm leading-relaxed">
                When customers message your Facebook Page or WhatsApp, Mogent AI will automatically capture their identity and display them here.
              </p>
            </div>
            <Link
              href="/dashboard/pages"
              className="mt-2 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>Connect Facebook Page</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Channel / Page</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Delivery Location</th>
                  <th className="p-4">Orders & Spend</th>
                  <th className="p-4">AI Sentiment</th>
                  <th className="p-4 text-right">Instant Outreach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#FDE68A] overflow-hidden">
                          {c.profilePic ? (
                            <img src={c.profilePic} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{c.name.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F172A]">{c.name}</p>
                          <p className="text-[10px] text-[#94A3B8] font-mono">PSID: {c.psid ? c.psid.substring(0, 8) + "..." : "--"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {c.pageName ? (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          c.pageName.toLowerCase().includes("whatsapp")
                            ? "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]"
                            : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                        )}>
                          {c.pageName.toLowerCase().includes("whatsapp") ? "📱 " : "📄 "}
                          {c.pageName}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">--</span>
                      )}
                    </td>

                    <td className="p-4 font-mono font-semibold text-[#0F172A]">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#10B981]" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">--</span>
                      )}
                    </td>

                    <td className="p-4 text-[#64748B] max-w-xs truncate">
                      {c.address ? (
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">--</span>
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-[#0F172A]">{c.ordersCount} Orders</p>
                      <p className="text-[11px] text-[#64748B] font-mono">৳ {c.totalSpent.toLocaleString()}</p>
                    </td>

                    <td className="p-4">
                      {c.sentiment === "PURCHASED" && (
                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                          {c.score} PURCHASED
                        </span>
                      )}
                      {c.sentiment === "HIGH_INTENT" && (
                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                          {c.score} HIGH_INTENT
                        </span>
                      )}
                      {c.sentiment === "INQUIRY" && (
                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          {c.score} INQUIRY
                        </span>
                      )}
                      {c.sentiment === "COMPLAINT" && (
                        <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
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
                          className="px-3 py-1.5 rounded-xl bg-[#DCFCE7] text-[#15803D] hover:bg-[#BBF7D0] border border-[#86EFAC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">No Phone</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Add New Customer Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Hasan"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="017xxxxxxxx"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#475569] mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="House, Road, Area, City"
                  value={newLead.address}
                  onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingLead ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
