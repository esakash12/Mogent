"use client";

import { useState, useEffect } from "react";
import {
  RotateCcw,
  Send,
  Loader2,
  Sparkles,
  Bot,
  MessageSquare,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { testPlaygroundAI, fetchPages } from "@/lib/api";
import { formatBdTime } from "@/lib/timezone";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  time: string;
  channel?: "MESSENGER" | "WHATSAPP";
  thinking?: string | null;
  button?: { title: string; url: string } | null;
}

export default function TryYourAIPage() {
  const [channel, setChannel] = useState<"MESSENGER" | "WHATSAPP">("MESSENGER");
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    fetchPages()
      .then((data) => {
        if (Array.isArray(data)) setPages(data);
      })
      .catch((err) => console.error("Playground fetch pages error:", err));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText;
    setInputText("");

    const now = formatBdTime(new Date());
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      time: now,
      channel,
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
        channel,
        pageId: selectedPageId !== "ALL" ? selectedPageId : undefined,
      });

      const replyText =
        res?.data?.replyText ||
        res?.data?.reply ||
        res?.replyText ||
        res?.reply ||
        (res?.success === false
          ? `Error: ${res?.error || "AI could not generate response"}`
          : channel === "WHATSAPP"
          ? "জি, বলুন কীভাবে সহায়তা করতে পারি?"
          : "আপনার প্রশ্নটি পেয়েছি। আমি শপের সেলস এজেন্ট হিসেবে আপনাকে সহায়তা করছি।");

      const thinking = res?.data?.thinking || res?.thinking || null;
      const button = res?.data?.button || res?.button || null;

      setMessages([
        ...newHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: replyText,
          time: formatBdTime(new Date()),
          channel,
          thinking,
          button,
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newHistory,
        {
          id: (Date.now() + 1).toString(),
          role: "model",
          text: "দুঃখিত, সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
          time: formatBdTime(new Date()),
          channel,
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
      {/* Top Header with Channel Selector */}
      <div className="p-4 border-b border-[#E2E8F0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center border transition-colors",
              channel === "WHATSAPP"
                ? "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]"
                : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
            )}
          >
            {channel === "WHATSAPP" ? (
              <MessageCircle className="w-5 h-5 text-[#16A34A]" />
            ) : (
              <Bot className="w-5 h-5 text-[#D97706]" />
            )}
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
              <span>Try Your AI (Live Simulator)</span>
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            </h2>
            <p className="text-[11px] text-[#64748B]">
              Preview how your AI responds using Messenger vs. WhatsApp dedicated prompts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Selector */}
          {pages.length > 0 && (
            <div className="relative">
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-hidden focus:ring-1 focus:ring-[#1877F2] cursor-pointer shadow-xs"
              >
                <option value="ALL">All Store Pages</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.businessName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Channel Selector Toggle */}
          <div className="flex items-center p-1 bg-[#F1F5F9] rounded-xl border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => setChannel("MESSENGER")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                channel === "MESSENGER"
                  ? "bg-white text-[#1877F2] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Messenger</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel("WHATSAPP")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                channel === "WHATSAPP"
                  ? "bg-[#25D366] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#475569] text-xs font-bold transition-all cursor-pointer"
              title="Clear chat history"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Sub-Banner */}
      <div
        className={cn(
          "px-4 py-2 border-b text-[11px] font-medium flex items-center justify-between",
          channel === "WHATSAPP"
            ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
            : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]"
        )}
      >
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {channel === "WHATSAPP" ? (
            <span>
              <strong>WhatsApp Channel Active:</strong> Prioritizing your Dedicated WhatsApp System Prompt (Concise sales closer persona).
            </span>
          ) : (
            <span>
              <strong>Facebook Messenger Active:</strong> Using Standard Messenger AI Persona & Catalog Rules.
            </span>
          )}
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/70 border border-black/5">
          {channel === "WHATSAPP" ? "Prompt: WHATSAPP" : "Prompt: MESSENGER"}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.length > 0 ? (
          messages.map((m) => {
            const isUser = m.role === "user";
            const msgChannel = m.channel || "MESSENGER";

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
                    "p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs space-y-1",
                    isUser
                      ? msgChannel === "WHATSAPP"
                        ? "bg-[#25D366] text-white font-bold rounded-tr-xs"
                        : "bg-[#F59E0B] text-black font-bold rounded-tr-xs"
                      : "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-tl-xs"
                  )}
                >
                  <p>{m.text}</p>
                </div>

                {m.thinking && (
                  <details className="mt-1 text-[11px] text-[#64748B] bg-[#F1F5F9] p-2.5 rounded-xl border border-[#E2E8F0] max-w-full">
                    <summary className="font-bold text-[#475569] cursor-pointer select-none">
                      🧠 AI Thinking Process ({msgChannel})
                    </summary>
                    <p className="mt-1.5 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#334155]">
                      {m.thinking}
                    </p>
                  </details>
                )}

                {m.button && (
                  <a
                    href={m.button.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-xl text-[11px] font-bold shadow-xs hover:bg-[#1EBE5D] transition-colors"
                  >
                    {m.button.title}
                  </a>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] mt-1 px-1">
                  <span>{m.time}</span>
                  <span>•</span>
                  <span
                    className={cn(
                      "font-semibold",
                      msgChannel === "WHATSAPP" ? "text-[#16A34A]" : "text-[#1877F2]"
                    )}
                  >
                    {msgChannel}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#64748B] space-y-3">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center border",
                channel === "WHATSAPP"
                  ? "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]"
                  : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
              )}
            >
              {channel === "WHATSAPP" ? (
                <MessageCircle className="w-6 h-6 text-[#16A34A]" />
              ) : (
                <Sparkles className="w-6 h-6 text-[#D97706]" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {channel === "WHATSAPP"
                  ? "WhatsApp AI Simulator Ready"
                  : "Messenger AI Simulator Ready"}
              </h3>
              <p className="text-xs text-[#64748B] max-w-sm">
                {channel === "WHATSAPP"
                  ? "Test how your AI speaks on WhatsApp with concise, natural sales closer answers."
                  : "Type any customer query to test responses according to your standard Facebook Messenger persona."}
              </p>
            </div>
          </div>
        )}

        {isTyping && (
          <div className="flex items-center gap-2 mr-auto bg-white border border-[#E2E8F0] px-3.5 py-2.5 rounded-2xl text-xs text-[#64748B] rounded-tl-xs shadow-xs">
            <Loader2
              className={cn(
                "w-3.5 h-3.5 animate-spin",
                channel === "WHATSAPP" ? "text-[#25D366]" : "text-[#F59E0B]"
              )}
            />
            <span>
              AI is generating response for {channel === "WHATSAPP" ? "WhatsApp" : "Messenger"}...
            </span>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E8F0] bg-white flex items-center gap-2">
        <input
          type="text"
          placeholder={
            channel === "WHATSAPP"
              ? "Ask a question as a WhatsApp customer (e.g. ভাই দাম কত?, সাইজ কি আছে?)..."
              : "Ask a question as a Messenger customer (e.g. দাম কত?, ডেলিভারি চার্জ কত?)..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none",
            channel === "WHATSAPP"
              ? "focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]"
              : "focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
          )}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          className={cn(
            "px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50",
            channel === "WHATSAPP"
              ? "bg-[#25D366] hover:bg-[#20BA5C] text-white"
              : "bg-[#F59E0B] hover:bg-[#D97706] text-black"
          )}
        >
          {isTyping ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
