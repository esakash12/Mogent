"use client";

import { Check, CheckCircle2, Facebook, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useInbox";

interface ConversationItemProps {
  conv: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMarkSaleCompleted: (id: string, e: React.MouseEvent) => void;
}

export function ConversationItem({
  conv,
  isSelected,
  onSelect,
  onMarkSaleCompleted,
}: ConversationItemProps) {
  const isCompleted = conv.status === "RESOLVED";
  const isConvWhatsApp =
    (conv.channel || (conv.psid?.startsWith("wa_") ? "WHATSAPP" : "MESSENGER")) === "WHATSAPP";

  return (
    <div
      onClick={() => onSelect(conv.id)}
      className={cn(
        "p-3.5 flex items-start gap-3 cursor-pointer transition-colors text-left relative group",
        isSelected
          ? isConvWhatsApp
            ? "bg-[#F0FDF4] border-l-4 border-[#25D366]"
            : "bg-[#FFFDF5] border-l-4 border-[#F59E0B]"
          : "hover:bg-[#F8FAFC]",
        isCompleted && "opacity-80"
      )}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center border",
            isConvWhatsApp
              ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
              : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
          )}
        >
          {conv.avatar && conv.avatar.length <= 2
            ? conv.avatar
            : conv.customerName?.[0] || (isConvWhatsApp ? "W" : "C")}
        </div>

        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center border-2 border-white shadow-xs",
            isConvWhatsApp ? "bg-[#25D366]" : "bg-[#1877F2]"
          )}
        >
          {isConvWhatsApp ? (
            <Phone className="w-2 h-2" />
          ) : (
            <Facebook className="w-2 h-2 fill-current" />
          )}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <p className="text-xs font-bold text-[#0F172A] truncate">{conv.customerName}</p>
          <span className="text-[10px] text-[#64748B] shrink-0 font-medium">{conv.lastTime}</span>
        </div>

        <p className="text-xs text-[#475569] truncate mb-1.5">{conv.lastMessage}</p>

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

          <button
            onClick={(e) => onMarkSaleCompleted(conv.id, e)}
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
}
