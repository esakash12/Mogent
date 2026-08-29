"use client";

import { Facebook, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelTab } from "@/hooks/useInbox";

interface ChannelTabsProps {
  channelTab: ChannelTab;
  onSwitchChannel: (tab: ChannelTab) => void;
  messengerCount: number;
  whatsAppCount: number;
}

export function ChannelTabs({
  channelTab,
  onSwitchChannel,
  messengerCount,
  whatsAppCount,
}: ChannelTabsProps) {
  return (
    <div className="p-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] grid grid-cols-2 gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onSwitchChannel("MESSENGER")}
        className={cn(
          "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
          channelTab === "MESSENGER"
            ? "bg-[#1877F2] text-white shadow-sm"
            : "bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        )}
      >
        <Facebook className="w-3.5 h-3.5 fill-current" />
        <span>মেসেঞ্জার</span>
        {messengerCount > 0 && (
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              channelTab === "MESSENGER" ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#334155]"
            )}
          >
            {messengerCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onSwitchChannel("WHATSAPP")}
        className={cn(
          "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
          channelTab === "WHATSAPP"
            ? "bg-[#25D366] text-white shadow-sm"
            : "bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        )}
      >
        <Phone className="w-3.5 h-3.5" />
        <span>হোয়াটসঅ্যাপ</span>
        {whatsAppCount > 0 && (
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              channelTab === "WHATSAPP" ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#334155]"
            )}
          >
            {whatsAppCount}
          </span>
        )}
      </button>
    </div>
  );
}
