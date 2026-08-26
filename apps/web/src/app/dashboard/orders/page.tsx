"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Search,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Phone,
  MapPin,
  Facebook,
  ChevronDown,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOrders, updateOrderStatus, fetchPages } from "@/lib/api";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: string;
  amount: number;
  paymentMethod: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  capturedAt: string;
  createdAt: string;
  pageName: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadOrders = async (pageId = selectedPageId, stat = statusFilter) => {
    setLoading(true);
    try {
      const [ordersData, pagesData] = await Promise.all([
        fetchOrders(stat, pageId),
        fetchPages(),
      ]);
      if (Array.isArray(ordersData)) {
        setOrders(ordersData);
      }
      if (Array.isArray(pagesData)) {
        setPages(pagesData);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    const initialPage = saved || "ALL";
    setSelectedPageId(initialPage);
    loadOrders(initialPage, statusFilter);

    const handleGlobalPageChange = (e: any) => {
      const newPageId = e.detail?.pageId || "ALL";
      setSelectedPageId(newPageId);
      loadOrders(newPageId, statusFilter);
    };

    window.addEventListener("mogent_page_changed", handleGlobalPageChange);
    return () => window.removeEventListener("mogent_page_changed", handleGlobalPageChange);
  }, [statusFilter]);

  const handlePageChange = (newPageId: string) => {
    setSelectedPageId(newPageId);
    if (typeof window !== "undefined") {
      localStorage.setItem("mogent_active_page_id", newPageId);
    }
    loadOrders(newPageId, statusFilter);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
    );
    await updateOrderStatus(orderId, newStatus);
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    let csv = "Order Number,Customer Name,Phone,Address,Items,Amount,Status,Captured At,Page\n";
    for (const o of orders) {
      const name = `"${o.customerName}"`;
      const phone = `"${o.phone}"`;
      const addr = `"${(o.address || "").replace(/"/g, '""')}"`;
      const items = `"${(o.items || "").replace(/"/g, '""')}"`;
      csv += `${o.orderNumber},${name},${phone},${addr},${items},${o.amount},${o.status},${o.capturedAt},"${o.pageName}"\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mogent_orders_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.phone.includes(searchTerm) ||
      ord.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || ord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((acc, o) => acc + (o.amount || 0), 0);

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED] flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-amber-500" />
              <span>Orders & Commerce CRM</span>
            </h1>
            {selectedPageId !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold font-mono">
                📄 {pages.find((p) => p.id === selectedPageId)?.name || "Selected Page"}
              </span>
            )}
          </div>
          <p className="text-[#888] text-sm mt-1">
            Track and process orders automatically extracted by AI from Facebook Messenger conversations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Page Switcher */}
          {pages.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#333] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-xs text-[#888] font-semibold hidden sm:inline">Page:</span>
              <select
                value={selectedPageId}
                onChange={(e) => handlePageChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#111] text-[#EDEDED]">
                  🏢 All Connected Pages ({pages.length})
                </option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111] text-[#EDEDED]">
                    📄 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-medium text-[#EDEDED] flex items-center gap-2 transition-colors w-fit cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Total Orders</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{orders.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Gross Revenue (BDT)</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">৳ {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Pending Processing</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Delivered & Closed</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">{deliveredCount}</p>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0A0A0A] p-4 rounded-xl border border-[#222]">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#666]" />
          <input
            type="text"
            placeholder="Search by customer, phone, order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#111] border border-[#222] rounded-lg text-xs text-[#EDEDED] focus:outline-none focus:border-[#444]"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                statusFilter === st
                  ? "bg-white text-black font-bold shadow-sm"
                  : "bg-[#111] text-[#888] hover:text-[#EDEDED] border border-[#222]"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="border border-[#222] rounded-xl overflow-hidden bg-[#0A0A0A]">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading live customer orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-[#444] mx-auto" />
            <h3 className="font-semibold text-sm text-[#EDEDED]">No orders found</h3>
            <p className="text-xs text-[#666]">
              When customers confirm their orders via Facebook Messenger, they will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#EDEDED]">
              <thead className="bg-[#111] text-[#888] border-b border-[#222] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Order</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Address</th>
                  <th className="py-3.5 px-4 font-semibold">Ordered Items</th>
                  <th className="py-3.5 px-4 font-semibold">Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#111] transition-colors">
                    <td className="py-4 px-4 font-mono">
                      <span className="font-bold text-white">{ord.orderNumber}</span>
                      <p className="text-[10px] text-[#888] mt-0.5">{ord.capturedAt}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-white">{ord.customerName}</p>
                      <p className="text-[11px] text-[#888] font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#666]" /> {ord.phone || "No phone"}
                      </p>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="truncate text-xs text-[#CCC]" title={ord.address}>
                        {ord.address || "Pending customer address"}
                      </p>
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <p className="truncate font-medium text-white">{ord.items}</p>
                    </td>
                    <td className="py-4 px-4 font-bold text-[#10B981] font-mono">
                      ৳ {ord.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border inline-flex items-center gap-1",
                          ord.status === "CONFIRMED" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          ord.status === "SHIPPED" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                          ord.status === "PENDING" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                          ord.status === "DELIVERED" && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                          ord.status === "CANCELLED" && "bg-red-500/10 text-red-400 border-red-500/20"
                        )}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                        className="bg-[#161616] border border-[#333] text-[11px] font-semibold text-[#EDEDED] rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="PENDING">Mark Pending</option>
                        <option value="CONFIRMED">Mark Confirmed</option>
                        <option value="SHIPPED">Mark Shipped</option>
                        <option value="DELIVERED">Mark Delivered</option>
                        <option value="CANCELLED">Mark Cancelled</option>
                      </select>
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
