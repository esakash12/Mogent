"use client";

import { RefObject } from "react";
import { Loader2, FileText, ExternalLink, Download } from "lucide-react";
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
        const hasMedia = Boolean(m.mediaUrl);
        const isPdf =
          m.mediaType === "FILE" ||
          m.mediaUrl?.toLowerCase().includes(".pdf") ||
          m.text?.toLowerCase().includes(".pdf");
        const isImage =
          m.mediaType === "IMAGE" ||
          (!isPdf && m.mediaUrl?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i)) ||
          (!isPdf && hasMedia);

        const isPurePlaceholder =
          m.text === "[Image]" ||
          m.text === "[Attachment]" ||
          (m.text && m.text.startsWith("[Document:"));

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
                "p-3 md:p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-xs whitespace-pre-wrap overflow-hidden",
                isCustomer
                  ? "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-tl-xs"
                  : m.sender === "HUMAN"
                  ? "bg-[#1E293B] text-white rounded-tr-xs"
                  : isWhatsApp
                  ? "bg-[#25D366] text-white font-semibold rounded-tr-xs"
                  : "bg-[#F59E0B] text-black font-semibold rounded-tr-xs"
              )}
            >
              {/* Image Preview */}
              {hasMedia && isImage && (
                <a
                  href={m.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-2 overflow-hidden rounded-xl border border-black/10 group cursor-pointer"
                  title="ক্লিক করে বড় আকারে দেখুন"
                >
                  <img
                    src={m.mediaUrl}
                    alt="Attached media"
                    className="max-h-64 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </a>
              )}

              {/* PDF / Document Card */}
              {hasMedia && isPdf && (
                <a
                  href={m.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 mb-2 rounded-xl transition-all border cursor-pointer",
                    isCustomer
                      ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                      : "bg-white/10 hover:bg-white/15 border-white/20 text-white"
                  )}
                  title="পিডিএফ দেখতে বা ডাউনলোড করতে ক্লিক করুন"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-xs font-bold leading-tight">
                      {m.fileName || (m.text?.startsWith("[Document:") ? m.text.replace("[Document:", "").replace("]", "").trim() : "PDF Document")}
                    </p>
                    <span className="text-[10px] opacity-75 inline-flex items-center gap-1 mt-0.5">
                      <Download className="w-2.5 h-2.5" />
                      <span>পিডিএফ দেখুন / ডাউনলোড</span>
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </a>
              )}

              {/* Text / Caption */}
              {(!hasMedia || !isPurePlaceholder) && m.text && (
                <div>{m.text}</div>
              )}
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
