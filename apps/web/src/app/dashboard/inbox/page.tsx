"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Sparkles,
  Phone,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Search,
  Filter,
  Star,
  Archive,
  ShoppingBag,
  MoreVertical,
  ChevronDown,
  Facebook,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchConversations, fetchMessages, sendMessage, toggleConversationMode, fetchPages } from "@/lib/api";

interface Message {
  id: string;
  sender: "CUSTOMER" | "AI" | "HUMAN";
  text: string;
  time: string;
  thinking?: string;
}

interface Conversation {
  id: string;
  customerName: string;
  psid: string;
  avatar: string;
  profilePic?: string;
  pageId?: string;
  pageName?: string;
  status: "OPEN" | "HANDOFF_REQUIRED" | "RESOLVED";
  isHumanControl: boolean;
  sentiment: number;
  phone?: string;
  address?: string;
  lastMessage: string;
  lastTime: string;
  tag: string;
  messages?: Message[];
}

export default function LiveInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "AI" | "HUMAN">("ALL");
  const [selectedPageFilter, setSelectedPageFilter] = useState<string>("ALL");
  const [showThinkingId, setShowThinkingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [connectedPages, setConnectedPages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  // Fetch live conversations from DB with optional pageId filter
  const loadConversations = async (pageFilter = selectedPageFilter, isBackground = false) => {
    if (!isBackground) setLoading(true);
    
    try {
      const pageQuery = pageFilter !== "ALL" ? `?pageId=${pageFilter}` : "";
      const [convsData, pagesData] = await Promise.all([
        fetchConversations(pageQuery),
        fetchPages()
      ]);
      
      if (Array.isArray(convsData)) {
        setConversations(convsData);
        if (convsData.length > 0 && (!selectedId || !convsData.some(c => c.id === selectedId))) {
          setSelectedId(convsData[0].id);
        }
      } else {
        setConversations([]);
        setSelectedId(null);
      }

      if (Array.isArray(pagesData)) {
        setConnectedPages(pagesData);
      }
    } catch (err) {
      console.error("Failed to load inbox data", err);
    }

    if (!isBackground) setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    try {
      const data = await fetchMessages(convId);
      if (Array.isArray(data)) setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    const initialPage = saved || "ALL";
    setSelectedPageFilter(initialPage);
    loadConversations(initialPage);

    const handleGlobalPageChange = (e: any) => {
      const newPageId = e.detail?.pageId || "ALL";
      setSelectedPageFilter(newPageId);
      loadConversations(newPageId);
    };

    window.addEventListener("mogent_page_changed", handleGlobalPageChange);
    return () => window.removeEventListener("mogent_page_changed", handleGlobalPageChange);
  }, []);

  useEffect(() => {
    // Polling interval for live updates
    const interval = setInterval(() => {
      loadConversations(selectedPageFilter, true);
      if (selectedId) {
        loadMessages(selectedId);
      }
    }, 5000); // 5 seconds polling
    
    return () => clearInterval(interval);
  }, [selectedId, selectedPageFilter]);

  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  const handleToggleMode = async (convId: string, setHuman: boolean) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              isHumanControl: setHuman,
              status: setHuman ? "HANDOFF_REQUIRED" : "OPEN",
            }
          : c
      )
    );
    await toggleConversationMode(convId, setHuman);
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!selectedId) return;
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: "HUMAN",
      text: textToSend,
      time: "Just now",
    };

    setMessages((prev) => [...prev, newMsg]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              lastMessage: textToSend,
              lastTime: "Just now",
              isHumanControl: true,
            }
          : c
      )
    );
    setInputText("");

    await sendMessage(selectedId, textToSend);
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode =
      filterMode === "ALL" || (filterMode === "AI" ? !c.isHumanControl : c.isHumanControl);
    return matchesSearch && matchesMode;
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs text-[#888]">Loading live customer conversations...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    const hasPage = connectedPages.length > 0;
    const pageName = connectedPages[0]?.name || "Your Facebook Page";

    return (
      <div className="h-[calc(100vh-120px)] rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center space-y-4 shadow-2xl animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-amber-500 shadow-xl">
          <MessageSquare className="w-8 h-8" />
        </div>
        
        {hasPage ? (
          <div className="space-y-2 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>Gateway Listening on: {pageName}</span>
            </div>
            <h2 className="font-bold text-lg text-[#EDEDED]">Waiting for Incoming Messages</h2>
            <p className="text-xs text-[#888] leading-relaxed">
              Your Facebook Page <strong className="text-[#EDEDED]">"{pageName}"</strong> is connected and ready. Send a test message to your page on Messenger, and it will appear here in real-time with autonomous Mogent AI replies!
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-w-md">
            <h2 className="font-bold text-lg text-[#EDEDED]">No Facebook Pages Connected Yet</h2>
            <p className="text-xs text-[#888] leading-relaxed">
              Connect your Facebook business page to activate Mogent AI auto-replies, product recommendations, and real-time live inbox.
            </p>
            <Link
              href="/dashboard/pages"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors cursor-pointer shadow-lg shadow-amber-500/10 mt-2"
            >
              <Facebook className="w-4 h-4" />
              <span>Connect Facebook Page</span>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden shadow-2xl animate-in fade-in duration-300">
      {/* 1. Left Conversation List Pane (Fixed width sidebar) */}
      <div className="w-[320px] lg:w-[360px] shrink-0 border-r border-[#222] flex flex-col h-full bg-[#0A0A0A]">
        {/* Header & Page Switcher */}
        <div className="p-3.5 border-b border-[#222] space-y-2.5 bg-[#0D0D0D]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-[#EDEDED] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span>Live Inbox</span>
              </h2>
              {selectedPageFilter !== "ALL" && (
                <span className="text-[10px] font-mono text-amber-400/90 font-medium truncate max-w-[110px]" title={connectedPages.find(p => p.id === selectedPageFilter)?.name}>
                  • {connectedPages.find(p => p.id === selectedPageFilter)?.name || "Page"}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#111] text-[#10B981] border border-[#222]">
              {conversations.length} Active
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              placeholder="Search chats, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-[#444] placeholder:text-[#555]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 pt-0.5">
            {[
              { id: "ALL", label: "All Chats" },
              { id: "AI", label: "AI Handled" },
              { id: "HUMAN", label: "Human Needed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer",
                  filterMode === f.id
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED] bg-[#111]"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer",
                  isSelected
                    ? "bg-[#181818] border border-[#383838] shadow-md"
                    : "hover:bg-[#111] border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border overflow-hidden",
                    conv.isHumanControl
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                  )}
                >
                  {conv.profilePic ? (
                    <img src={conv.profilePic} alt={conv.customerName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{conv.avatar || "CU"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#EDEDED] truncate">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-[#666]">{conv.lastTime}</span>
                  </div>
                  <p className="text-[11px] text-[#888] truncate">{conv.lastMessage}</p>
                  
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    {conv.pageName && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950/40 border border-blue-500/20 text-blue-300 font-mono">
                        {conv.pageName}
                      </span>
                    )}
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#111] border border-[#222] text-[#888]">
                      {conv.tag}
                    </span>
                    {conv.isHumanControl && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
                        Human
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Right Chat Stream Window */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0 h-full bg-[#0A0A0A] relative">
          {/* Chat Header with Mode Toggle */}
          <div className="h-16 px-6 border-b border-[#222] flex items-center justify-between bg-[#0A0A0A] shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[#EDEDED]">{selectedConv.customerName}</h3>
                  {selectedConv.pageName && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold">
                      {selectedConv.pageName}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#888] font-mono">PSID: {selectedConv.psid}</p>
              </div>
            </div>

            {/* [ AI Mode | Human Control ] Pill Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-[#111] border border-[#222]">
              <button
                onClick={() => handleToggleMode(selectedConv.id, false)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  !selectedConv.isHumanControl
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Mode</span>
              </button>
              <button
                onClick={() => handleToggleMode(selectedConv.id, true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                  selectedConv.isHumanControl
                    ? "bg-amber-500 text-black shadow-sm font-bold"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                <User className="w-3.5 h-3.5" />
                <span>Human Takeover</span>
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg) => {
              const isCustomer = msg.sender === "CUSTOMER";
              const isAI = msg.sender === "AI";
              const isHuman = msg.sender === "HUMAN" || (msg.sender as any) === "HUMAN_AGENT";

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    isCustomer ? "self-start items-start" : "self-end items-end"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#666]">
                    {isCustomer && <span>{selectedConv.customerName}</span>}
                    {isAI && (
                      <span className="text-indigo-400 font-medium flex items-center gap-1">
                        <Bot className="w-3 h-3" /> Mogent AI
                      </span>
                    )}
                    {isHuman && (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <User className="w-3 h-3 text-amber-400" /> Admin / Store Manager
                      </span>
                    )}
                    <span>• {msg.time}</span>
                  </div>

                  <div
                    className={cn(
                      "p-3.5 rounded-2xl text-xs leading-relaxed",
                      isCustomer
                        ? "bg-[#161616] text-[#EDEDED] border border-[#262626] rounded-tl-sm"
                        : isAI
                        ? "bg-gradient-to-r from-indigo-950/60 to-purple-950/60 text-[#EDEDED] border border-indigo-500/30 rounded-tr-sm shadow-md"
                        : "bg-amber-500 text-black font-semibold rounded-tr-sm shadow-md"
                    )}
                  >
                    {msg.text}
                  </div>

                  {/* Internal AI Chain of Thought Toggle */}
                  {msg.thinking && (
                    <div className="mt-1.5 text-[10px]">
                      <button
                        onClick={() =>
                          setShowThinkingId(showThinkingId === msg.id ? null : msg.id)
                        }
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-mono cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{showThinkingId === msg.id ? "Hide Reasoning" : "View AI Reasoning"}</span>
                      </button>

                      {showThinkingId === msg.id && (
                        <div className="mt-1 p-2.5 rounded-lg bg-[#111] border border-indigo-500/20 text-[#888] font-mono text-[10px] max-w-md leading-relaxed animate-in fade-in">
                          {msg.thinking}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-4 border-t border-[#222] bg-[#0A0A0A] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Reply to ${selectedConv.customerName} as Human Manager...`}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[#0A0A0A]">
          <MessageSquare className="w-10 h-10 text-[#444]" />
          <h3 className="text-sm font-semibold text-[#EDEDED]">Select a conversation</h3>
          <p className="text-xs text-[#777]">Choose a customer from the left list to view chat stream.</p>
        </div>
      )}
    </div>
  );
}
