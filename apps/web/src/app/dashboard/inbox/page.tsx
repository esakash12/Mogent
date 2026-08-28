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
  Phone,
  MapPin,
  Bot,
  UserCheck,
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
  pageName?: string;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await fetchConversations();
      if (Array.isArray(data)) {
        setConversations(data);
        if (data.length > 0) {
          setSelectedId((prev) => (prev && data.some((c) => c.id === prev) ? prev : data[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to load live inbox:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setMessagesLoading(true);
    fetchMessages(selectedId)
      .then((msgs) => {
        if (Array.isArray(msgs)) setMessages(msgs);
      })
      .catch((err) => console.error("Failed to load messages:", err))
      .finally(() => setMessagesLoading(false));
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

    if (activeTab === "ALL") return matchesSearch;
    if (activeTab === "PENDING") return matchesSearch && (c.status === "HANDOFF_REQUIRED" || c.isHumanControl);
    if (activeTab === "AI") return matchesSearch && !c.isHumanControl && c.status !== "RESOLVED";
    if (activeTab === "AGENT") return matchesSearch && c.isHumanControl;
    if (activeTab === "RESOLVED") return matchesSearch && c.status === "RESOLVED";
    return matchesSearch;
  });

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Left Sidebar: Conversations List */}
      <div className="w-full md:w-80 lg:w-96 border-r border-[#E2E8F0] flex flex-col shrink-0 bg-[#FFFFFF]">
        {/* Search Header */}
        <div className="p-3.5 border-b border-[#F1F5F9] space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          {/* 5 Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5">
            {filterTabsList.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                    active
                      ? "bg-[#F59E0B] text-black shadow-sm"
                      : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-[#F59E0B] animate-spin" />
              <span className="text-xs font-semibold text-[#64748B]">Loading live chats...</span>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "p-3.5 flex items-start gap-3 cursor-pointer transition-colors text-left relative",
                    isSelected ? "bg-[#FFFDF5] border-l-4 border-[#F59E0B]" : "hover:bg-[#F8FAFC]"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center border border-[#FDE68A]">
                      {conv.avatar && conv.avatar.length <= 2 ? conv.avatar : conv.customerName?.[0] || "C"}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#1877F2] text-white flex items-center justify-center border-2 border-white shadow-xs">
                      <Facebook className="w-2 h-2 fill-current" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {conv.customerName}
                      </p>
                      <span className="text-[10px] text-[#64748B] shrink-0 font-medium">
                        {conv.lastTime}
                      </span>
                    </div>

                    <p className="text-xs text-[#475569] truncate mb-1">
                      {conv.lastMessage}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {conv.isHumanControl ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          👤 Agent Control
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                          ⚡ AI Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-[#F8FAFC]">
          {/* Chat Header */}
          <div className="p-3.5 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center border border-[#FDE68A]">
                {activeConv.customerName?.[0] || "C"}
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0F172A]">
                  {activeConv.customerName}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                  {activeConv.phone && (
                    <span className="flex items-center gap-1 text-[#059669] font-mono font-semibold">
                      <Phone className="w-3 h-3" /> {activeConv.phone}
                    </span>
                  )}
                  <span>• {activeConv.pageName || "Facebook Page"}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleHumanControl}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border",
                activeConv.isHumanControl
                  ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] hover:bg-[#D1FAE5]"
                  : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]"
              )}
            >
              {activeConv.isHumanControl ? (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span>Resume AI Mode</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Human Takeover</span>
                </>
              )}
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messagesLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
              </div>
            ) : messages.length > 0 ? (
              messages.map((m) => {
                const isCustomer = m.sender === "CUSTOMER";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col max-w-[75%]",
                      isCustomer ? "mr-auto items-start" : "ml-auto items-end"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs",
                        isCustomer
                          ? "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-tl-xs"
                          : m.sender === "HUMAN"
                          ? "bg-[#1E293B] text-white rounded-tr-xs"
                          : "bg-[#F59E0B] text-black font-semibold rounded-tr-xs"
                      )}
                    >
                      {m.text}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#64748B]">
                      <span>{m.sender === "AI" ? "⚡ AI" : m.sender === "HUMAN" ? "👤 Agent" : "Customer"}</span>
                      <span>•</span>
                      <span>{m.time}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No messages in this chat yet.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder={activeConv.isHumanControl ? "Type a reply to customer..." : "Takeover to reply manually, or type here..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#64748B] gap-2">
          <MessageSquare className="w-10 h-10 text-[#CBD5E1]" />
          <p className="text-xs font-bold text-[#0F172A]">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  );
}
