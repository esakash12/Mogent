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
  Plus,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Sliders,
  Info,
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
  { label: "🎙️ শপ ইন্টারভিউ শুরু করো", prompt: "আসসালামু আলাইকুম, আমাদের শপ সেটআপ করার জন্য তোমার কী কী তথ্য লাগবে জিজ্ঞেস করো।" },
  { label: "🎁 নতুন অফার শেখাও", prompt: "আজকে থেকে কেউ যদি ২টা পাঞ্জাবি নেয় তবে তাকে ১০০ টাকা ডিসকাউন্ট দিবা আর ডেলিভারি চার্জ ফ্রি বলবা।" },
  { label: "🚚 ডেলিভারি নিয়ম", prompt: "আমাদের ডেলিভারি চার্জ ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৩০ টাকা। ঢাকার বাইরে ক্যাশ অন ডেলিভারিতে ১৫০ টাকা অগ্রিম নিবা।" },
  { label: "📦 প্রোডাক্ট যোগ করো", prompt: "একটি নতুন প্রোডাক্ট যোগ করো: প্রিমিয়াম ব্ল্যাক পাঞ্জাবি, দাম ১৪৫০ টাকা, রেগুলার ১৬০০, সাইজ M, L, XL, স্টক ৩০টি।" },
  { label: "📊 সেলস রিপোর্ট", prompt: "আজকে কয়টা অর্ডার আসল এবং মোট সেলস কত হয়েছে জানাও তো?" },
  { label: "📜 বর্তমান সমস্ত নিয়ম", prompt: "আমার শপে এখন পর্যন্ত কী কী অফার ও নিয়ম চালু আছে তার তালিকা দেখাও।" },
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      scrollToBottom();
    }
  }, [session?.messages, activeTab]);

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
        <div className="mt-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-200">
              {payload.summary || "নতুন রুল সক্রিয় হয়েছে"}
            </span>
            <p className="text-emerald-300/80 leading-relaxed">
              {payload.data.instruction}
            </p>
            {payload.data.condition && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-mono">
                শর্ত: {payload.data.condition}
              </span>
            )}
          </div>
        </div>
      );
    }

    if (actionType === "CREATE_PRODUCT" && payload.data) {
      return (
        <div className="mt-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 flex items-start gap-2.5">
          <Package className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <span className="font-semibold text-blue-200">
              {payload.summary || "প্রোডাক্ট ডাটাবেজে যুক্ত হয়েছে"}
            </span>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-blue-200">
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
        <div className="mt-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200">
          <div className="flex items-center gap-2 font-semibold text-purple-300 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>লাইভ স্টোর রিপোর্ট (PostgreSQL Live)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-black/40 border border-purple-500/20">
              <span className="text-[10px] text-gray-400 block">আজকের অর্ডার</span>
              <span className="text-base font-bold text-emerald-400">{todayOrdersCount || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-purple-500/20">
              <span className="text-[10px] text-gray-400 block">পেন্ডিং অর্ডার</span>
              <span className="text-base font-bold text-amber-400">{pendingOrdersCount || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-purple-500/20">
              <span className="text-[10px] text-gray-400 block">মোট অর্ডার</span>
              <span className="text-base font-bold text-white">{totalOrdersCount || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-purple-500/20">
              <span className="text-[10px] text-gray-400 block">মোট সেলস</span>
              <span className="text-base font-bold text-emerald-400">৳{(totalRevenue || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mogent Business Co-Pilot
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Autonomous
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            আপনার শপ পরিচালনা করুন সাধারণ চ্যাটেই — এআই নিজেই নিয়ম শিখবে, অফার সেট করবে, প্রোডাক্ট ম্যানেজ করবে এবং কাস্টমার সেলস ক্লোজ করবে।
          </p>
        </div>

        {/* Multi-Page Selector & Tab Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {pages.length > 0 && (
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">🌐 All Channels (Workspace-wide)</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  📄 {p.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center rounded-xl bg-card border border-border p-1">
            <button
              onClick={() => setActiveTab("CHAT")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "CHAT"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Co-Pilot Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("MEMORIES")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                activeTab === "MEMORIES"
                  ? "bg-emerald-500 text-white shadow-sm"
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
        <div className="flex flex-col items-center justify-center min-h-[420px] rounded-2xl bg-card border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-xs text-muted-foreground">বিজনেস কো-পাইলট লোড হচ্ছে...</p>
        </div>
      ) : activeTab === "CHAT" ? (
        /* TAB 1: CO-PILOT CHAT INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[640px]">
          {/* Quick Action Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>দ্রুত শেখানোর প্রম্পট</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                নিচের যেকোনো টপিক ক্লিক করলে কো-পাইলট স্বয়ংক্রিয়ভাবে প্রম্পট টাইপ করে কাজ শুরু করবে:
              </p>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={sending}
                    className="w-full text-left p-2.5 rounded-xl bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent text-xs text-muted-foreground hover:text-emerald-400 transition-all flex items-center justify-between group disabled:opacity-50"
                  >
                    <span className="font-medium text-[11px] truncate">{qp.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Memory Stats */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-2.5">
              <span className="text-xs font-semibold text-foreground block">
                সক্রিয় মেমোরি স্টেট
              </span>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">সংরক্ষিত নিয়মসমূহ:</span>
                <span className="font-semibold text-emerald-400">{memories.length}টি রুল</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">ডাটাবেজ স্টোরেজ:</span>
                <span className="font-semibold text-foreground">100% PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-muted-foreground">কাস্টমার চ্যাট সিঙ্ক:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> লাইভ সিঙ্কড
                </span>
              </div>
            </div>
          </div>

          {/* Main Chat Stream */}
          <div className="lg:col-span-3 flex flex-col rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
            {/* Chat Messages */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[540px]">
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
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                          isOwner
                            ? "bg-emerald-600 text-white"
                            : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"
                        )}
                      >
                        {isOwner ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      <div
                        className={cn(
                          "max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm leading-relaxed",
                          isOwner
                            ? "bg-emerald-600 text-white rounded-tr-none"
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
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span>কো-পাইলট আপনার নিয়মটি বিশ্লেষণ ও কার্যকর করছে...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 border-t border-border bg-card/60 backdrop-blur">
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
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm shadow-emerald-600/20"
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
                চ্যাটের মাধ্যমে আপনি যা যা শিখিয়েছেন তা এখানে পারমানেন্টলি PostgreSQL-এ সেভ রয়েছে এবং মেসেঞ্জার ও হোয়াটসঅ্যাপে লাইভ কাজ করছে।
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
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
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
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
                      "p-4 rounded-2xl border transition-all flex flex-col justify-between",
                      mem.isActive
                        ? "bg-card border-border hover:border-emerald-500/40"
                        : "bg-muted/30 border-border/40 opacity-60"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {mem.category}
                        </span>
                        {mem.facebookPage && (
                          <span className="text-[10px] text-muted-foreground">
                            📄 {mem.facebookPage.name}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground">{mem.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {mem.instruction}
                      </p>

                      {mem.condition && (
                        <div className="p-2 rounded-lg bg-black/30 border border-border/40 text-[11px] font-mono text-emerald-300">
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
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
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
