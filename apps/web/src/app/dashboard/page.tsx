"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  MessageSquare,
  Users,
  ShoppingBag,
  TrendingUp,
  Bot,
  Zap,
  Globe,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Facebook,
  Loader2,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAnalytics, fetchPages, fetchProducts, fetchContacts } from "@/lib/api";

export default function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState<"TODAY" | "WEEK" | "MONTH" | "ALL">("WEEK");
  const [pages, setPages] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    totalContacts: 0,
    aiResolutionRate: 100,
    totalRevenue: 0,
    confirmedOrdersCount: 0,
    pagesConnected: 0,
  });

  useEffect(() => {
    Promise.all([
      fetchAnalytics(),
      fetchPages(),
      fetchProducts(),
      fetchContacts(),
    ]).then(([analyticsData, pageList, prodList, contList]) => {
      pageList = Array.isArray(pageList) ? pageList : [];
      prodList = Array.isArray(prodList) ? prodList : [];
      contList = Array.isArray(contList) ? contList : [];

      setPages(pageList);
      setProducts(prodList);
      setContacts(contList);

      if (analyticsData) {
        setMetrics({
          totalConversations: analyticsData.totalConversations ?? 0,
          totalContacts: contList.length,
          aiResolutionRate: analyticsData.aiResolutionRate ?? 100,
          totalRevenue: analyticsData.totalRevenue ?? 0,
          confirmedOrdersCount: analyticsData.confirmedOrdersCount ?? 0,
          pagesConnected: pageList.length,
        });
      } else {
        setMetrics((prev) => ({
          ...prev,
          pagesConnected: pageList.length,
          totalContacts: contList.length,
        }));
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs text-[#888]">Loading workspace analytics...</span>
      </div>
    );
  }

  const isConnected = pages.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Analytics & Growth Overview
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Real-time live performance metrics of your Facebook AI agents and customer conversion funnel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-[#111] border border-[#222] text-xs">
            {["TODAY", "WEEK", "MONTH", "ALL"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer",
                  timeRange === t
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                {t === "TODAY" ? "Today" : t === "WEEK" ? "This Week" : t === "MONTH" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Status Banner */}
      {!isConnected ? (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#111] to-[#0A0A0A] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-[#EDEDED]">
                Connect your Facebook Page to start live analytics!
              </h3>
            </div>
            <p className="text-xs text-[#888] max-w-xl leading-relaxed">
              You haven't connected any Facebook Pages yet. Connect your Facebook Page now to activate Gemini 2.0 AI auto-replies, product recommendations, and automated order booking.
            </p>
          </div>

          <Link
            href="/dashboard/pages"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors shrink-0 w-fit cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Bot className="w-4 h-4" />
            <span>Connect Facebook Page</span>
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Facebook className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-[#EDEDED]">{pages[0]?.name || "Connected Page"}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                  Listening for Messages
                </span>
              </div>
              <p className="text-[11px] text-[#888] font-mono">Page ID: {pages[0]?.pageId}</p>
            </div>
          </div>

          <Link
            href="/dashboard/inbox"
            className="px-4 py-2 rounded-xl bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-semibold text-[#EDEDED] flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open Live Inbox</span>
          </Link>
        </div>
      )}

      {/* 4 Main KPI Cards (100% Live Real Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Conversations */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Live Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              {metrics.totalConversations.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#888] mt-1">
              {metrics.totalConversations > 0 ? "Active customer chats" : "Waiting for first message"}
            </div>
          </div>
        </div>

        {/* Card 2: Captured Contacts */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Captured Contacts / Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              {contacts.length.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#888] mt-1">
              Verified phone numbers & profiles
            </div>
          </div>
        </div>

        {/* Card 3: AI Automated Resolution */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">AI Auto-Reply Engine</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#10B981]">
              Gemini 2.0
            </div>
            <div className="text-[11px] text-[#888] mt-1">
              Autonomous conversational RAG
            </div>
          </div>
        </div>

        {/* Card 4: Catalog Products */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Active Store Catalog</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              {products.length} <span className="text-xs font-normal text-[#888]">Products</span>
            </div>
            <div className="text-[11px] text-amber-500 mt-1">
              <Link href="/dashboard/commerce" className="hover:underline">
                Manage Catalog &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Real Products & Contacts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Real Store Catalog Items */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-[#EDEDED]">Store Product Catalog ({products.length})</h3>
            </div>
            <Link href="/dashboard/commerce" className="text-xs text-amber-500 hover:underline">
              Add Product
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#777] space-y-2">
              <Package className="w-8 h-8 text-[#444] mx-auto" />
              <p>No products added to catalog yet.</p>
              <Link href="/dashboard/commerce" className="text-amber-500 hover:underline inline-block mt-1">
                + Add your first product
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-[#111] border border-[#222]">
                  <div>
                    <p className="font-semibold text-xs text-[#EDEDED]">{p.name}</p>
                    <p className="text-[11px] text-[#888]">
                      {p.inStock ? <span className="text-[#10B981]">In Stock</span> : <span className="text-red-400">Out of Stock</span>}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-500">৳ {p.price?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Real Customer Contacts / Leads */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-[#EDEDED]">Customer Contacts ({contacts.length})</h3>
            </div>
            <Link href="/dashboard/contacts" className="text-xs text-blue-400 hover:underline">
              View All
            </Link>
          </div>

          {contacts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#777] space-y-2">
              <Users className="w-8 h-8 text-[#444] mx-auto" />
              <p>No customer contacts captured yet.</p>
              <p className="text-[10px] text-[#666]">When customers chat on your Facebook page, their contacts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[#111] border border-[#222]">
                  <div>
                    <p className="font-semibold text-xs text-[#EDEDED]">{c.name || "Customer"}</p>
                    <p className="text-[11px] text-[#888] font-mono">{c.phone || "No phone provided"}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222] text-[#AAA]">
                    {c.address ? "Lead" : "Messenger"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
