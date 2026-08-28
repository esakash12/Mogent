"use client";

import { useState } from "react";
import {
  Plus,
  RotateCcw,
  Send,
  Loader2,
  Sparkles,
  Bot,
  User,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { testPlaygroundAI } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
}

export default function TryYourAIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText;
    setInputText("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      time: now,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const res = await testPlaygroundAI({
        message: userText,
        history: historyPayload,
      });

      const replyText =
        res?.data?.reply ||
        res?.reply ||
        (res?.success === false ? `Error: ${res?.error || "AI could not generate response"}` : "আপনার প্রশ্নটি পেয়েছি। আমি শপের সেলস এজেন্ট হিসেবে আপনাকে সহায়তা করছি।");

      setMessages([
        ...newHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: "দুঃখিত, সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="p-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
            <Bot className="w-4 h-4 text-[#D97706]" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
              <span>Try Your AI (Live Simulator)</span>
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Real-time test sandbox connected to your live system prompt and product catalog
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#475569] text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.length > 0 ? (
          messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isUser ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div
                  className={cn(
                    "p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs",
                    isUser
                      ? "bg-[#F59E0B] text-black font-bold rounded-tr-xs"
                      : "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-tl-xs"
                  )}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-[#64748B] mt-1 px-1">{m.time}</span>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#64748B] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
              <Sparkles className="w-6 h-6 text-[#D97706]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#0F172A]">AI Simulator Ready</h3>
              <p className="text-xs text-[#64748B] max-w-sm">
                Type any query (e.g. asking for products, prices, delivery info) to test how your AI will reply to customers.
              </p>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex items-center gap-2 mr-auto bg-white border border-[#E2E8F0] px-3.5 py-2.5 rounded-2xl text-xs text-[#64748B] rounded-tl-xs shadow-xs">
            <Loader2 className="w-3.5 h-3.5 text-[#F59E0B] animate-spin" />
            <span>AI is generating response...</span>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a question as a customer (e.g. দাম কত?, ডেলিভারি চার্জ কত?)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isTyping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
