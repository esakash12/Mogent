"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  Package,
  Layers,
  CheckCircle2,
  Trash2,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Info,
  Truck,
  Mic,
  BarChart3,
  ScrollText,
  Search,
  SlidersHorizontal,
  Check,
  BookOpen,
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

const QUICK_PROMPTS = [
  {
    icon: Mic,
    badge: "INTERVIEW",
    label: "Store Interview",
    prompt: "আসসালামু আলাইকুম, আমাদের শপ সেটআপ করার জন্য তোমার কী কী তথ্য লাগবে জিজ্ঞেস করো।",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    iconColor: "text-amber-500",
  },
  {
    icon: Sparkles,
    badge: "PROMO",
    label: "2টা নিলে ফ্রি ডেলিভারি",
    prompt: "আজকে থেকে কেউ যদি ২টা বা তার বেশি কার্ড নেয় তবে ডেলিভারি সম্পূর্ণ ফ্রি বলবা।",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    iconColor: "text-rose-500",
  },
  {
    icon: Truck,
    badge: "DELIVERY",
    label: "ডেলিভারি চার্জ ৫০ টাকা",
    prompt: "আমাদের ১টি কার্ডের ডেলিভারি চার্জ ৫০ টাকা এবং কার্ডের বিক্রয় মূল্য ১৫০ টাকা।",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    iconColor: "text-blue-500",
  },
  {
    icon: Package,
    badge: "PRICE",
    label: "১ পিস কার্ড ১৫০ টাকা",
    prompt: "আমাদের ১ পিস PVC ID Card এর দাম ১৫০ টাকা।",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  {
    icon: BarChart3,
    badge: "STATS",
    label: "আজকের সেলস রিপোর্ট",
    prompt: "আজকে কয়টা অর্ডার আসল এবং মোট সেলস কত হয়েছে জানাও তো?",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    iconColor: "text-purple-500",
  },
];

export default function CoPilotPage() {
  const [activeTab, setActiveTab] = useState<"CHAT" | "NOTE" | "MEMORIES">("CHAT");
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
  const [notePulseTriggered, setNotePulseTriggered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Check URL query on mount for direct tab switching
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.search.includes("tab=memories")) {
        setActiveTab("MEMORIES");
      } else if (window.location.search.includes("tab=note")) {
        setActiveTab("NOTE");
      }
    }
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior,
      });
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

  useEffect(() => {
    if (activeTab === "CHAT") {
      scrollToBottom("smooth");
      const timer = setTimeout(() => scrollToBottom("smooth"), 100);
      return () => clearTimeout(timer);
    }
  }, [session?.messages, sending, activeTab]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || sending) return;

    setInputValue("");
    setSending(true);

    // Optimistic UI push
    const optimisticMsg: any = {
      id: `temp-${Date.now()}`,
      sender: "OWNER",
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), optimisticMsg],
      };
    });

    try {
      const res = await sendCoPilotMessage(textToSend, selectedPageId);
      if (res && res.session) {
        setSession(res.session);

        // Flash pulse highlight on the Living Store Brain Note
        setNotePulseTriggered(true);
        setTimeout(() => setNotePulseTriggered(false), 800);

        if (res.action && res.action.type !== "NONE") {
          toast.success(res.action.summary || "Co-Pilot executed action successfully!");
          // Refresh memories in background
          const refreshedMemories = await fetchBusinessMemories(selectedPageId);
          setMemories(refreshedMemories);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleMemory = async (id: string, currentStatus: boolean) => {
    try {
      await toggleBusinessMemory(id, !currentStatus);
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isActive: !currentStatus } : m))
      );
      toast.success(!currentStatus ? "Rule activated" : "Rule paused");
    } catch (err: any) {
      toast.error("Failed to update rule status");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      await deleteBusinessMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("Rule deleted successfully");
    } catch (err: any) {
      toast.error("Failed to delete rule");
    }
  };

  const activeRulesCount = useMemo(() => {
    return memories.filter((m) => m.isActive).length;
  }, [memories]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    memories.forEach((m) => {
      if (m.category) set.add(m.category.toUpperCase());
    });
    return Array.from(set);
  }, [memories]);

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesCategory =
        selectedCategory === "ALL" || m.category.toUpperCase() === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.instruction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.condition && m.condition.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [memories, selectedCategory, searchQuery]);

  const renderActionCard = (actionType?: string | null, payloadStr?: string | null) => {
    if (!actionType || actionType === "NONE" || !payloadStr) return null;
    let payload: any = null;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return null;
    }

    if (actionType === "UPDATE_BRAIN_NOTE" && payload.data) {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs">
          <ScrollText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {payload.summary || "Living Store Note Updated"}
            </span>
            <div className="text-emerald-800/90 dark:text-emerald-200/90 leading-relaxed font-mono text-[11px] bg-emerald-500/10 p-2 rounded-lg line-clamp-3">
              {payload.data.content}
            </div>
          </div>
        </div>
      );
    }

    if (actionType === "TEACH_RULE" && payload.data) {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {payload.summary || "Rule Learned & Activated"}
            </span>
            <p className="text-emerald-800/90 dark:text-emerald-200/90 leading-relaxed font-normal">
              {payload.data.instruction}
            </p>
            {payload.data.condition && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                Condition: {payload.data.condition}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (actionType === "CREATE_PRODUCT" && payload.data) {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2.5 shadow-2xs">
          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-semibold text-blue-700 dark:text-blue-300">
              {payload.summary || "Product Added to Catalog"}
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-blue-800 dark:text-blue-200 font-medium">
              <span>Price: ৳{payload.data.price}</span>
              <span>Stock: {payload.data.stockCount ?? 100} units</span>
              <span>Category: {payload.data.category || "General"}</span>
            </div>
          </div>
        </div>
      );
    }

    if (actionType === "UPDATE_PRODUCT" && payload.data) {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2.5 shadow-2xs">
          <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-semibold text-blue-700 dark:text-blue-300">
              {payload.summary || "Product Price/Stock Updated"}
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-blue-800 dark:text-blue-200 font-medium">
              <span>Price: ৳{payload.data.price}</span>
              <span>Stock: {payload.data.stockCount ?? 100} units</span>
            </div>
          </div>
        </div>
      );
    }

    if (actionType === "STATS_REPORT" && payload.data) {
      const { todayOrdersCount, pendingOrdersCount, totalOrdersCount, totalRevenue } = payload.data;
      return (
        <div className="mt-2.5 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-900 dark:text-purple-100 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300 mb-2.5">
            <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Store Live Sync Report</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">Today&apos;s Orders</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{todayOrdersCount || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">Pending Orders</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{pendingOrdersCount || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">Total Orders</span>
              <span className="text-base font-bold text-foreground">{totalOrdersCount || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">Total Revenue</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">৳{(totalRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3 max-w-[1580px] mx-auto">
      {/* 1. Sleek Minimalist Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Living Store Brain Active
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            • Instant Single Source of Truth
          </span>
        </div>

        {/* Right Controls: Channel Selector & Navigation Tabs */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {pages.length > 0 && (
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs font-medium"
            >
              <option value="ALL">All Connected Pages</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center rounded-lg bg-card border border-border p-0.5 shadow-2xs">
            <button
              onClick={() => setActiveTab("CHAT")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                activeTab === "CHAT"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Co-Pilot & Note</span>
            </button>
            <button
              onClick={() => setActiveTab("NOTE")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                activeTab === "NOTE"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Store Notebook</span>
            </button>
            <button
              onClick={() => setActiveTab("MEMORIES")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                activeTab === "MEMORIES"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Rules ({memories.length})</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[460px] rounded-2xl bg-card border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-xs font-medium text-muted-foreground">Loading Store Brain & Co-Pilot...</p>
        </div>
      ) : activeTab === "CHAT" ? (
        /* TAB 1: DUAL-PANE CO-PILOT CHAT + LIVING STORE NOTE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-140px)] min-h-[640px]">
          {/* Left Column: Co-Pilot Chat Stream (7 Cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col h-full rounded-2xl bg-card border border-border overflow-hidden shadow-2xs">
            {/* Quick Prompts Carousel at the top of chat */}
            <div className="p-2 sm:px-3 border-b border-border/60 bg-muted/20 flex items-center gap-2 overflow-x-auto shrink-0 select-none">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Quick:
              </span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={sending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-border/80 text-[11px] font-medium text-foreground transition-all cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", qp.badgeColor.includes("amber") ? "bg-amber-500" : qp.badgeColor.includes("rose") ? "bg-rose-500" : qp.badgeColor.includes("blue") ? "bg-blue-500" : "bg-emerald-500")} />
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>

            {/* Chat Messages Scroll Container */}
            <div
              ref={chatScrollContainerRef}
              className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 pb-12 scroll-smooth"
            >
              {session?.messages && session.messages.length > 0 ? (
                session.messages.map((msg, index) => {
                  const isOwner = msg.sender === "OWNER";
                  return (
                    <div
                      key={msg.id || index}
                      className={cn(
                        "flex items-start gap-3 text-xs sm:text-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-200",
                        isOwner ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs",
                          isOwner
                            ? "bg-emerald-600 text-white"
                            : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"
                        )}
                      >
                        {isOwner ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div
                        className={cn(
                          "max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 shadow-2xs leading-relaxed",
                          isOwner
                            ? "bg-emerald-600 text-white rounded-tr-none font-medium"
                            : "bg-muted/70 text-foreground border border-border/50 rounded-tl-none"
                        )}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                        {!isOwner && renderActionCard(msg.actionType, msg.actionPayload)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6 text-muted-foreground">
                  <Sparkles className="w-8 h-8 text-emerald-500 mb-2 opacity-60" />
                  <p className="text-xs font-medium">Co-Pilot is ready. Speak naturally in Bangla or English to update your store.</p>
                </div>
              )}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>Co-Pilot is updating store brain notebook...</span>
                </div>
              )}
              <div ref={messagesEndRef} className="h-8 w-full shrink-0" />
            </div>

            {/* Floating Input Bar */}
            <div className="p-3 sm:p-4 border-t border-border bg-card/90 backdrop-blur shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type in Bengali or English (e.g. 'amader 1 pis er dam 150 taka ar delivery 50 tk')..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || sending}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs shadow-emerald-600/20 cursor-pointer shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 px-1">
                <span>Press Enter ↵ to send</span>
                <span>Co-Pilot updates the living notebook on the right in real time</span>
              </div>
            </div>
          </div>

          {/* Right Column: Living Store Brain Note (5 Cols on desktop) */}
          <div className="lg:col-span-5 h-full">
            <StoreBrainNoteCard
              pageId={selectedPageId}
              pages={pages}
              isPulseTriggered={notePulseTriggered}
              onNoteUpdated={() => {
                // Background refresh memories when note is saved
                fetchBusinessMemories(selectedPageId).then(setMemories);
              }}
            />
          </div>
        </div>
      ) : activeTab === "NOTE" ? (
        /* TAB 2: FULL-SCREEN LIVING STORE NOTEBOOK */
        <div className="h-[calc(100vh-140px)] min-h-[600px]">
          <StoreBrainNoteCard
            pageId={selectedPageId}
            pages={pages}
            isFullScreen={true}
            isPulseTriggered={notePulseTriggered}
            onNoteUpdated={() => {
              fetchBusinessMemories(selectedPageId).then(setMemories);
            }}
          />
        </div>
      ) : (
        /* TAB 3: DYNAMIC RULES & STORE MEMORY AUDIT */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-4 rounded-2xl shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Store Brain & Business Memory Audit
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All individual rules, FAQs, delivery conditions, and offers learned by Co-Pilot are stored here permanently.
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted border border-border text-xs text-foreground font-medium transition-all cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshingMemories && "animate-spin")} />
              <span>Refresh Brain</span>
            </button>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules, delivery conditions, FAQs..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0",
                  selectedCategory === "ALL"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All ({memories.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 font-mono",
                    selectedCategory === cat
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredMemories.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2.5 shadow-2xs">
              <Info className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-sm font-semibold text-foreground">No matching rules found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {searchQuery || selectedCategory !== "ALL"
                  ? "Try clearing your search query or selecting another category filter."
                  : "Go to Co-Pilot Chat and teach your AI any offer, rule, or policy in plain Bengali or English."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                  setActiveTab("CHAT");
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open Co-Pilot Chat</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMemories.map((mem) => {
                return (
                  <div
                    key={mem.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs",
                      mem.isActive
                        ? "bg-card border-border hover:border-emerald-500/40"
                        : "bg-muted/20 border-border/40 opacity-60"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono">
                          {mem.category}
                        </span>
                        {mem.facebookPage && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {mem.facebookPage.name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground">{mem.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {mem.instruction}
                      </p>

                      {mem.condition && (
                        <div className="p-2 rounded-lg bg-muted/60 border border-border/50 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-medium">
                          Condition: {mem.condition}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {mem.isActive ? "Active" : "Paused"}
                        </span>
                        <input
                          type="checkbox"
                          checked={mem.isActive}
                          onChange={() => handleToggleMemory(mem.id, mem.isActive)}
                          className="toggle-checkbox w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
