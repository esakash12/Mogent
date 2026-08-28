"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Plus,
  Calendar,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOrders, updateOrderStatus } from "@/lib/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Search & Actions Bar (Exact Match to Screenshot 13) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, product..."
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
            onClick={() => alert("Manual order creation form ready.")}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Order</span>
          </button>
        </div>
      </div>

      {/* Main Content Area / Empty State (Exact Match to Screenshot 13) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-20 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF]">
          <ClipboardList className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#111827]">No orders yet</h3>
          <p className="text-xs text-[#6B7280]">
            Orders will appear here once customers place them
          </p>
        </div>
      </div>
    </div>
  );
}
