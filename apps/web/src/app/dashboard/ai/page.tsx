"use client";

import { useState, useEffect, useRef } from "react";
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

const QUICK_PROMPTS = [
  {
    icon: Sparkles,
    badge: "ইন্টারভিউ",
    label: "🎙️ শপ সেটআপ ইন্টারভিউ",
    desc: "দোকানের সব তথ্য এআই ইন্টারভিউ নিয়ে জেনে নিবে",
    prompt: "আসসালামু আলাইকুম, আমাদের শপ সেটআপ করার জন্য তোমার কী কী তথ্য লাগবে জিজ্ঞেস করো।",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  {
    icon: ShoppingBag,
    badge: "ডিসকাউন্ট",
    label: "🎁 ২টা নিলে ১০০ টাকা ছাড়",
    desc: "কম্বো অফার ও ফ্রি ডেলিভারি রুল শেখান",
    prompt: "আজকে থেকে কেউ যদি ২টা পাঞ্জাবি নেয় তবে তাকে ১০০ টাকা ডিসকাউন্ট দিবা আর ডেলিভারি চার্জ ফ্রি বলবা।",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  {
    icon: Truck,
    badge: "ডেলিভারি",
    label: "🚚 ডেলিভারি চার্জ ও অগ্রিম শর্ত",
    desc: "ঢাকার ভেতরে ৮০৳ ও বাইরে ১৫০৳ অগ্রিম নিয়ম",
    prompt: "আমাদের ডেলিভারি চার্জ ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৩০ টাকা। ঢাকার বাইরে ক্যাশ অন ডেলিভারিতে ১৫০ টাকা অগ্রিম নিবা।",
    badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  {
    icon: Package,
    badge: "ক্যাটালগ",
    label: "📦 নতুন প্রোডাক্ট যোগ করো",
    desc: "নাম, দাম, সাইজ ও স্টক চ্যাটে যোগ করুন",
    prompt: "একটি নতুন প্রোডাক্ট যোগ করো: প্রিমিয়াম ব্ল্যাক পাঞ্জাবি, দাম ১৪৫০ টাকা, রেগুলার ১৬০০, সাইজ M, L, XL, স্টক ৩০টি।",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  {
    icon: TrendingUp,
    badge: "অ্যানালিটিক্স",
    label: "📊 আজকের সেলস ও অর্ডার রিপোর্ট",
    desc: "লাইভ সেলস ও পেন্ডিং অর্ডারের স্ট্যাটাস জানুন",
    prompt: "আজকে কয়টা অর্ডার আসল এবং মোট সেলস কত হয়েছে জানাও তো?",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  },
  {
    icon: Layers,
    badge: "রুলস",
    label: "📜 চালুকৃত সকল নিয়মের তালিকা",
    desc: "বর্তমান সব অফার ও কন্ডিশন একসাথে দেখুন",
    prompt: "আমার শপে এখন পর্যন্ত কী কী অফার ও নিয়ম চালু আছে তার তালিকা দেখাও।",
    badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  },
];

export default function CoPilotPage() {
  const [activeTab, setActiveTab] = useState<"CHAT" | "MEMORIES">("CHAT");
  const [session, setSession] = useState<CoPilotSessionData | null>(null);
  const [memories, setMemories] = useState<BusinessMemoryItem[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshingMemories, setRefreshingMemories] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

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
      // Double check scroll after card layout settles
      const timer = setTimeout(() => scrollToBottom("smooth"), 80);
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
        if (res.action && res.action.type !== "NONE") {
          toast.success(res.action.summary || "কো-পাইলট অ্যাকশন কার্যকর করেছে!");
          // Refresh memories in background
          const refreshedMemories = await fetchBusinessMemories(selectedPageId);
          setMemories(refreshedMemories);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "মেসেজ পাঠানো সম্ভব হয়নি।");
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
      toast.success(!currentStatus ? "রুল সক্রিয় করা হয়েছে" : "রুল নিষ্ক্রিয় করা হয়েছে");
    } catch (err: any) {
      toast.error("রুল আপডেট করা যায়নি");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত এই নিয়মটি মুছে ফেলতে চান?")) return;
    try {
      await deleteBusinessMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success("নিয়মটি মুছে ফেলা হয়েছে");
    } catch (err: any) {
      toast.error("মুছে ফেলা সম্ভব হয়নি");
    }
  };

  const renderActionCard = (actionType?: string | null, payloadStr?: string | null) => {
    if (!actionType || actionType === "NONE" || !payloadStr) return null;
    let payload: any = null;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return null;
    }

    if (actionType === "TEACH_RULE" && payload.data) {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {payload.summary || "নতুন রুল সক্রিয় হয়েছে"}
            </span>
            <p className="text-emerald-800/90 dark:text-emerald-200/90 leading-relaxed font-normal">
              {payload.data.instruction}
            </p>
            {payload.data.condition && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                শর্ত: {payload.data.condition}
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
              {payload.summary || "প্রোডাক্ট ডাটাবেজে যুক্ত হয়েছে"}
            </span>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-blue-800 dark:text-blue-200 font-medium">
              <span>মূল্য: ৳{payload.data.price}</span>
              <span>স্টক: {payload.data.stockCount ?? 100}টি</span>
              <span>ক্যাটাগরি: {payload.data.category || "General"}</span>
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
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>লাইভ স্টোর রিপোর্ট (Store Sync)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">আজকের অর্ডার</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">{todayOrdersCount || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">পেন্ডিং অর্ডার</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{pendingOrdersCount || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">মোট অর্ডার</span>
              <span className="text-base font-bold text-foreground">{totalOrdersCount || 0}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-card border border-purple-500/20 shadow-2xs">
              <span className="text-[10px] text-muted-foreground block font-medium">মোট সেলস</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">৳{(totalRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3 max-w-[1440px] mx-auto">
      {/* 1. Compact Header (Single Clean Row with Title & Controls) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                Mogent Business Co-Pilot
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                Autonomous
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block truncate">
              স্বাভাবিক বাংলায় কথা বলে শপের নিয়ম, অফার, ক্যাটালগ ও ডেলিভারি পলিসি নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        {/* Right-aligned Page Selector & Tabs */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {pages.length > 0 && (
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
            >
              <option value="ALL">🌐 All Channels</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  📄 {p.name}
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
              <span>Co-Pilot Chat</span>
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
              <Layers className="w-3.5 h-3.5" />
              <span>Learned Rules ({memories.length})</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[460px] rounded-2xl bg-card border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-xs text-muted-foreground">বিজনেস কো-পাইলট লোড হচ্ছে...</p>
        </div>
      ) : activeTab === "CHAT" ? (
        /* TAB 1: CO-PILOT CHAT INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-160px)] min-h-[580px]">
          {/* Quick Action Sidebar (4 Cols on lg, 3 on xl) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3 overflow-y-auto pr-1 flex flex-col">
            {/* Quick Prompts Box */}
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2.5 shadow-2xs shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>দ্রুত শেখানোর প্রম্পট</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">ক্লিক করে পাঠান</span>
              </div>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={sending}
                    className="w-full text-left p-2.5 rounded-xl bg-muted/30 hover:bg-emerald-500/5 hover:border-emerald-500/40 border border-border/70 transition-all group disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {qp.label}
                      </span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-semibold border shrink-0",
                          qp.badgeColor
                        )}
                      >
                        {qp.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                      {qp.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Business-Friendly Store Memory Status */}
            <div className="p-3.5 rounded-2xl bg-card border border-border space-y-2.5 shadow-2xs flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>স্টোর মেমোরি স্ট্যাটাস</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  স্থায়ীভাবে সংরক্ষিত
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">মোট সক্রিয় নিয়ম:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {memories.filter((m) => m.isActive).length}টি লাইভ
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">কাস্টমার চ্যাটে কার্যকর:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ১০০% লাইভ সিঙ্ক
                  </span>
                </div>
              </div>

              {/* Live Preview of Latest Learned Rules */}
              {memories.length > 0 ? (
                <div className="pt-1.5 space-y-1.5 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      সর্বশেষ শেখানো নিয়মসমূহ:
                    </span>
                    <button
                      onClick={() => setActiveTab("MEMORIES")}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      সব দেখুন <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
                    {memories.slice(0, 3).map((mem) => (
                      <div
                        key={mem.id}
                        className="p-2 rounded-xl bg-muted/40 border border-border/60 text-[11px] space-y-0.5 hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-foreground truncate">{mem.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                            {mem.category}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[10px] line-clamp-2 leading-tight">
                          {mem.instruction}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic pt-1">
                  এখনো কোনো নিয়ম শেখানো হয়নি। উপরের প্রম্পট ব্যবহার করে নতুন অফার বা পলিসি শেখান।
                </p>
              )}
            </div>
          </div>

          {/* Main Chat Stream (8 Cols on lg, 9 on xl) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full rounded-2xl bg-card border border-border overflow-hidden shadow-2xs">
            {/* Chat Messages Scroll Container */}
            <div
              ref={chatScrollContainerRef}
              className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 pb-10 scroll-smooth"
            >
              {session?.messages && session.messages.length > 0 ? (
                session.messages.map((msg, index) => {
                  const isOwner = msg.sender === "OWNER";
                  return (
                    <div
                      key={msg.id || index}
                      className={cn(
                        "flex items-start gap-3 text-xs sm:text-sm",
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
                          "max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 shadow-2xs leading-relaxed",
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
                  <p className="text-xs">কো-পাইলট প্রস্তুত। কোনো মেসেজ লিখে পাঠানো শুরু করুন।</p>
                </div>
              )}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>কো-পাইলট আপনার নির্দেশটি বিশ্লেষণ ও কার্যকর করছে...</span>
                </div>
              )}
              {/* Extra generous bottom anchor so the last message is never sliced */}
              <div ref={messagesEndRef} className="h-6 w-full shrink-0" />
            </div>

            {/* Input Bar */}
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
                  placeholder="বাংলায় বলুন (যেমন: 'আজকে থেকে কেউ ২টা নিলে ১০০ টাকা ছাড় দাও' বা 'প্রোডাক্ট যোগ করো')..."
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || sending}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-2xs shadow-emerald-600/20 cursor-pointer"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>পাঠান</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: DYNAMIC ZERO-SCHEMA MEMORIES */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                সংরক্ষিত ডায়নামিক নিয়ম ও পলিসিসমূহ
              </h2>
              <p className="text-xs text-muted-foreground">
                চ্যাটের মাধ্যমে আপনি যা যা শিখিয়েছেন তা এখানে পারমানেন্টলি সংরক্ষিত রয়েছে এবং মেসেঞ্জার ও হোয়াটসঅ্যাপে লাইভ কাজ করছে।
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshingMemories && "animate-spin")} />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          {memories.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
              <Info className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
              <h3 className="text-sm font-semibold text-foreground">এখনো কোনো ডায়নামিক রুল নেই</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                কো-পাইলট চ্যাটে যান এবং বাংলায় যেকোনো অফার, শর্ত বা নিয়ম বলুন। এআই স্বয়ংক্রিয়ভাবে তা এখানে যুক্ত করে নিবে।
              </p>
              <button
                onClick={() => setActiveTab("CHAT")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>কো-পাইলট চ্যাটে যান</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memories.map((mem) => {
                return (
                  <div
                    key={mem.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col justify-between shadow-2xs",
                      mem.isActive
                        ? "bg-card border-border hover:border-emerald-500/40"
                        : "bg-muted/30 border-border/40 opacity-60"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {mem.category}
                        </span>
                        {mem.facebookPage && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            📄 {mem.facebookPage.name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground">{mem.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {mem.instruction}
                      </p>

                      {mem.condition && (
                        <div className="p-2 rounded-lg bg-muted/60 border border-border/50 text-[11px] font-mono text-emerald-700 dark:text-emerald-300">
                          শর্ত: {mem.condition}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {mem.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
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
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="মুছে ফেলুন"
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
