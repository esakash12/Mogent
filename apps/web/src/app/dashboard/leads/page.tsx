"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Download,
  Plus,
  Calendar,
  ChevronDown,
  Loader2,
  Copy,
  Check,
  Phone,
  MapPin,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts } from "@/lib/api";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", address: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchContacts();
      if (res && Array.isArray(res.data)) {
        setLeads(res.data);
      } else if (Array.isArray(res)) {
        setLeads(res);
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    let csv = "Name,Phone,Address,Sentiment,Orders,Total Spent,Page\n";
    for (const l of leads) {
      csv += `"${l.name || ""}","${l.phone || ""}","${(l.address || "").replace(/"/g, '""')}","${l.sentiment || ""}","${l.ordersCount || 0}","${l.totalSpent || 0}","${l.pageName || ""}"\n`;
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

  const filteredLeads = leads.filter((l) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      (l.name && l.name.toLowerCase().includes(query)) ||
      (l.phone && l.phone.includes(query)) ||
      (l.address && l.address.toLowerCase().includes(query));

    if (filterType === "PHONE") return matchesSearch && Boolean(l.phone);
    if (filterType === "PURCHASED") return matchesSearch && (l.ordersCount > 0 || l.sentiment === "PURCHASED");
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType("ALL")}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                filterType === "ALL"
                  ? "bg-[#F59E0B] text-black border-[#F59E0B]"
                  : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
              )}
            >
              All Leads ({leads.length})
            </button>
            <button
              onClick={() => setFilterType("PHONE")}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                filterType === "PHONE"
                  ? "bg-[#F59E0B] text-black border-[#F59E0B]"
                  : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
              )}
            >
              With Phone ({leads.filter((l) => Boolean(l.phone)).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Live Table or Empty State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-16 shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-[#F59E0B] animate-spin" />
          <p className="text-xs font-bold text-[#64748B]">Loading customer leads...</p>
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Delivery Address</th>
                  <th className="py-3 px-4">Page / Channel</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[#0F172A]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 border border-[#FDE68A]">
                          {lead.name?.[0]?.toUpperCase() || "C"}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A]">{lead.name}</p>
                          <span className="text-[10px] text-[#64748B]">PSID: {lead.psid || lead.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[#0F172A]">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#059669]" />
                          <span>{lead.phone}</span>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">Not captured</span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[#334155]">
                      {lead.address ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3 h-3 text-[#D97706] shrink-0" />
                          <span className="truncate">{lead.address}</span>
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">No address</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] font-semibold text-[10px]">
                        {lead.pageName || "Facebook"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full font-bold text-[10px]",
                        lead.ordersCount > 0 ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F1F5F9] text-[#64748B]"
                      )}>
                        {lead.ordersCount || 0} Orders
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {lead.phone && (
                        <button
                          onClick={() => handleCopy(lead.phone, lead.id)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A] transition-all cursor-pointer"
                          title="Copy Phone"
                        >
                          {copiedId === lead.id ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-20 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#94A3B8]">
            <Users className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">No leads yet</h3>
            <p className="text-xs text-[#64748B]">
              Your AI will automatically capture customer names, phone numbers, and addresses from chats.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Create First Lead
          </button>
        </div>
      )}

      {/* Manual Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">Add New Customer Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newLead.name || !newLead.phone) return;
                setLeads([
                  {
                    id: Date.now().toString(),
                    name: newLead.name,
                    phone: newLead.phone,
                    address: newLead.address,
                    ordersCount: 0,
                    pageName: "Manual",
                    sentiment: "INQUIRY",
                  },
                  ...leads,
                ]);
                setShowAddModal(false);
                setNewLead({ name: "", phone: "", address: "" });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Hasan"
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="017xxxxxxxx"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="House, Road, Area, City"
                  value={newLead.address}
                  onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
