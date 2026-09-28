"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Package,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ShieldCheck,
  MessageSquare,
  Info,
  Truck,
  Mic,
  BarChart3,
  ScrollText,
  Search,
  ZapIcon,
  Activity,
  FileEdit,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  fetchCoPilotSession,
  sendCoPilotMessage,
  fetchBusinessMemories,
  deleteBusinessMemory,
  toggleBusinessMemory,
  fetchPages,
  BusinessMemoryItem,
  CoPilotSessionData,
} from "@/lib/api";
import { StoreBrainNoteCard } from "@/components/store-brain-note-card";

// ─────────────────────────────────────────────────────────
// Quick action pill data
// ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  {
    icon: Mic,
    label: "Store Interview",
    color: "amber",
    prompt:
      "আমাদের শপ সেটআপ করার জন্য তোমার কী কী তথ্য লাগবে সেটা জিজ্ঞেস করো।",
  },
  {
    icon: Sparkles,
    label: "Free Delivery Offer",
    color: "rose",
    prompt:
      "আজকে থেকে কেউ যদি ২টা বা তার বেশি কার্ড নেয় তবে ডেলিভারি সম্পূর্ণ ফ্রি বলবা।",
  },
  {
    icon: Truck,
    label: "Delivery Charge",
    color: "sky",
    prompt:
      "আমাদের ১টি কার্ডের ডেলিভারি চার্জ ৫০ টাকা এবং কার্ডের বিক্রয় মূল্য ১৫০ টাকা।",
  },
  {
    icon: Package,
    label: "Update Price",
    color: "emerald",
    prompt: "আমাদের ১ পিস PVC ID Card এর দাম ১৫০ টাকা।",
  },
  {
    icon: BarChart3,
    label: "Sales Report",
    color: "violet",
    prompt: "আজকে কয়টা অর্ডার আসল এবং মোট সেলস কত হয়েছে জানাও তো?",
  },
];

const PILL_COLORS: Record<string, string> = {
  amber:
    "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/20",
  rose: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/20",
  sky: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/20",
  emerald:
    "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  violet:
    "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/20",
};

// ─────────────────────────────────────────────────────────
// Typing animation dots
// ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[#F1F5F9] dark:bg-[#1E2A35] border border-[#E2E8F0] dark:border-[#2D3F50] rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Action result cards rendered inside bot messages
// ─────────────────────────────────────────────────────────
function ActionCard({
  actionType,
  payloadStr,
}: {
  actionType?: string | null;
  payloadStr?: string | null;
}) {
  if (!actionType || actionType === "NONE" || !payloadStr) return null;
  let payload: any = null;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return null;
  }

  if (actionType === "UPDATE_BRAIN_NOTE" && payload.data) {
    return (
      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-200">
        <FileEdit className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="font-semibold leading-none mb-1">
            {payload.summary || "Living Store Note updated"}
          </p>
          <p className="text-emerald-700 dark:text-emerald-300 opacity-80 leading-relaxed line-clamp-2 font-mono text-[11px]">
            {payload.data.content?.slice(0, 120)}…
          </p>
        </div>
      </div>
    );
  }

  if (actionType === "TEACH_RULE" && payload.data) {
    return (
      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-xs">
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
        <div>
          <p className="font-semibold text-emerald-700 dark:text-emerald-300 leading-none mb-1">
            {payload.summary || "Rule saved"}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {payload.data.instruction}
          </p>
        </div>
      </div>
    );
  }

  if (
    (actionType === "CREATE_PRODUCT" || actionType === "UPDATE_PRODUCT") &&
    payload.data
  ) {
    return (
      <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-sky-500/8 border border-sky-500/20 text-xs">
        <Package className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-500" />
        <div>
          <p className="font-semibold text-sky-700 dark:text-sky-300 leading-none mb-1.5">
            {payload.summary || "Product updated"}
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] text-sky-800 dark:text-sky-200 font-medium">
            <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20">
              ৳{payload.data.price}
            </span>
            {payload.data.stockCount !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20">
                Stock: {payload.data.stockCount}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (actionType === "STATS_REPORT" && payload.data) {
    const { todayOrdersCount, pendingOrdersCount, totalOrdersCount, totalRevenue } =
      payload.data;
    return (
      <div className="mt-3 p-3 rounded-xl bg-violet-500/8 border border-violet-500/20 text-xs space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-violet-700 dark:text-violet-300">
          <Activity className="w-3.5 h-3.5" />
          Store Analytics
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Today", value: todayOrdersCount ?? 0, color: "emerald" },
            { label: "Pending", value: pendingOrdersCount ?? 0, color: "amber" },
            { label: "Total Orders", value: totalOrdersCount ?? 0, color: "sky" },
            {
              label: "Revenue",
              value: `৳${(totalRevenue ?? 0).toLocaleString()}`,
              color: "emerald",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-white dark:bg-white/5 border border-[#E2E8F0] dark:border-white/10 rounded-lg p-2 text-center"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
              <p
                className={cn(
                  "text-sm font-bold",
                  color === "emerald"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : color === "amber"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-sky-600 dark:text-sky-400"
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────
export default function CoPilotPage() {
  type Tab = "CHAT" | "NOTE" | "MEMORIES";
  const [activeTab, setActiveTab] = useState<Tab>("CHAT");
  const [session, setSession] = useState<CoPilotSessionData | null>(null);
  const [memories, setMemories] = useState<BusinessMemoryItem[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshingMemories, setRefreshingMemories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [notePulse, setNotePulse] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionData, memoriesData, pagesList] = await Promise.all([
        fetchCoPilotSession(),
        fetchBusinessMemories(selectedPageId),
        fetchPages(),
      ]);
      if (sessionData) setSession(sessionData);
      if (Array.isArray(memoriesData)) setMemories(memoriesData);
      if (Array.isArray(pagesList)) setPages(pagesList);
    } catch (err) {
      console.error("CoPilot load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPageId]);

  // Only scroll when messages count changes or tab changes - NEVER on keystrokes
  useEffect(() => {
    if (activeTab === "CHAT" && session?.messages?.length) {
      scrollToBottom("smooth");
      const t = setTimeout(() => scrollToBottom("smooth"), 100);
      return () => clearTimeout(t);
    }
  }, [session?.messages?.length, activeTab]);

  const handleSend = async (customText?: string) => {
    const text = (customText ?? inputValue).trim();
    if (!text || sending) return;
    setInputValue("");
    setSending(true);

    const optimistic: any = {
      id: `opt-${Date.now()}`,
      sender: "OWNER",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setSession((prev) =>
      prev ? { ...prev, messages: [...(prev.messages ?? []), optimistic] } : prev
    );

    try {
      const res = await sendCoPilotMessage(text, selectedPageId);
      if (res?.session) {
        setSession(res.session);
        // Pulse the notebook panel
        setNotePulse(true);
        setTimeout(() => setNotePulse(false), 900);

        if (res.action?.type && res.action.type !== "NONE") {
          toast.success(res.action.summary ?? "Action applied.");
          fetchBusinessMemories(selectedPageId).then(setMemories);
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Message failed.");
    } finally {
      setSending(false);
      // Keep focus on input after send finishes
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleToggleMemory = async (id: string, current: boolean) => {
    try {
      await toggleBusinessMemory(id, !current);
      setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: !current } : m)));
      toast.success(!current ? "Rule activated" : "Rule paused");
    } catch {
      toast.error("Failed to update rule");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("Delete this rule permanently?")) return;
    try {
      await deleteBusinessMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const activeRulesCount = useMemo(() => memories.filter((m) => m.isActive).length, [memories]);
  const categories = useMemo(() => {
    const s = new Set<string>();
    memories.forEach((m) => m.category && s.add(m.category.toUpperCase()));
    return Array.from(s);
  }, [memories]);

  const filteredMemories = useMemo(
    () =>
      memories.filter((m) => {
        const catOk =
          selectedCategory === "ALL" || m.category.toUpperCase() === selectedCategory;
        const q = searchQuery.toLowerCase();
        const searchOk =
          !q ||
          m.title.toLowerCase().includes(q) ||
          m.instruction.toLowerCase().includes(q) ||
          m.condition?.toLowerCase().includes(q);
        return catOk && searchOk;
      }),
    [memories, selectedCategory, searchQuery]
  );

  // ── Skeleton loader ───────────────────────────────────
  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col gap-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-7 w-44 rounded-full bg-[#E2E8F0] dark:bg-[#2D3F50]" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-[#E2E8F0] dark:bg-[#2D3F50]" />
            <div className="h-8 w-48 rounded-xl bg-[#E2E8F0] dark:bg-[#2D3F50]" />
          </div>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <div className="col-span-7 rounded-2xl bg-white dark:bg-[#1A2430] border border-[#E2E8F0] dark:border-[#2D3F50] space-y-4 p-5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  i % 2 === 1 ? "flex-row-reverse" : ""
                )}
              >
                <div className="w-8 h-8 rounded-full bg-[#E2E8F0] dark:bg-[#2D3F50] shrink-0" />
                <div
                  className={cn(
                    "h-12 rounded-2xl bg-[#F1F5F9] dark:bg-[#243040]",
                    i % 2 === 1 ? "w-2/3" : "w-3/4"
                  )}
                />
              </div>
            ))}
          </div>
          <div className="col-span-5 rounded-2xl bg-white dark:bg-[#1A2430] border border-[#E2E8F0] dark:border-[#2D3F50]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-0",
        activeTab === "CHAT" ? "h-[calc(100vh-105px)]" : "min-h-0"
      )}
    >
      {/* ── Topbar (Inlined directly so no component unmounting occurs) ── */}
      <div className="flex items-center justify-between gap-3 shrink-0 px-1 pb-4">
        {/* Left: Status pill */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Store Brain Active
            </span>
          </div>
          <span className="hidden sm:block text-xs text-muted-foreground">
            {activeRulesCount} rule{activeRulesCount !== 1 ? "s" : ""} synced live
          </span>
        </div>

        {/* Right: Page selector + nav tabs */}
        <div className="flex items-center gap-2 shrink-0">
          {pages.length > 0 && (
            <div className="relative">
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="appearance-none text-xs pl-3 pr-7 py-1.5 rounded-lg bg-white dark:bg-[#1E2A35] border border-[#E2E8F0] dark:border-[#2D3F50] text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs font-medium"
              >
                <option value="ALL">All Pages</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Segmented control */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-[#F1F5F9] dark:bg-[#1A2430] border border-[#E2E8F0] dark:border-[#2D3F50] shadow-xs">
            {(
              [
                { id: "CHAT", icon: MessageSquare, label: "Co-Pilot" },
                { id: "NOTE", icon: ScrollText, label: "Notebook" },
                { id: "MEMORIES", icon: ShieldCheck, label: `Rules (${memories.length})` },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as Tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                  activeTab === id
                    ? "bg-white dark:bg-[#243040] text-foreground shadow-xs border border-[#E2E8F0] dark:border-[#2D3F50]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active Tab Content (Directly inlined to preserve DOM elements and input focus) ── */}
      {activeTab === "CHAT" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Left: Chat Panel */}
          <div className="lg:col-span-7 flex flex-col min-h-0 rounded-2xl bg-white dark:bg-[#111B25] border border-[#E2E8F0] dark:border-[#1E2D3D] overflow-hidden shadow-xs shadow-black/[0.04]">
            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#F1F5F9] dark:border-[#1E2D3D] bg-[#FAFBFC] dark:bg-[#0F1923] overflow-x-auto shrink-0 select-none scrollbar-none">
              <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                <ZapIcon className="w-3 h-3 text-amber-500" />
                Quick
              </div>
              <div className="w-px h-4 bg-[#E2E8F0] dark:bg-[#2D3F50] shrink-0" />
              {QUICK_PROMPTS.map((qp, i) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(qp.prompt)}
                    disabled={sending}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-40",
                      PILL_COLORS[qp.color]
                    )}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    {qp.label}
                  </button>
                );
              })}
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-5 space-y-5 scroll-smooth"
            >
              {session?.messages && session.messages.length > 0 ? (
                session.messages.map((msg, idx) => {
                  const isOwner = msg.sender === "OWNER";
                  return (
                    <div
                      key={msg.id ?? idx}
                      className={cn(
                        "flex items-end gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200",
                        isOwner ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5",
                          isOwner
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm shadow-emerald-500/25"
                            : "bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] shadow-sm shadow-violet-500/25"
                        )}
                      >
                        {isOwner ? (
                          <User className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>

                      {/* Bubble */}
                      <div
                        className={cn(
                          "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          isOwner
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-sm shadow-emerald-500/20"
                            : "bg-[#F1F5F9] dark:bg-[#1E2A35] border border-[#E2E8F0] dark:border-[#2D3F50] text-foreground rounded-bl-sm"
                        )}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                        {!isOwner && (
                          <ActionCard
                            actionType={msg.actionType}
                            payloadStr={msg.actionPayload}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold text-foreground">
                      Mogent Co-Pilot Ready
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Speak naturally in Bengali or English. I will update your
                      store notebook in real time.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {QUICK_PROMPTS.slice(0, 3).map((qp, i) => {
                      const Icon = qp.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => handleSend(qp.prompt)}
                          disabled={sending}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                            PILL_COLORS[qp.color]
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {qp.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} className="h-2 w-full" />
            </div>

            {/* Input bar */}
            <div className="shrink-0 px-4 py-3.5 border-t border-[#F1F5F9] dark:border-[#1E2D3D] bg-white dark:bg-[#111B25]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type in Bengali or English — e.g. 'amader price 150 taka'"
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2A35] border border-[#E2E8F0] dark:border-[#2D3F50] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || sending}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white disabled:opacity-40 transition-all shadow-sm shadow-emerald-500/25 cursor-pointer shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
              <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                Enter ↵ to send · Updates sync to Facebook & WhatsApp instantly
              </p>
            </div>
          </div>

          {/* Right: Notebook Panel */}
          <div className="lg:col-span-5 min-h-0">
            <StoreBrainNoteCard
              pageId={selectedPageId}
              pages={pages}
              isPulseTriggered={notePulse}
              onNoteUpdated={() => fetchBusinessMemories(selectedPageId).then(setMemories)}
            />
          </div>
        </div>
      ) : activeTab === "NOTE" ? (
        /* Full-screen notebook view */
        <div className="flex-1 min-h-0">
          <StoreBrainNoteCard
            pageId={selectedPageId}
            pages={pages}
            isFullScreen
            isPulseTriggered={notePulse}
            onNoteUpdated={() => fetchBusinessMemories(selectedPageId).then(setMemories)}
          />
        </div>
      ) : (
        /* Memory / Rules audit view */
        <div className="space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#111B25] border border-[#E2E8F0] dark:border-[#1E2D3D] shadow-xs">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Business Rule Audit
              </h2>
              <p className="text-xs text-muted-foreground">
                All policies and offers taught to the AI — {activeRulesCount} active
              </p>
            </div>
            <button
              onClick={async () => {
                setRefreshingMemories(true);
                const data = await fetchBusinessMemories(selectedPageId);
                setMemories(data);
                setRefreshingMemories(false);
              }}
              disabled={refreshingMemories}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2A35] hover:bg-[#F1F5F9] dark:hover:bg-[#243040] border border-[#E2E8F0] dark:border-[#2D3F50] text-xs text-foreground font-medium transition-all cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshingMemories && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules…"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#1E2A35] border border-[#E2E8F0] dark:border-[#2D3F50] text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 border",
                    selectedCategory === cat
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-white dark:bg-[#1E2A35] border-[#E2E8F0] dark:border-[#2D3F50] text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat === "ALL" ? `All (${memories.length})` : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-2xl bg-white dark:bg-[#111B25] border border-[#E2E8F0] dark:border-[#1E2D3D]">
              <Info className="w-8 h-8 text-muted-foreground opacity-30" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No rules found</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {searchQuery || selectedCategory !== "ALL"
                    ? "Try clearing filters."
                    : "Chat with Co-Pilot to teach your store rules."}
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                  setActiveTab("CHAT");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Open Co-Pilot
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredMemories.map((mem) => (
                <div
                  key={mem.id}
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col gap-3 transition-all duration-150",
                    mem.isActive
                      ? "bg-white dark:bg-[#111B25] border-[#E2E8F0] dark:border-[#1E2D3D] hover:border-emerald-300 dark:hover:border-emerald-500/40 shadow-xs hover:shadow-sm"
                      : "bg-[#F8FAFC] dark:bg-[#0F1923] border-[#E2E8F0] dark:border-[#1E2D3D] opacity-55"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 font-mono">
                      {mem.category}
                    </span>
                    {mem.facebookPage && (
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        {mem.facebookPage.name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-semibold text-foreground leading-tight">
                      {mem.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {mem.instruction}
                    </p>
                    {mem.condition && (
                      <code className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 block">
                        if {mem.condition}
                      </code>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9] dark:border-[#1E2D3D]">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <div
                        onClick={() => handleToggleMemory(mem.id, mem.isActive)}
                        className={cn(
                          "relative w-8 h-4.5 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0",
                          mem.isActive ? "bg-emerald-500" : "bg-[#CBD5E1] dark:bg-[#2D3F50]"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200",
                            mem.isActive ? "left-4" : "left-0.5"
                          )}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {mem.isActive ? "Active" : "Paused"}
                      </span>
                    </label>

                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
