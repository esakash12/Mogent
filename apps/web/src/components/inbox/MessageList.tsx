"use client";

import { RefObject } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useInbox";

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  isWhatsApp: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  loading,
  isWhatsApp,
  messagesEndRef,
}: MessageListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-[#64748B]">
        {isWhatsApp
          ? "হোয়াটসঅ্যাপে এখনও কোনো মেসেজ নেই। নিচে মেসেজ লিখে পাঠানো শুরু করুন।"
          : "No messages yet. Send a message below."}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 scrollbar-thin">
      {messages.map((m) => {
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
                  : isWhatsApp
                  ? "bg-[#25D366] text-white font-semibold rounded-tr-xs"
                  : "bg-[#F59E0B] text-black font-semibold rounded-tr-xs"
              )}
            >
              {m.text}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#64748B]">
              <span>
                {m.sender === "AI" ? "⚡ AI" : m.sender === "HUMAN" ? "👤 Agent" : "Customer"}
              </span>
              <span>•</span>
              <span>{m.time}</span>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
