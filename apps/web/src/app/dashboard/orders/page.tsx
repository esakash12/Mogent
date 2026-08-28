"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Plus,
  Calendar,
  ChevronDown,
  Loader2,
  Phone,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOrders, updateOrderStatus, createOrderManual } from "@/lib/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    productName: "",
    totalAmount: "",
    paymentMethod: "COD",
  });

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

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.error("Error updating order status:", err);
      loadData();
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customerName || !newOrder.customerPhone || !newOrder.totalAmount) return;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticOrder = {
      id: optimisticId,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      deliveryAddress: newOrder.deliveryAddress,
      itemsSummary: newOrder.productName || "1x Custom Order",
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };

    // Optimistic immediate insert
    setOrders((prev) => [optimisticOrder, ...prev]);
    setShowCreateModal(false);
    setIsSubmitting(true);

    const payload = { ...newOrder };
    setNewOrder({
      customerName: "",
      customerPhone: "",
      deliveryAddress: "",
      productName: "",
      totalAmount: "",
      paymentMethod: "COD",
    });

    try {
      const res = await createOrderManual(payload);
      if (res?.success && res.data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === optimisticId ? { ...o, id: res.data.id, ...res.data } : o))
        );
      }
    } catch (err) {
      console.error("Order creation error:", err);
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      (o.customerName && o.customerName.toLowerCase().includes(query)) ||
      (o.customerPhone && o.customerPhone.includes(query)) ||
      (o.itemsSummary && o.itemsSummary.toLowerCase().includes(query));

    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && o.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, phone, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border",
                  statusFilter === st
                    ? "bg-[#F59E0B] text-black border-[#F59E0B]"
                    : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Order</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Table or Skeleton / Empty State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
          <div className="h-5 w-40 bg-[#E2E8F0] rounded animate-pulse" />
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-[#F8FAFC] rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                  <th className="py-3 px-4">Order ID & Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Ordered Items</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[#0F172A]">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-[#0F172A]">#{order.id.slice(-6).toUpperCase()}</p>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(order.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#0F172A]">{order.customerName || "Customer"}</p>
                      <p className="text-[11px] text-[#059669] font-mono">{order.customerPhone}</p>
                      <p className="text-[10px] text-[#64748B] truncate max-w-xs">{order.deliveryAddress}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                        <span className="font-medium text-[#334155]">{order.itemsSummary || "1x Product"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">
                      ৳{order.totalAmount || "0"}
                      <span className="block text-[10px] text-[#64748B] font-normal">{order.paymentMethod || "COD"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status || "PENDING"}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] text-[#059669] font-bold">Auto-Logged</span>
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
            <ClipboardList className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">No orders yet</h3>
            <p className="text-xs text-[#64748B]">
              When customers complete checkout in chat, your AI logs them here automatically.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            Create First Order
          </button>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">Create New Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asif Iqbal"
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="017xxxxxxxx"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Total Amount (৳) *</label>
                  <input
                    type="text"
                    required
                    placeholder="1250"
                    value={newOrder.totalAmount}
                    onChange={(e) => setNewOrder({ ...newOrder, totalAmount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Product Details</label>
                <input
                  type="text"
                  placeholder="e.g. 1x Men's Polo Shirt (L)"
                  value={newOrder.productName}
                  onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Delivery Address</label>
                <textarea
                  rows={2}
                  placeholder="House, Road, Area, City"
                  value={newOrder.deliveryAddress}
                  onChange={(e) => setNewOrder({ ...newOrder, deliveryAddress: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
