"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  AlertTriangle,
  ShoppingBag,
  Send,
  Loader2,
  CheckCircle2,
  Check,
  Phone,
  MapPin,
  Bot,
  UserCheck,
  ArrowLeft,
  X,
  Plus,
  Package,
  Sparkles,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  toggleConversationMode,
  markSaleCompleted,
  createOrderManual,
} from "@/lib/api";
import { toast } from "@/lib/toast";

interface Message {
  id: string;
  sender: "CUSTOMER" | "AI" | "HUMAN";
  text: string;
  time: string;
}

interface Conversation {
  id: string;
  customerId?: string;
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
  pageId?: string;
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

  // Quick Order Modal State
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderForm, setOrderForm] = useState({
    productName: "",
    totalAmount: "",
    deliveryAddress: "",
    customerPhone: "",
    paymentMethod: "COD",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await fetchConversations();
      if (Array.isArray(data)) {
        setConversations(data);
        if (data.length > 0) {
          // On desktop, auto-select first conversation if none selected
          if (typeof window !== "undefined" && window.innerWidth >= 768) {
            setSelectedId((prev) => (prev && data.some((c) => c.id === prev) ? prev : data[0].id));
          }
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
      toast.success(newControl ? "Human Agent Takeover Active 👤" : "AI Automation Resumed ⚡", {
        description: newControl ? "AI replies paused for this chat." : "AI will now reply automatically.",
      });
    } catch (err) {
      console.error("Toggle control error:", err);
      toast.error("Failed to toggle mode");
    }
  };

  const handleMarkSaleCompleted = async (convId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic UI update
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, status: "RESOLVED", tag: "Sale Completed" } : c
      )
    );

    try {
      const res = await markSaleCompleted(convId);
      if (res?.success) {
        toast.success("Sale Marked as Completed! 🎯", {
          description: "Conversation resolved and tagged as Confirmed Buyer.",
        });
      }
    } catch (err) {
      console.error("Complete sale error:", err);
      toast.error("Failed to mark sale as completed");
      loadData(true);
    }
  };

  const handleOpenOrderModal = () => {
    if (!activeConv) return;
    setOrderForm({
      productName: "",
      totalAmount: "",
      deliveryAddress: activeConv.address || "",
      customerPhone: activeConv.phone || "",
      paymentMethod: "COD",
    });
    setShowOrderModal(true);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !orderForm.customerPhone || !orderForm.totalAmount) {
      toast.error("Required Details Missing", {
        description: "Please provide a phone number and total order amount.",
      });
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customerId: activeConv.customerId || activeConv.id,
        conversationId: activeConv.id,
        customerName: activeConv.customerName,
        customerPhone: orderForm.customerPhone,
        deliveryAddress: orderForm.deliveryAddress,
        productName: orderForm.productName || "1x Product",
        totalAmount: orderForm.totalAmount,
        paymentMethod: orderForm.paymentMethod || "COD",
        status: "CONFIRMED",
        pageId: activeConv.pageId,
      };

      const res = await createOrderManual(orderPayload);

      if (res?.success && res.data) {
        // Optimistically update conversation phone and address
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? {
                  ...c,
                  phone: orderForm.customerPhone,
                  address: orderForm.deliveryAddress,
                  tag: "Confirmed Order",
                }
              : c
          )
        );

        // Send automated confirmation message to chat
        const confirmText = `🎉 আপনার অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে!\n🛍️ প্রোডাক্ট: ${orderForm.productName || "অর্ডারকৃত পণ্য"}\n💵 মোট মূল্য: ৳${orderForm.totalAmount} (${orderForm.paymentMethod})\n📍 ডেলিভারি ঠিকানা: ${orderForm.deliveryAddress || "নোটকৃত"}\n\nঅর্ডার ট্র্যাকিং আইডি: #${res.data.id?.slice(-6)?.toUpperCase() || "ORD"}. ধন্যবাদ! 😊`;

        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const optimisticMsg: Message = {
          id: Date.now().toString(),
          sender: "HUMAN",
          text: confirmText,
          time: now,
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        sendMessage(activeConv.id, confirmText).catch(() => {});

        setShowOrderModal(false);
        toast.success("Order Confirmed & Logged! 🛍️", {
          description: `Order #${res.data.id?.slice(-6)?.toUpperCase() || "ORD"} created. Visible in Orders dashboard.`,
        });
      } else {
        toast.error("Failed to confirm order", {
          description: res?.error || "Please check details and try again.",
        });
      }
    } catch (err: any) {
      console.error("Order confirmation error:", err);
      toast.error("Network error while creating order");
    } finally {
      setIsSubmittingOrder(false);
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
    <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden relative">
      {/* Left Sidebar: Conversations List (Hidden on mobile when chat is selected) */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 border-r border-[#E2E8F0] flex flex-col shrink-0 bg-[#FFFFFF] transition-all",
          selectedId ? "hidden md:flex" : "flex h-full"
        )}
      >
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
        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9] scrollbar-thin">
          {loading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-[#F59E0B] animate-spin" />
              <span className="text-xs font-semibold text-[#64748B]">Loading live chats...</span>
            </div>
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedId;
              const isCompleted = conv.status === "RESOLVED";

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "p-3.5 flex items-start gap-3 cursor-pointer transition-colors text-left relative group",
                    isSelected ? "bg-[#FFFDF5] border-l-4 border-[#F59E0B]" : "hover:bg-[#F8FAFC]",
                    isCompleted && "opacity-80"
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

                    <p className="text-xs text-[#475569] truncate mb-1.5">
                      {conv.lastMessage}
                    </p>

                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCompleted ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Sale Completed
                          </span>
                        ) : conv.isHumanControl ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                            👤 Agent
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                            ⚡ AI
                          </span>
                        )}
                        {conv.phone && (
                          <span className="text-[10px] font-mono text-[#059669] font-medium hidden sm:inline">
                            {conv.phone}
                          </span>
                        )}
                      </div>

                      {/* Sale Completed Tick Button */}
                      <button
                        onClick={(e) => handleMarkSaleCompleted(conv.id, e)}
                        title={isCompleted ? "Sale Completed (Resolved)" : "Mark Sale as Completed"}
                        className={cn(
                          "p-1 rounded-md transition-all shrink-0 cursor-pointer border",
                          isCompleted
                            ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                            : "text-[#94A3B8] hover:text-[#059669] hover:bg-[#ECFDF5] border-transparent hover:border-[#A7F3D0]"
                        )}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
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

      {/* Right Chat Area (Hidden on mobile when no conversation selected) */}
      {activeConv ? (
        <div
          className={cn(
            "flex-1 flex flex-col bg-[#F8FAFC] h-full",
            selectedId ? "flex" : "hidden md:flex"
          )}
        >
          {/* Chat Header */}
          <div className="p-3 md:p-3.5 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Mobile Back Button */}
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden p-1.5 -ml-1 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0"
                title="Back to conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center border border-[#FDE68A] shrink-0">
                {activeConv.customerName?.[0] || "C"}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#0F172A] truncate">
                    {activeConv.customerName}
                  </h3>
                  {activeConv.status === "RESOLVED" && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] shrink-0 hidden sm:inline-flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Completed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-[#64748B] truncate">
                  {activeConv.phone ? (
                    <span className="flex items-center gap-1 text-[#059669] font-mono font-semibold truncate">
                      <Phone className="w-3 h-3 shrink-0" /> {activeConv.phone}
                    </span>
                  ) : (
                    <span className="text-[#94A3B8] italic">No phone captured</span>
                  )}
                  <span className="hidden sm:inline">• {activeConv.pageName || "Facebook Page"}</span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Complete Sale Tick Button */}
              <button
                onClick={(e) => handleMarkSaleCompleted(activeConv.id, e)}
                title="Mark Sale Completed"
                className={cn(
                  "p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1",
                  activeConv.status === "RESOLVED"
                    ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                    : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#ECFDF5] hover:text-[#059669] hover:border-[#A7F3D0]"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{activeConv.status === "RESOLVED" ? "Completed" : "Complete Sale"}</span>
              </button>

              {/* Confirm Order Button */}
              <button
                onClick={handleOpenOrderModal}
                className="px-3 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Create Order for this Customer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Confirm Order</span>
              </button>

              {/* Takeover Mode Toggle */}
              <button
                onClick={handleToggleHumanControl}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border",
                  activeConv.isHumanControl
                    ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] hover:bg-[#D1FAE5]"
                    : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] hover:bg-[#FEE2E2]"
                )}
              >
                {activeConv.isHumanControl ? (
                  <>
                    <Bot className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">AI Mode</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Takeover</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 scrollbar-thin">
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
                      "flex flex-col max-w-[85%] md:max-w-[75%]",
                      isCustomer ? "mr-auto items-start" : "ml-auto items-end"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3 md:p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs whitespace-pre-wrap",
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
          <form onSubmit={handleSendMessage} className="p-2.5 md:p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2">
            <input
              type="text"
              placeholder={activeConv.isHumanControl ? "Type a reply to customer..." : "Takeover to reply manually, or type here..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-4 md:px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center text-[#64748B] gap-2">
          <MessageSquare className="w-10 h-10 text-[#CBD5E1]" />
          <p className="text-xs font-bold text-[#0F172A]">Select a conversation to start chatting</p>
        </div>
      )}

      {/* Quick Order Confirmation Modal */}
      {showOrderModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A]">Confirm Customer Order</h3>
                  <p className="text-[10px] text-[#64748B]">For {activeConv.customerName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1">
                  Product Name / Ordered Items *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Premium Cotton Shirt (L)"
                  value={orderForm.productName}
                  onChange={(e) => setOrderForm({ ...orderForm, productName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Total Amount (৳ BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g., 1250"
                    value={orderForm.totalAmount}
                    onChange={(e) => setOrderForm({ ...orderForm, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={orderForm.paymentMethod}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-semibold focus:outline-none focus:border-[#F59E0B]"
                  >
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1">
                  Customer Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01XXXXXXXXX"
                  value={orderForm.customerPhone}
                  onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#334155] mb-1">
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  placeholder="House, Road, Area, City..."
                  value={orderForm.deliveryAddress}
                  onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                  <span>{isSubmittingOrder ? "Confirming..." : "Confirm & Save Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

