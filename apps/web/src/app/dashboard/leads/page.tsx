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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchContacts } from "@/lib/api";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    let csv = "Name,Phone,Address,PSID\n";
    for (const l of leads) {
      csv += `"${l.name || ""}","${l.phone || ""}","${(l.address || "").replace(/"/g, '""')}","${l.psid || ""}"\n`;
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Search & Actions Bar (Exact Match to Screenshot 12) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs font-semibold text-[#374151] shadow-sm cursor-pointer w-fit">
            <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>All time</span>
            <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => alert("Manual lead capture form ready.")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main Content Area / Empty State (Exact Match to Screenshot 12) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-20 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF]">
          <Users className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#111827]">No leads yet</h3>
          <p className="text-xs text-[#6B7280]">
            Get started by creating your first lead
          </p>
        </div>
        <button
          onClick={() => alert("Manual lead capture form ready.")}
          className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          Create Lead
        </button>
      </div>
    </div>
  );
}
