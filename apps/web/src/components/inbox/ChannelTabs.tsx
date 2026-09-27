"use client";

import { Facebook, Phone, Layers, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageOption {
  id: string;
  name: string;
}

interface ChannelTabsProps {
  channelFilter: string; // "ALL" | "MESSENGER" | "WHATSAPP" | "PAGE:<id>"
  onSwitchChannel: (channel: string) => void;
  allCount: number;
  messengerCount: number;
  whatsAppCount: number;
  pages?: PageOption[];
}

export function ChannelTabs({
  channelFilter,
  onSwitchChannel,
  allCount,
  messengerCount,
  whatsAppCount,
  pages = [],
}: ChannelTabsProps) {
  const isSpecificPage = channelFilter.startsWith("PAGE:");
  const activePageId = isSpecificPage ? channelFilter.replace("PAGE:", "") : "";

  return (
    <div className="p-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2 shrink-0">
      {/* Primary Channel Pills */}
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => onSwitchChannel("ALL")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            channelFilter === "ALL"
              ? "bg-[#0F172A] text-white shadow-xs"
              : "bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>সব</span>
          {allCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                channelFilter === "ALL" ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#334155]"
              )}
            >
              {allCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onSwitchChannel("MESSENGER")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            channelFilter === "MESSENGER" || isSpecificPage
              ? "bg-[#1877F2] text-white shadow-xs"
              : "bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          )}
        >
          <Facebook className="w-3.5 h-3.5 fill-current" />
          <span>মেসেঞ্জার</span>
          {messengerCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                channelFilter === "MESSENGER" || isSpecificPage ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#334155]"
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
            "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            channelFilter === "WHATSAPP"
              ? "bg-[#25D366] text-white shadow-xs"
              : "bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          )}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
          {whatsAppCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                channelFilter === "WHATSAPP" ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#334155]"
              )}
            >
              {whatsAppCount}
            </span>
          )}
        </button>
      </div>

      {/* Specific Facebook Page Selector Dropdown (When multiple pages exist or Messenger is active) */}
      {pages.length > 0 && (
        <div className="relative">
          <select
            value={channelFilter.startsWith("PAGE:") ? channelFilter : "PAGE_ALL"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "PAGE_ALL") {
                onSwitchChannel("MESSENGER");
              } else {
                onSwitchChannel(val);
              }
            }}
            className="w-full pl-7 pr-8 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[11px] font-semibold text-[#334155] focus:outline-none focus:border-[#1877F2] appearance-none cursor-pointer truncate"
          >
            <option value="PAGE_ALL">
              সকল ফেসবুক পেজ ({pages.length}টি সংযুক্ত)
            </option>
            {pages.map((p) => (
              <option key={p.id} value={`PAGE:${p.id}`}>
                📄 {p.name}
              </option>
            ))}
          </select>
          <Facebook className="w-3.5 h-3.5 text-[#1877F2] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none fill-current" />
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}
    </div>
  );
}
