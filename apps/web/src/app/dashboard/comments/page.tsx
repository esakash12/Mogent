"use client";

import { useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Trash2,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "ALL" | "BAD" | "SPAM" | "OFFENSIVE";

export default function FacebookCommentsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [comments, setComments] = useState<any[]>([]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm w-fit">
        <button
          onClick={() => setActiveTab("ALL")}
          className={cn(
            "px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "ALL"
              ? "bg-[#FFFDF5] text-[#D97706] font-bold border border-[#FDE68A] shadow-sm"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          All Comments
        </button>

        <button
          onClick={() => setActiveTab("BAD")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "BAD"
              ? "bg-[#FFFDF5] text-[#D97706] font-bold border border-[#FDE68A] shadow-sm"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
          <span>Bad</span>
        </button>

        <button
          onClick={() => setActiveTab("SPAM")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "SPAM"
              ? "bg-[#FFFDF5] text-[#D97706] font-bold border border-[#FDE68A] shadow-sm"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
          <span>Spam</span>
        </button>

        <button
          onClick={() => setActiveTab("OFFENSIVE")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            activeTab === "OFFENSIVE"
              ? "bg-[#FFFDF5] text-[#DC2626] font-bold border border-[#FECACA] shadow-sm"
              : "text-[#6B7280] hover:text-[#111827]"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#DC2626]"></span>
          <span>Offensive</span>
        </button>
      </div>

      {/* Main Area / Empty State (Exact Match to Screenshot 10) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-20 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-[#9CA3AF]">
          <MessageSquare className="w-8 h-8 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#111827]">No comments yet</h3>
          <p className="text-xs text-[#6B7280]">
            Comments from your Facebook page will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
