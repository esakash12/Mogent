"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  AlertTriangle,
  ShoppingBag,
  FileText,
  Send,
  User,
  Sparkles,
  Lock,
  Facebook,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchConversations, fetchMessages, sendMessage, toggleConversationMode } from "@/lib/api";

interface Message {
  id: string;
  sender: "CUSTOMER" | "AI" | "HUMAN";
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  customerName: string;
  psid: string;
  avatar?: string;
  profilePic?: string;
  status: "OPEN" | "HANDOFF_REQUIRED" | "RESOLVED";
  isHumanControl: boolean;
  phone?: string;
  address?: string;
  lastMessage: string;
  lastTime: string;
  tag?: string;
  unresolvedReason?: string | null;
  unresolvedQuestion?: string | null;
}

type FilterTab = "ALL" | "PENDING" | "AI" | "AGENT" | "RESOLVED";

const filterTabsList: { id: FilterTab; label: string }[] = [
  { id: "ALL", label: "সব" },
  { id: "PENDING", label: "অপেক্ষমাণ" },
  { id: "AI", label: "এআই" },
  { id: "AGENT", label: "এজেন্ট" },
  { id: "RESOLVED", label: "সম্পন্ন" },
];

export default function LiveInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      customerName: "MD Shohag",
      psid: "psid_101",
      status: "HANDOFF_REQUIRED",
      isHumanControl: false,
      lastMessage: "আপনার প্রশ্নটি পেয়েছি, আমরা শীঘ্রই উত্তর দিচ্ছি। 😃",
      lastTime: "04:10 PM",
      tag: "PRODUCT NOT IN CATALOG",
      unresolvedReason: "PRODUCT NOT IN CATALOG",
      unresolvedQuestion: "তোমার কি কি পন্য আছে?",
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "CUSTOMER",
      text: "ok thak lagbe na",
      time: "04:10 PM",
    },
    {
      id: "m2",
      sender: "AI",
      text: "ঠিক আছে! পরবর্তীতে কোনো প্রয়োজন হলে জানাবেন। ভালো থাকবেন!",
      time: "04:10 PM",
    },
    {
      id: "m3",
      sender: "CUSTOMER",
      text: "তোমার কি কি পন্য আছে?",
      time: "04:10 PM",
    },
    {
      id: "m4",
      sender: "AI",
      text: "আপনার প্রশ্নটি পেয়েছি, আমরা শীঘ্রই উত্তর দিচ্ছি। 😃",
      time: "04:10 PM",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isNotActionable, setIsNotActionable] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await fetchConversations();
      if (Array.isArray(data) && data.length > 0) {
        setConversations(data);
        if (!selectedId || !data.some((c) => c.id === selectedId)) {
          setSelectedId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId)
      .then((msgs) => {
        if (Array.isArray(msgs) && msgs.length > 0) setMessages(msgs);
      })
      .catch((err) => console.error("Failed to load messages:", err));
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === selectedId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedId) return;

    const text = inputText;
    setInputText("");
    setIsSending(true);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const optimisticMsg: Message = {
      id: Date.now().toString(),
      sender: "HUMAN",
      text,
      time: now,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendMessage(selectedId, text);
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleHumanControl = async () => {
    if (!activeConv) return;
    const newControl = !activeConv.isHumanControl;
    try {
      await toggleConversationMode(activeConv.id, newControl);
      setConversations(
        conversations.map((c) =>
          c.id === activeConv.id ? { ...c, isHumanControl: newControl } : c
        )
      );
    } catch (err) {
      console.error("Toggle control error:", err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "PENDING") return c.status === "HANDOFF_REQUIRED";
    if (activeTab === "AI") return !c.isHumanControl;
    if (activeTab === "AGENT") return c.isHumanControl;
    if (activeTab === "RESOLVED") return c.status === "RESOLVED";
    return true;
  });

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      {/* Left Sidebar: Conversations List */}
      <div className="w-full md:w-80 border-r border-[#E5E7EB] bg-white flex flex-col justify-between shrink-0">
        <div className="p-4 border-b border-[#F3F4F6] space-y-3">
          <h2 className="text-sm font-bold text-[#111827]">ইনবক্স</h2>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="কথোপকথন খুঁজুন"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {filterTabsList.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                    active
                      ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                      : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9CA3AF]">
              <Loader2 className="w-5 h-5 text-[#F59E0B] animate-spin mx-auto mb-2" />
              <span>Loading messages...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9CA3AF]">
              কোনো কথোপকথন পাওয়া যায়নি
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "p-3 rounded-2xl cursor-pointer transition-all flex items-start gap-3 relative",
                    isSelected
                      ? "bg-[#FFFDF5] border border-[#FEF3C7] shadow-sm"
                      : "hover:bg-[#F9FAFB]"
                  )}
                >
                  {/* Avatar with Messenger Icon Overlay */}
                  <div className="relative w-10 h-10 shrink-0">
                    <div className="w-full h-full rounded-full bg-[#E11D48] text-white flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden">
                      {c.profilePic ? (
                        <img src={c.profilePic} alt={c.customerName} className="w-full h-full object-cover" />
                      ) : (
                        c.customerName[0]?.toUpperCase() || <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#0084FF] flex items-center justify-center">
                        <MessageSquare className="w-2 h-2 text-white fill-white" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#111827] truncate">
                        {c.customerName}
                      </p>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0">
                        {c.lastTime}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                      {c.lastMessage}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                        অপেক্ষমাণ
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Conversation Messages & Reply Box */}
      {activeConv ? (
        <div className="flex-1 flex flex-col justify-between bg-[#F8FAFC]">
          {/* Header */}
          <div className="p-3.5 px-6 border-b border-[#E5E7EB] bg-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 shrink-0">
                <div className="w-full h-full rounded-full bg-[#E11D48] text-white flex items-center justify-center font-bold text-xs">
                  {activeConv.profilePic ? (
                    <img src={activeConv.profilePic} alt={activeConv.customerName} className="w-full h-full object-cover" />
                  ) : (
                    activeConv.customerName[0]?.toUpperCase() || <User className="w-4 h-4" />
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <div className="w-3 h-3 rounded-full bg-[#0084FF] flex items-center justify-center">
                    <MessageSquare className="w-1.5 h-1.5 text-white fill-white" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#111827]">
                  {activeConv.customerName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#D97706] text-[10px] font-bold border border-[#FDE68A]">
                  {activeConv.tag || "PRODUCT NOT IN CATALOG"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                অপেক্ষমাণ
              </span>
              <button
                onClick={handleToggleHumanControl}
                className="px-3.5 py-1.5 rounded-xl border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-xs font-bold text-[#374151] transition-all cursor-pointer shadow-sm"
              >
                {activeConv.isHumanControl ? "এআই সক্রিয় করুন" : "চ্যাটটি নিন"}
              </button>
            </div>
          </div>

          {/* UNRESOLVED AI WARNING CARD (Exact Match to Screenshot 9) */}
          {!isNotActionable && activeConv.status === "HANDOFF_REQUIRED" && (
            <div className="mx-6 my-4 p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-2 text-[#92400E]">
                <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
                <span className="text-xs font-bold">AI couldn&apos;t answer this question</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#78350F]">Reason:</span>
                <span className="px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] text-[11px] font-bold border border-[#FDE68A] flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-[#D97706]" />
                  <span>{activeConv.unresolvedReason || "PRODUCT NOT IN CATALOG"}</span>
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-[#78350F]">Customer asked:</p>
                <div className="p-3 rounded-xl bg-white border border-[#FDE68A] text-xs text-[#111827] font-medium">
                  &ldquo;{activeConv.unresolvedQuestion || "তোমার কি কি পন্য আছে?"}&rdquo;
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <Link
                  href="/dashboard/commerce"
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add product</span>
                </Link>

                <Link
                  href="/dashboard/knowledge"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151] text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>Add to knowledge</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsNotActionable(true)}
                  className="px-3 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827] cursor-pointer"
                >
                  Not actionable
                </button>
              </div>
            </div>
          )}

          {/* Messages Feed */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {messages.map((m) => {
              const isCustomer = m.sender === "CUSTOMER";
              return (
                <div
                  key={m.id}
                  className={cn("flex flex-col", isCustomer ? "items-start" : "items-end")}
                >
                  <div
                    className={cn(
                      "max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm",
                      isCustomer
                        ? "bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-sm"
                        : "bg-[#F59E0B] text-black font-medium rounded-tr-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] mt-1 px-1">{m.time}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E5E7EB] bg-white">
            <div className="relative flex items-center rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] focus-within:border-[#F59E0B] focus-within:ring-2 focus-within:ring-[#F59E0B]/10 transition-all">
              <input
                type="text"
                placeholder="একটি বার্তা লিখুন... (পাঠাতে Enter চাপুন)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-transparent text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="absolute right-2.5 p-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black transition-all disabled:opacity-30 cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-[#9CA3AF]">
          Select a conversation from the left to view messages.
        </div>
      )}
    </div>
  );
}
