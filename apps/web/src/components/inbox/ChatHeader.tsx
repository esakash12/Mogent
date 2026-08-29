"use client";

import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Phone,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Conversation } from "@/hooks/useInbox";

interface ChatHeaderProps {
  activeConv: Conversation;
  onBack: () => void;
  onToggleControl: () => void;
  onMarkSaleCompleted: (id: string, e: React.MouseEvent) => void;
  onOpenOrderModal: () => void;
}

export function ChatHeader({
  activeConv,
  onBack,
  onToggleControl,
  onMarkSaleCompleted,
  onOpenOrderModal,
}: ChatHeaderProps) {
  const activeConvChannel =
    activeConv.channel || (activeConv.psid?.startsWith("wa_") ? "WHATSAPP" : "MESSENGER");

  return (
    <div className="p-3 md:p-3.5 border-b border-[#E2E8F0] bg-white flex items-center justify-between gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer shrink-0"
          title="Back to conversations"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div
          className={cn(
            "w-8 h-8 md:w-9 md:h-9 rounded-full font-bold text-xs flex items-center justify-center border shrink-0",
            activeConvChannel === "WHATSAPP"
              ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
              : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
          )}
        >
          {activeConv.customerName?.[0] || (activeConvChannel === "WHATSAPP" ? "W" : "C")}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-[#0F172A] truncate">
              {activeConv.customerName}
            </h3>

            {activeConvChannel === "WHATSAPP" ? (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] shrink-0 inline-flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" /> WhatsApp Direct
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] shrink-0 inline-flex items-center gap-1">
                <Facebook className="w-2.5 h-2.5 fill-current" /> Messenger
              </span>
            )}

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
            <span className="hidden sm:inline">
              •{" "}
              {activeConv.pageName ||
                (activeConvChannel === "WHATSAPP" ? "WhatsApp Channel" : "Facebook Page")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {activeConvChannel === "WHATSAPP" && activeConv.phone && (
          <a
            href={`https://wa.me/${activeConv.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#166534] border border-[#86EFAC] text-xs font-bold transition-all flex items-center gap-1"
            title="Open in WhatsApp Web"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Open WhatsApp</span>
          </a>
        )}

        <button
          onClick={(e) => onMarkSaleCompleted(activeConv.id, e)}
          title="Mark Sale Completed"
          className={cn(
            "p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1",
            activeConv.status === "RESOLVED"
              ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
              : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#ECFDF5] hover:text-[#059669] hover:border-[#A7F3D0]"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">
            {activeConv.status === "RESOLVED" ? "Completed" : "Complete Sale"}
          </span>
        </button>

        <button
          onClick={onOpenOrderModal}
          className="px-3 py-1.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          title="Create Order for this Customer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Confirm Order</span>
        </button>

        <button
          onClick={onToggleControl}
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
  );
}
