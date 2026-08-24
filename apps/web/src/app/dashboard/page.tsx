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
  ChevronDown,
  Filter,
  LineChart as LineChartIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAnalytics } from "@/lib/api";

interface DataPoint {
  day: string;
  date: string;
  messages: number;
  orders: number;
  x: number;
  msgY: number;
  ordY: number;
}

const weeklyData: DataPoint[] = [
  { day: "Mon", date: "Aug 18", messages: 120, orders: 45, x: 40, msgY: 130, ordY: 175 },
  { day: "Tue", date: "Aug 19", messages: 180, orders: 85, x: 130, msgY: 95, ordY: 145 },
  { day: "Wed", date: "Aug 20", messages: 140, orders: 60, x: 220, msgY: 120, ordY: 165 },
  { day: "Thu", date: "Aug 21", messages: 240, orders: 130, x: 310, msgY: 60, ordY: 110 },
  { day: "Fri", date: "Aug 22", messages: 310, orders: 210, x: 400, msgY: 25, ordY: 70 },
  { day: "Sat", date: "Aug 23", messages: 380, orders: 290, x: 490, msgY: 10, ordY: 35 },
  { day: "Sun", date: "Aug 24", messages: 350, orders: 260, x: 580, msgY: 20, ordY: 45 },
];

export default function AnalyticsDashboardPage() {
  const [timeRange, setTimeRange] = useState<"TODAY" | "WEEK" | "MONTH" | "ALL">("WEEK");
  const [selectedPage, setSelectedPage] = useState<string>("ALL");
  const [chartMode, setChartMode] = useState<"AREA" | "BARS">("AREA");
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(weeklyData[5]);
  const [pages, setPages] = useState<any[]>([]);

  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    totalContacts: 0,
    aiResolutionRate: 100,
    totalRevenue: 0,
    confirmedOrdersCount: 0,
    pagesConnected: 0,
    isNewWorkspace: true,
  });

  useEffect(() => {
    fetchAnalytics().then((data) => {
      if (data) {
        setMetrics({
          totalConversations: data.totalConversations ?? 0,
          totalContacts: data.totalContacts ?? 0,
          aiResolutionRate: data.aiResolutionRate ?? 100,
          totalRevenue: data.totalRevenue ?? 0,
          confirmedOrdersCount: data.confirmedOrdersCount ?? 0,
          pagesConnected: data.pagesConnected ?? 0,
          isNewWorkspace: data.isNewWorkspace ?? (data.totalConversations === 0 && data.pagesConnected === 0),
        });
      }
    });

    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/pages`, {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        "x-workspace-id": typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") || "" : "",
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPages(json.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls Bar: Time Range & Page Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Analytics & Growth Overview
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Real-time performance metrics of your Facebook AI agents and customer conversion funnel.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Filter Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#111] border border-[#222] text-xs">
            {[
              { id: "TODAY", label: "Today" },
              { id: "WEEK", label: "This Week" },
              { id: "MONTH", label: "This Month" },
              { id: "ALL", label: "All Time" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-all",
                  timeRange === t.id
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Page Selector Dropdown */}
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-medium focus:outline-none"
          >
            <option value="ALL">
              {pages.length > 0 ? `All Facebook Pages (${pages.length})` : "No Pages Connected (0)"}
            </option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.pageName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Onboarding Banner if 0 Pages Connected */}
      {metrics.pagesConnected === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#111] to-[#0A0A0A] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-[#EDEDED]">
                Welcome to your Mogent AI Workspace!
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
      )}

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Total Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              {metrics.totalConversations.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#10B981] font-medium mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+24.8% vs last period</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Captured Contacts / Leads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              {metrics.totalContacts.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#10B981] font-medium mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+18.2% new phone numbers</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">AI Automated Resolution</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              {metrics.aiResolutionRate}%
            </div>
            <div className="text-[11px] text-[#888] mt-1">
              Solved without human manager
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Orders Revenue (BDT)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              ৳ {metrics.totalRevenue.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#10B981] font-medium mt-1">
              {metrics.confirmedOrdersCount} Confirmed orders
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Traffic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Premium Interactive Curve & Bar Trajectory Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222]">
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">Conversation & Orders Trajectory</h3>
              <p className="text-xs text-[#888]">Daily customer message traffic mapped against captured sales orders.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Legends */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-[#EDEDED] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                  Messages
                </span>
                <span className="flex items-center gap-1.5 text-[#EDEDED] font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Orders
                </span>
              </div>

              {/* View Toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#111] border border-[#222]">
                <button
                  onClick={() => setChartMode("AREA")}
                  className={cn(
                    "p-1.5 rounded-md text-xs transition-all",
                    chartMode === "AREA" ? "bg-white text-black" : "text-[#888] hover:text-[#EDEDED]"
                  )}
                  title="Smooth Area Line View"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setChartMode("BARS")}
                  className={cn(
                    "p-1.5 rounded-md text-xs transition-all",
                    chartMode === "BARS" ? "bg-white text-black" : "text-[#888] hover:text-[#EDEDED]"
                  )}
                  title="Refined Minimal Bars View"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="relative pt-2">
            {/* Live Hover Info Pill */}
            {hoveredPoint && (
              <div className="absolute top-2 left-4 z-10 px-3 py-1.5 rounded-xl bg-[#111]/90 backdrop-blur-md border border-[#333] flex items-center gap-4 text-xs shadow-xl animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] text-[#888] block font-mono">Date</span>
                  <span className="font-bold text-[#EDEDED]">{hoveredPoint.day}, {hoveredPoint.date}</span>
                </div>
                <div className="w-[1px] h-6 bg-[#222]" />
                <div>
                  <span className="text-[10px] text-indigo-400 block font-mono">Messages</span>
                  <span className="font-bold font-mono text-[#EDEDED]">{hoveredPoint.messages}</span>
                </div>
                <div className="w-[1px] h-6 bg-[#222]" />
                <div>
                  <span className="text-[10px] text-[#10B981] block font-mono">Orders Captured</span>
                  <span className="font-bold font-mono text-[#10B981]">{hoveredPoint.orders}</span>
                </div>
                <div className="w-[1px] h-6 bg-[#222]" />
                <div>
                  <span className="text-[10px] text-[#888] block font-mono">Conversion</span>
                  <span className="font-bold font-mono text-amber-400">
                    {Math.round((hoveredPoint.orders / hoveredPoint.messages) * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* 1. SMOOTH AREA SVG CURVE VIEW */}
            {chartMode === "AREA" && (
              <div className="h-64 w-full relative">
                <svg viewBox="0 0 620 220" className="w-full h-full overflow-visible">
                  <defs>
                    {/* Indigo Gradient */}
                    <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>

                    {/* Emerald Gradient */}
                    <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Dotted Gridlines */}
                  <line x1="20" y1="30" x2="600" y2="30" stroke="#1A1A1A" strokeDasharray="4 4" />
                  <text x="5" y="34" fill="#444" fontSize="10" fontFamily="monospace">400</text>

                  <line x1="20" y1="80" x2="600" y2="80" stroke="#1A1A1A" strokeDasharray="4 4" />
                  <text x="5" y="84" fill="#444" fontSize="10" fontFamily="monospace">300</text>

                  <line x1="20" y1="130" x2="600" y2="130" stroke="#1A1A1A" strokeDasharray="4 4" />
                  <text x="5" y="134" fill="#444" fontSize="10" fontFamily="monospace">200</text>

                  <line x1="20" y1="180" x2="600" y2="180" stroke="#1A1A1A" strokeDasharray="4 4" />
                  <text x="5" y="184" fill="#444" fontSize="10" fontFamily="monospace">100</text>

                  {/* Messages Area Gradient & Path (Smooth Bezier) */}
                  <path
                    d="M 40 130 C 85 110, 85 95, 130 95 C 175 95, 175 120, 220 120 C 265 120, 265 60, 310 60 C 355 60, 355 25, 400 25 C 445 25, 445 10, 490 10 C 535 10, 535 20, 580 20 L 580 200 L 40 200 Z"
                    fill="url(#msgGrad)"
                  />
                  <path
                    d="M 40 130 C 85 110, 85 95, 130 95 C 175 95, 175 120, 220 120 C 265 120, 265 60, 310 60 C 355 60, 355 25, 400 25 C 445 25, 445 10, 490 10 C 535 10, 535 20, 580 20"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Orders Area Gradient & Path (Smooth Bezier) */}
                  <path
                    d="M 40 175 C 85 160, 85 145, 130 145 C 175 145, 175 165, 220 165 C 265 165, 265 110, 310 110 C 355 110, 355 70, 400 70 C 445 70, 445 35, 490 35 C 535 35, 535 45, 580 45 L 580 200 L 40 200 Z"
                    fill="url(#ordGrad)"
                  />
                  <path
                    d="M 40 175 C 85 160, 85 145, 130 145 C 175 145, 175 165, 220 165 C 265 165, 265 110, 310 110 C 355 110, 355 70, 400 70 C 445 70, 445 35, 490 35 C 535 35, 535 45, 580 45"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Hover Guideline Cursor */}
                  {hoveredPoint && (
                    <line
                      x1={hoveredPoint.x}
                      y1="10"
                      x2={hoveredPoint.x}
                      y2="200"
                      stroke="#444"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Interactive Day Nodes */}
                  {weeklyData.map((d) => (
                    <g
                      key={d.day}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredPoint(d)}
                    >
                      {/* Messages Point */}
                      <circle
                        cx={d.x}
                        cy={d.msgY}
                        r={hoveredPoint?.day === d.day ? "6" : "4"}
                        fill="#0A0A0A"
                        stroke="#6366F1"
                        strokeWidth="2.5"
                        className="transition-all"
                      />
                      {/* Orders Point */}
                      <circle
                        cx={d.x}
                        cy={d.ordY}
                        r={hoveredPoint?.day === d.day ? "6" : "4"}
                        fill="#0A0A0A"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        className="transition-all"
                      />
                      {/* X-Axis Day Labels */}
                      <text
                        x={d.x}
                        y="218"
                        textAnchor="middle"
                        fill={hoveredPoint?.day === d.day ? "#EDEDED" : "#777"}
                        fontSize="11"
                        fontWeight={hoveredPoint?.day === d.day ? "bold" : "normal"}
                        fontFamily="monospace"
                      >
                        {d.day}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {/* 2. REFINED MODERN MINIMALIST BARS VIEW */}
            {chartMode === "BARS" && (
              <div className="h-64 flex items-end justify-between gap-4 pt-10 px-4">
                {weeklyData.map((d) => {
                  const isHovered = hoveredPoint?.day === d.day;
                  return (
                    <div
                      key={d.day}
                      onMouseEnter={() => setHoveredPoint(d)}
                      className="flex-1 flex flex-col items-center gap-3 h-full justify-end group cursor-pointer"
                    >
                      <div className="w-full flex items-end justify-center gap-2 h-44 bg-[#111] p-1.5 rounded-xl border border-[#1A1A1A] hover:border-[#333] transition-all">
                        {/* Messages Capsule */}
                        <div className="w-2.5 sm:w-3.5 h-full flex items-end">
                          <div
                            className={cn(
                              "w-full rounded-md transition-all duration-300",
                              isHovered
                                ? "bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                                : "bg-indigo-500/70"
                            )}
                            style={{ height: `${(d.messages / 400) * 100}%` }}
                          />
                        </div>
                        {/* Orders Capsule */}
                        <div className="w-2.5 sm:w-3.5 h-full flex items-end">
                          <div
                            className={cn(
                              "w-full rounded-md transition-all duration-300",
                              isHovered
                                ? "bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                                : "bg-[#10B981]/70"
                            )}
                            style={{ height: `${(d.orders / 400) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-mono transition-colors",
                          isHovered ? "text-white font-bold" : "text-[#777]"
                        )}
                      >
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Sentiment & Resolution Breakdown */}
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#EDEDED]">Customer Sentiment Breakdown</h3>
            <p className="text-xs text-[#888] mt-0.5">Automated tone analysis across conversations.</p>
          </div>
          
          <div className="space-y-4 pt-1">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#EDEDED] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
                  Positive (High Intent)
                </span>
                <span className="font-mono text-[#10B981] font-bold">82%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-600 to-[#10B981] w-[82%] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#EDEDED] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]"></span>
                  Neutral (Inquiries)
                </span>
                <span className="font-mono text-[#888] font-bold">15%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div className="h-full bg-indigo-400 w-[15%] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#EDEDED] flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"></span>
                  Negative / Escalated
                </span>
                <span className="font-mono text-amber-500 font-bold">3%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                <div className="h-full bg-amber-500 w-[3%] rounded-full" />
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#111] border border-[#222] space-y-1.5">
            <span className="text-xs font-semibold text-[#EDEDED] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Gemini 2.0 Latency
            </span>
            <p className="text-[11px] text-[#888] leading-relaxed">
              Average inference response speed: <strong className="text-[#EDEDED]">0.8s</strong> across 18,420 queries.
            </p>
          </div>
        </div>
      </div>

      {/* Geo & Channel Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Geo Distribution */}
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-[#EDEDED]">Top Customer Cities</h3>
          </div>
          <div className="space-y-2 pt-2 text-xs">
            {[
              { city: "Dhaka (Dhanmondi, Uttara, Mirpur)", share: "64%", count: "11,780" },
              { city: "Chattogram (Agrabad, Nasirabad)", share: "18%", count: "3,310" },
              { city: "Sylhet (Zindabazar)", share: "11%", count: "2,020" },
              { city: "Others (Khulna, Rajshahi)", share: "7%", count: "1,310" },
            ].map((geo) => (
              <div key={geo.city} className="flex items-center justify-between p-2.5 rounded-xl bg-[#111] border border-[#1A1A1A]">
                <span className="text-[#888] truncate max-w-[180px]">{geo.city}</span>
                <span className="font-mono font-bold text-[#EDEDED]">{geo.share}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm text-[#EDEDED]">Customer Channels</h3>
          </div>
          <div className="space-y-2 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-[#111] border border-[#1A1A1A] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#EDEDED]">Facebook Messenger</p>
                <p className="text-[10px] text-[#888]">3 Connected Pages</p>
              </div>
              <span className="text-sm font-bold font-mono text-[#10B981]">92%</span>
            </div>
            <div className="p-3 rounded-xl bg-[#111] border border-[#1A1A1A] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#EDEDED]">Direct Website Widget</p>
                <p className="text-[10px] text-[#888]">Live Embedded Chat</p>
              </div>
              <span className="text-sm font-bold font-mono text-indigo-400">8%</span>
            </div>
          </div>
        </div>

        {/* Top Inquired Products */}
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-[#EDEDED]">Most Inquired Products</h3>
          </div>
          <div className="space-y-2 pt-2 text-xs">
            {[
              { name: "Ultra Smartwatch Pro", price: "৳ 2,450", inquiries: "4,200 chats" },
              { name: "Wireless ANC Earbuds", price: "৳ 1,900", inquiries: "2,840 chats" },
              { name: "Magnetic 65W Fast Charger", price: "৳ 1,250", inquiries: "1,150 chats" },
            ].map((prod) => (
              <div key={prod.name} className="flex items-center justify-between p-2.5 rounded-xl bg-[#111] border border-[#1A1A1A]">
                <div>
                  <p className="font-semibold text-[#EDEDED]">{prod.name}</p>
                  <span className="text-[10px] text-[#888]">{prod.price}</span>
                </div>
                <span className="text-[11px] font-mono text-amber-500 font-bold">{prod.inquiries}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
