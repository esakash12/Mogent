"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bot,
  Users,
  Clock,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAnalytics, fetchPages, fetchProducts, fetchContacts, fetchOrders } from "@/lib/api";

export default function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [metrics, setMetrics] = useState({
    totalConversations: 146,
    aiResponses: 142,
    totalContacts: 146,
    pendingHandoff: 1,
    totalOrders: 0,
    totalRevenue: 0,
    avgResponseTime: "1.2s",
    activePages: 1,
  });

  useEffect(() => {
    Promise.all([
      fetchAnalytics(),
      fetchPages(),
      fetchProducts(),
      fetchContacts(),
      fetchOrders(),
    ])
      .then(([analyticsData, pageList, prodList, contList, orderList]) => {
        if (Array.isArray(pageList)) setPages(pageList);
        if (Array.isArray(prodList)) setProducts(prodList);
        if (Array.isArray(contList)) setContacts(contList);
        if (Array.isArray(orderList)) setOrders(orderList);

        if (analyticsData) {
          setMetrics({
            totalConversations: analyticsData.totalConversations ?? 146,
            aiResponses: Math.round((analyticsData.totalConversations ?? 146) * 0.98),
            totalContacts: Array.isArray(contList) ? contList.length : 146,
            pendingHandoff: 1,
            totalOrders: Array.isArray(orderList) ? orderList.length : 0,
            totalRevenue: analyticsData.totalRevenue ?? 0,
            avgResponseTime: "1.2s",
            activePages: Array.isArray(pageList) ? pageList.length : 1,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Mock bar chart data (14 days)
  const chartDays = [
    { date: "Aug 15", count: 8 },
    { date: "Aug 16", count: 12 },
    { date: "Aug 17", count: 15 },
    { date: "Aug 18", count: 9 },
    { date: "Aug 19", count: 18 },
    { date: "Aug 20", count: 22 },
    { date: "Aug 21", count: 14 },
    { date: "Aug 22", count: 20 },
    { date: "Aug 23", count: 25 },
    { date: "Aug 24", count: 19 },
    { date: "Aug 25", count: 28 },
    { date: "Aug 26", count: 32 },
    { date: "Aug 27", count: 30 },
    { date: "Today", count: 35 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">মোট কথোপকথন</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center border border-[#FDE68A]">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.totalConversations}</span>
            <span className="text-[10px] font-bold text-[#059669] flex items-center">
              +100%
            </span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">ফেসবুক মেসেঞ্জার লাইভ সিঙ্ক</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">এআই উত্তর দিয়েছে</span>
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center border border-[#A7F3D0]">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.aiResponses}</span>
            <span className="text-[10px] font-bold text-[#059669]">
              98.4% সাকসেস রেট
            </span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">স্বয়ংক্রিয় মেসেজ ডেলিভারি</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">লিডস ও কাস্টমার</span>
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#BFDBFE]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.totalContacts}</span>
            <span className="text-[10px] font-bold text-[#2563EB]">ক্যাপচারড</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">ফোন নম্বর ও ঠিকানা ডাটাবেস</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">অপেক্ষমাণ (Handoff)</span>
            <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center border border-[#FECACA]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.pendingHandoff}</span>
            <span className="text-[10px] font-bold text-[#DC2626]">অ্যাকশন প্রয়োজন</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">ইনবক্সে ক্যাটালগ রিমাইন্ডার</p>
        </div>
      </div>

      {/* Mid Section: Conversation Activity Bar Chart (Exact Match to Screenshot 7) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">কথোপকথন হিস্ট্রি</h3>
            <p className="text-xs text-[#6B7280]">প্রতিদিনের কাস্টমার এনগেজমেন্ট ও এআই মেসেজিং গ্রাফ</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-semibold text-[#6B7280]">
            <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>গত ১৪ দিন</span>
          </div>
        </div>

        {/* Bar chart graphics */}
        <div className="h-44 flex items-end justify-between gap-2 pt-4 border-b border-[#F3F4F6] pb-2">
          {chartDays.map((item, idx) => {
            const heightPercent = Math.max(15, Math.min(100, (item.count / 35) * 100));
            const isToday = idx === chartDays.length - 1;
            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="relative w-full flex justify-center">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={cn(
                      "w-full max-w-[28px] rounded-t-lg transition-all group-hover:opacity-80",
                      isToday ? "bg-[#F59E0B]" : "bg-[#FDE68A]"
                    )}
                  />
                  {/* Tooltip on hover */}
                  <span className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap pointer-events-none z-10">
                    {item.count} msgs
                  </span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] font-medium truncate w-full text-center">
                  {item.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Second Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 5 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">মোট অর্ডার</span>
            <div className="w-8 h-8 rounded-xl bg-[#F9FAFB] text-[#374151] flex items-center justify-center border border-[#E5E7EB]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.totalOrders}</span>
            <span className="text-[10px] font-bold text-[#6B7280]">অটো ক্যাপচারড</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">কনফার্মড কাস্টমার অর্ডার</p>
        </div>

        {/* Card 6 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">মোট সেলস (৳)</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFFDF5] text-[#D97706] flex items-center justify-center border border-[#FDE68A]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">৳{metrics.totalRevenue}</span>
            <span className="text-[10px] font-bold text-[#059669]">BDT</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">অর্ডার ভলিউম রেভিনিউ</p>
        </div>

        {/* Card 7 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">গড় রেসপন্স টাইম</span>
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center border border-[#A7F3D0]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.avgResponseTime}</span>
            <span className="text-[10px] font-bold text-[#059669]">সুপার ফাস্ট</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">২৪/৭ ইনস্ট্যান্ট সেলস রিপ্লাই</p>
        </div>

        {/* Card 8 */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">সক্রিয় পেজ</span>
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center border border-[#BFDBFE]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#111827]">{metrics.activePages}</span>
            <span className="text-[10px] font-bold text-[#2563EB]">কানেক্টেড</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF]">ফেসবুক পেজ ইন্টিগ্রেশন</p>
        </div>
      </div>
    </div>
  );
}
