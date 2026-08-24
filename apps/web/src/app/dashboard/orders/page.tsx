"use client";

import { useState } from "react";
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
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: string;
  amount: number;
  paymentMethod: "COD" | "BKASH" | "NAGAD";
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  capturedAt: string;
  pageName: string;
}

const mockOrders: Order[] = [
  {
    id: "ord-1",
    orderNumber: "ORD-8921",
    customerName: "Tanvir Khan",
    phone: "01819234567",
    address: "House 12, Road 4, Dhanmondi, Dhaka",
    items: "Ultra Smartwatch Pro (Black) x 1",
    amount: 2450,
    paymentMethod: "COD",
    status: "CONFIRMED",
    capturedAt: "10 mins ago",
    pageName: "TechGadgets BD",
  },
  {
    id: "ord-2",
    orderNumber: "ORD-8920",
    customerName: "Sadia Afrin",
    phone: "01755112233",
    address: "Flat 4B, Uttara Sector 11, Dhaka",
    items: "Wireless ANC Earbuds (White) x 2",
    amount: 3800,
    paymentMethod: "BKASH",
    status: "SHIPPED",
    capturedAt: "1 hour ago",
    pageName: "TechGadgets BD",
  },
  {
    id: "ord-3",
    orderNumber: "ORD-8919",
    customerName: "Mahmud Hasan",
    phone: "01912998877",
    address: "Chawkbazar, Chattogram",
    items: "Magnetic Fast Charger 65W x 1",
    amount: 1250,
    paymentMethod: "COD",
    status: "PENDING",
    capturedAt: "2 hours ago",
    pageName: "TechGadgets BD",
  },
  {
    id: "ord-4",
    orderNumber: "ORD-8918",
    customerName: "Kamrul Islam",
    phone: "01688334455",
    address: "Zindabazar, Sylhet",
    items: "Ultra Smartwatch Pro (Silver) x 1",
    amount: 2450,
    paymentMethod: "COD",
    status: "DELIVERED",
    capturedAt: "Yesterday",
    pageName: "TechGadgets BD",
  },
  {
    id: "ord-5",
    orderNumber: "ORD-8917",
    customerName: "Nusrat Jahan",
    phone: "01300445566",
    address: "Boyra, Khulna",
    items: "Gaming Headset RGB x 1",
    amount: 1950,
    paymentMethod: "NAGAD",
    status: "CANCELLED",
    capturedAt: "2 days ago",
    pageName: "TechGadgets BD",
  },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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
    .reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Orders & Commerce CRM
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Track and process orders automatically extracted by AI from Facebook Messenger conversations.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-medium text-[#EDEDED] flex items-center gap-2 transition-colors w-fit">
          <Download className="w-4 h-4" />
          <span>Export Orders (CSV)</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Total Orders Captured</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{orders.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Gross Revenue (BDT)</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">৳ {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Pending Processing</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">
            {orders.filter((o) => o.status === "PENDING").length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Avg Order Value</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">৳ 2,380</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, phone, or order ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white transition-colors placeholder:text-[#555]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
                statusFilter === st
                  ? "bg-white text-black font-semibold"
                  : "bg-[#111] text-[#888] hover:text-[#EDEDED] border border-[#222]"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#111] border-b border-[#222] text-[#888] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Order ID & Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">Amount & Payment</th>
                <th className="px-6 py-4">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#111]/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="space-y-0.5">
                      <span className="font-mono font-semibold text-xs text-[#EDEDED]">{ord.orderNumber}</span>
                      <p className="text-[11px] text-[#888]">{ord.capturedAt}</p>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="font-medium text-xs text-[#EDEDED]">{ord.customerName}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#888] font-mono">
                        <Phone className="w-3 h-3 text-[#555]" />
                        <span>{ord.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#777] max-w-xs truncate">
                        <MapPin className="w-3 h-3 text-[#555] shrink-0" />
                        <span className="truncate">{ord.address}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-xs text-[#EDEDED] font-medium">{ord.items}</p>
                    <span className="text-[10px] text-[#888] mt-0.5 block">{ord.pageName}</span>
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-[#EDEDED] font-mono">৳ {ord.amount.toLocaleString()}</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#222] text-[#888] border border-[#333] mt-1 inline-block">
                      {ord.paymentMethod}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                        ord.status === "DELIVERED"
                          ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                          : ord.status === "SHIPPED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : ord.status === "CONFIRMED"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                          : ord.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      {ord.status}
                    </span>
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
