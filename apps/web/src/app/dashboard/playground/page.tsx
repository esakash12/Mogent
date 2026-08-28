"use client";

import { useState } from "react";
import {
  Plus,
  RotateCcw,
  Send,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
}

interface TestChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timeAgo: string;
  msgCount: number;
}

export default function TryYourAIPage() {
  const [sessions, setSessions] = useState<TestChatSession[]>([
    {
      id: "1",
      title: "hi",
      lastMessage: "হ্যালো! আপনি কেমন আছেন?",
      timeAgo: "4h ago",
      msgCount: 2,
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("1");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "user",
      text: "hi",
      time: "11:24 AM",
    },
    {
      id: "m2",
      role: "model",
      text: "হ্যালো! আপনি কেমন আছেন? আপনাকে কীভাবে সাহায্য করতে পারি?",
      time: "11:24 AM",
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setInputText("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      let reply = "";
      if (userText.includes("দাম") || userText.toLowerCase().includes("price")) {
        reply = "আমাদের টি-শার্টের প্রাইস ৩৫০ টাকা থেকে শুরু এবং পোলো শার্ট ৫৫০ টাকা। আপনি কোন সাইজ নিতে চান?";
      } else if (userText.includes("অর্ডার") || userText.toLowerCase().includes("order")) {
        reply = "অর্ডার কনফার্ম করার জন্য আপনার নাম, সম্পূর্ণ ঠিকানা এবং মোবাইল নাম্বারটি লিখে পাঠিয়ে দিন।";
      } else if (userText.includes("ডেলিভারি") || userText.toLowerCase().includes("delivery")) {
        reply = "ঢাকার ভেতরে ডেলিভারি চার্জ ৮০ টাকা (১-২ দিন) এবং ঢাকার বাইরে ১৫০ টাকা (২-৪ দিন)।";
      } else {
        reply = "ধন্যবাদ মেসেজের জন্য! আমাদের কাছে প্রিমিয়াম কোয়ালিটি প্রোডাক্ট স্টক আছে। আপনি কি নির্দিষ্ট কিছু দেখতে চান?";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleNewChat = () => {
    const newSession: TestChatSession = {
      id: Date.now().toString(),
      title: "New chat",
      lastMessage: "Started new conversation",
      timeAgo: "Just now",
      msgCount: 0,
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setMessages([]);
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      {/* Left Panel: Test Chats */}
      <div className="w-full md:w-72 border-r border-[#E5E7EB] bg-[#F9FAFB] flex flex-col p-3 space-y-3 shrink-0">
        <span className="text-xs font-bold text-[#111827] px-1">Test chats</span>

        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] text-xs font-semibold text-[#374151] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New chat</span>
        </button>

        <div className="space-y-1 overflow-y-auto flex-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={cn(
                "p-3 rounded-xl cursor-pointer transition-all text-left",
                activeSessionId === s.id
                  ? "bg-white border border-[#E5E7EB] shadow-sm text-[#111827]"
                  : "hover:bg-[#F3F4F6] text-[#6B7280]"
              )}
            >
              <p className="text-xs font-semibold truncate">{s.title}</p>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                {s.timeAgo} • {s.msgCount} msgs
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Chat Simulator */}
      <div className="flex-1 flex flex-col justify-between bg-white">
        {/* Top Header */}
        <div className="p-3 px-6 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FFFDF5] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#111827]">Test chat</p>
              <p className="text-[10px] text-[#059669] flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                <span>Connected</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New chat</span>
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* Today Date Pill */}
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full bg-[#F3F4F6] text-[10px] font-semibold text-[#6B7280]">
              Today
            </span>
          </div>

          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm",
                    isUser
                      ? "bg-[#F59E0B] text-black font-medium rounded-tr-sm"
                      : "bg-white text-[#111827] border border-[#E5E7EB] rounded-tl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="text-[10px] text-[#9CA3AF] mt-1 px-1">{m.time}</span>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F59E0B]" />
              <span>AI is typing...</span>
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E5E7EB] bg-white">
          <div className="relative flex items-center rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] focus-within:border-[#F59E0B] focus-within:ring-2 focus-within:ring-[#F59E0B]/10 transition-all">
            <button
              type="button"
              className="pl-3.5 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
              title="Attach media"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full pl-3 pr-12 py-3 bg-transparent text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="absolute right-2.5 p-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black transition-all disabled:opacity-30 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
