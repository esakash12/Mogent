"use client";

import { useState, useEffect } from "react";
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
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchConversations, fetchMessages, sendMessage, toggleConversationMode } from "@/lib/api";

interface MockMessage {
  id: string;
  sender: "CUSTOMER" | "AI" | "HUMAN";
  text: string;
  time: string;
  thinking?: string;
}

interface MockConversation {
  id: string;
  customerName: string;
  psid: string;
  avatar: string;
  status: "OPEN" | "HANDOFF_REQUIRED" | "RESOLVED";
  isHumanControl: boolean;
  sentiment: number;
  phone?: string;
  address?: string;
  lastMessage: string;
  lastTime: string;
  tag: string;
  messages: MockMessage[];
}

const mockConversations: MockConversation[] = [
  {
    id: "conv-1",
    customerName: "Tanvir Khan",
    psid: "849204918239102",
    avatar: "TK",
    status: "OPEN",
    isHumanControl: false,
    sentiment: 0.85,
    phone: "01819234567",
    address: "House 12, Road 4, Dhanmondi, Dhaka",
    lastMessage: "ক্যাশ অন ডেলিভারি দেওয়া যাবে কি?",
    lastTime: "2m ago",
    tag: "Interested in Watch",
    messages: [
      {
        id: "m1",
        sender: "CUSTOMER",
        text: "আসসালামু আলাইকুম, আপনাদের এই স্মার্ট ওয়াচটি এভেইলেবল আছে?",
        time: "10:14 AM",
      },
      {
        id: "m2",
        sender: "AI",
        text: "ওয়ালাইকুম আসসালাম! জি স্যার, আমাদের স্মার্ট ওয়াচটি বর্তমানে স্টকে এভেইলেবল আছে। আপনি চাইলে এখনই অর্ডার করতে পারেন।",
        time: "10:14 AM",
        thinking:
          "User greeted in Bangla and asked about smartwatch availability. Matched Knowledge Base -> 'Smartwatch Ultra Pro' (2450 BDT). Replied politely confirming in-stock status.",
      },
      {
        id: "m3",
        sender: "CUSTOMER",
        text: "ক্যাশ অন ডেলিভারি দেওয়া যাবে কি?",
        time: "10:15 AM",
      },
      {
        id: "m4",
        sender: "AI",
        text: "জি তানভির ভাই, সারা বাংলাদেশে আমাদের ক্যাশ অন ডেলিভারি সুবিধা রয়েছে। ঢাকার ভেতরে ডেলিভারি চার্জ ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা। আপনার ডেলিভারি ঠিকানা ও ফোন নাম্বারটি দিলে আমরা অর্ডারটি কনফার্ম করে দেব।",
        time: "10:15 AM",
        thinking:
          "User asked about Cash on Delivery (COD). Knowledge Base policy allows COD nationwide with 60 BDT inside Dhaka and 120 BDT outside. Guided user to provide phone number and delivery address for order placement.",
      },
    ],
  },
  {
    id: "conv-2",
    customerName: "Sabbir Mahmud",
    psid: "593019284719283",
    avatar: "SM",
    status: "HANDOFF_REQUIRED",
    isHumanControl: true,
    sentiment: -0.85,
    phone: "01711998877",
    address: "Agrabad, Chattogram",
    lastMessage: "প্রোডাক্টে সমস্যা আছে, আমি ম্যানেজারের সাথে কথা বলতে চাই।",
    lastTime: "15m ago",
    tag: "Complaint / Defect",
    messages: [
      {
        id: "m10",
        sender: "CUSTOMER",
        text: "আমি গত পরশু ওয়াচটা পেয়েছি কিন্তু ডিসপ্লে কাজ করছে না! আপনারা কি নষ্ট জিনিস দেন?",
        time: "9:45 AM",
      },
      {
        id: "m11",
        sender: "AI",
        text: "অত্যন্ত দুঃখিত সাব্বির ভাই আপনার এই অনাকাঙ্ক্ষিত অভিজ্ঞতার জন্য। আমাদের ৭ দিনের ফ্রি রিপ্লেসমেন্ট গ্যারান্টি রয়েছে। আমি আমাদের সাপোর্ট ম্যানেজারকে আপনার সাথে কানেক্ট করে দিচ্ছি।",
        time: "9:45 AM",
        thinking:
          "CRITICAL COMPLAINT: Customer received defective watch with broken display. Negative sentiment detected (-0.85). Triggered ESCALATION protocol. Enqueued Telegram Alert to business owner. Pausing AI auto-reply.",
      },
      {
        id: "m12",
        sender: "CUSTOMER",
        text: "প্রোডাক্টে সমস্যা আছে, আমি ম্যানেজারের সাথে কথা বলতে চাই।",
        time: "9:46 AM",
      },
    ],
  },
  {
    id: "conv-3",
    customerName: "Sadia Afrin",
    psid: "910284918239019",
    avatar: "SA",
    status: "OPEN",
    isHumanControl: false,
    sentiment: 0.95,
    phone: "01755112233",
    address: "Flat 4B, Sector 11, Uttara, Dhaka",
    lastMessage: "বিকাশে টাকা পাঠিয়ে দিয়েছি, অর্ডার কনফার্ম করবেন।",
    lastTime: "1h ago",
    tag: "Payment Done",
    messages: [
      {
        id: "m20",
        sender: "CUSTOMER",
        text: "বিকাশে টাকা পাঠিয়ে দিয়েছি, অর্ডার কনফার্ম করবেন।",
        time: "9:00 AM",
      },
      {
        id: "m21",
        sender: "AI",
        text: "ধন্যবাদ সাদিয়া আপু! আপনার পেমেন্টটি ভেরিফাই করা হয়েছে। আজকেই পার্সেলটি সুন্দরবন কুরিয়ারে বুক করে ট্র্যাকিং কোড পাঠিয়ে দেওয়া হবে।",
        time: "9:01 AM",
        thinking: "Matched payment confirmation intent. Generated delivery dispatch notice.",
      },
    ],
  },
];

export default function LiveInboxPage() {
  const [conversations, setConversations] = useState<MockConversation[]>(mockConversations);
  const [selectedId, setSelectedId] = useState<string>("conv-1");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "AI" | "HUMAN">("ALL");
  const [showThinkingId, setShowThinkingId] = useState<string | null>(null);

  // Fetch live conversations from DB
  useEffect(() => {
    fetchConversations().then((data) => {
      if (data && data.length > 0) {
        setConversations(data);
        if (data[0]) setSelectedId(data[0].id);
      }
    });
  }, []);

  const selectedConv = conversations.find((c) => c.id === selectedId) || conversations[0];

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
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const newMsg: MockMessage = {
      id: `m-${Date.now()}`,
      sender: "HUMAN",
      text: textToSend,
      time: "Just now",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessage: textToSend,
              lastTime: "Just now",
              isHumanControl: true, // sending manual reply switches to human control
            }
          : c
      )
    );
    setInputText("");

    // Send to DB
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

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden shadow-2xl animate-in fade-in duration-300">
      {/* 1. Left Conversation List Pane */}
      <div className="w-full md:w-80 h-[35vh] md:h-auto border-b md:border-b-0 md:border-r border-[#222] flex flex-col shrink-0 bg-[#0A0A0A]">
        {/* Header & Search */}
        <div className="p-3 border-b border-[#222] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-[#EDEDED]">Live Inbox</h2>
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
          <div className="flex items-center gap-1 pt-1">
            {[
              { id: "ALL", label: "All Chats" },
              { id: "AI", label: "AI Handled" },
              { id: "HUMAN", label: "Human Needed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id as any)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors",
                  filterMode === f.id
                    ? "bg-white text-black font-semibold"
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
                  "w-full text-left p-3 rounded-xl transition-all flex items-start gap-3",
                  isSelected
                    ? "bg-[#1C1C1C] border border-[#333]"
                    : "hover:bg-[#111] border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border",
                    conv.isHumanControl
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  )}
                >
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#EDEDED] truncate">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-[#666]">{conv.lastTime}</span>
                  </div>
                  <p className="text-[11px] text-[#888] truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#111] border border-[#222] text-[#888]">
                      {conv.tag}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Middle Chat Stream Window */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#0A0A0A] relative">
        {/* Chat Header with Super-Clean Mode Toggle */}
        <div className="h-16 px-6 border-b border-[#222] flex items-center justify-between bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#EDEDED]">{selectedConv.customerName}</h3>
              <p className="text-[10px] text-[#888] font-mono">PSID: {selectedConv.psid}</p>
            </div>
          </div>

          {/* [ AI Mode | Human Control ] Pill Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[#111] border border-[#222]">
            <button
              onClick={() => handleToggleMode(selectedConv.id, false)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
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
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all",
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
          {selectedConv.messages.map((msg) => {
            const isCustomer = msg.sender === "CUSTOMER";
            const isAI = msg.sender === "AI";
            const isHuman = msg.sender === "HUMAN";

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
                      <Bot className="w-3 h-3" /> Gemini 2.0
                    </span>
                  )}
                  {isHuman && (
                    <span className="text-amber-500 font-medium flex items-center gap-1">
                      <User className="w-3 h-3" /> Support Manager
                    </span>
                  )}
                  <span>• {msg.time}</span>
                </div>

                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                    isCustomer
                      ? "bg-[#181818] text-[#EDEDED] rounded-tl-sm border border-[#262626]"
                      : isAI
                      ? "bg-white text-black font-normal rounded-tr-sm"
                      : "bg-amber-500 text-black font-medium rounded-tr-sm"
                  )}
                >
                  <p>{msg.text}</p>
                </div>

                {isAI && msg.thinking && (
                  <div className="mt-1 flex flex-col items-end">
                    <button
                      onClick={() => setShowThinkingId(showThinkingId === msg.id ? null : msg.id)}
                      className="text-[10px] text-[#666] hover:text-[#EDEDED] flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>{showThinkingId === msg.id ? "Hide Reasoning" : "View AI Reasoning"}</span>
                    </button>
                    {showThinkingId === msg.id && (
                      <div className="mt-1.5 p-2.5 rounded-lg bg-[#111] border border-[#222] text-[10px] font-mono text-[#888] leading-relaxed max-w-md text-left">
                        {msg.thinking}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Response Shortcuts Bar */}
        <div className="px-4 py-2 bg-[#0A0A0A] border-t border-[#222] flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-[#666] shrink-0">Quick Answers:</span>
          <button
            onClick={() => handleSend(undefined, "জি সারা বাংলাদেশে আমাদের ক্যাশ অন ডেলিভারি সুবিধা রয়েছে। ঢাকার ভেতরে ৬০ টাকা, বাইরে ১২০ টাকা।")}
            className="px-2.5 py-1 rounded-md bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] transition-colors shrink-0"
          >
            🚚 ডেলিভারি চার্জ
          </button>
          <button
            onClick={() => handleSend(undefined, "আমাদের বিকাশ মার্চেন্ট নাম্বার: 01700000000 (Make Payment). পেমেন্ট করে ট্রানজেকশন আইডি দিন।")}
            className="px-2.5 py-1 rounded-md bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] transition-colors shrink-0"
          >
            📱 বিকাশ পেমেন্ট
          </button>
          <button
            onClick={() => handleSend(undefined, "ধন্যবাদ! আপনার অর্ডারটি নিশ্চিত করা হয়েছে। দ্রুত পার্সেল পাঠিয়ে দেওয়া হবে।")}
            className="px-2.5 py-1 rounded-md bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] transition-colors shrink-0"
          >
            ✅ অর্ডার কনফার্ম
          </button>
        </div>

        {/* Message Input Box */}
        <form onSubmit={(e) => handleSend(e)} className="p-3 border-t border-[#222] bg-[#0A0A0A] flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedConv.isHumanControl
                ? "Type manual message as Human Manager..."
                : "Type message (Sending manual message will switch to Human Control)..."
            }
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-[#444] placeholder:text-[#555]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs disabled:opacity-50 hover:bg-[#EDEDED] flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* 3. Right Customer Lead Info Drawer */}
      <div className="hidden lg:block w-[280px] border-l border-[#222] p-5 space-y-6 bg-[#0A0A0A] shrink-0 overflow-y-auto">
        <div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#888] mb-3">
            Customer Profile
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#666]" />
              <span className="font-mono text-[#EDEDED]">{selectedConv.phone || "Not provided"}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#666] shrink-0 mt-0.5" />
              <span className="text-[#888] leading-relaxed">{selectedConv.address || "No address yet"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Tag className="w-4 h-4 text-[#666]" />
              <span className="text-xs px-2 py-0.5 rounded bg-[#111] border border-[#222] text-indigo-400">
                {selectedConv.tag}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#222] space-y-3">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#888]">
            AI Sentiment & Analysis
          </h4>
          <div className="p-3.5 rounded-xl bg-[#111] border border-[#222] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">Score</span>
              <span
                className={cn(
                  "font-bold font-mono",
                  selectedConv.sentiment >= 0.7
                    ? "text-[#10B981]"
                    : selectedConv.sentiment >= 0
                    ? "text-blue-400"
                    : "text-amber-500"
                )}
              >
                {selectedConv.sentiment > 0 ? `+${selectedConv.sentiment}` : selectedConv.sentiment}
              </span>
            </div>
            <p className="text-[11px] text-[#666]">
              {selectedConv.sentiment >= 0.7
                ? "Customer is highly satisfied & ready to purchase."
                : selectedConv.sentiment < 0
                ? "Negative complaint detected. Manager intervention advised."
                : "Standard inquiry."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
