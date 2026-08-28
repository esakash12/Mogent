"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  Coins,
  User,
  LogOut,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface PageMeta {
  title: string;
  subtitle: string;
  hasBack?: boolean;
}

const pageMetaMap: Record<string, PageMeta> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of your AI performance, conversations, and leads",
  },
  "/dashboard/commerce": {
    title: "Products",
    subtitle: "Add your product catalog so AI can answer customer questions",
    hasBack: true,
  },
  "/dashboard/products": {
    title: "Products",
    subtitle: "Add your product catalog so AI can answer customer questions",
    hasBack: true,
  },
  "/dashboard/knowledge": {
    title: "Knowledge",
    subtitle: "Add FAQs, policies, and business info to train your AI",
    hasBack: true,
  },
  "/dashboard/services": {
    title: "সার্ভিস",
    subtitle: "List each service you offer — your AI agent uses them to answer customers.",
    hasBack: true,
  },
  "/dashboard/website": {
    title: "Website",
    subtitle: "Train your AI agent directly from your website URLs.",
    hasBack: true,
  },
  "/dashboard/playground": {
    title: "Chat",
    subtitle: "Test how your AI responds before connecting to real customers",
    hasBack: true,
  },
  "/dashboard/integrations": {
    title: "Integrations",
    subtitle: "Connect your social media accounts to go live",
    hasBack: true,
  },
  "/dashboard/inbox": {
    title: "Inbox",
    subtitle: "Messages between your AI and customers",
    hasBack: true,
  },
  "/dashboard/comments": {
    title: "Comments",
    subtitle: "Facebook post comments and AI auto-replies",
    hasBack: true,
  },
  "/dashboard/broadcasts": {
    title: "ক্যাম্পেইন",
    subtitle: "আপনার নিজের কাস্টমারদের WhatsApp ও Messenger-এ অফার পাঠান।",
    hasBack: true,
  },
  "/dashboard/leads": {
    title: "Leads",
    subtitle: "People who showed interest in your products",
    hasBack: true,
  },
  "/dashboard/orders": {
    title: "Orders",
    subtitle: "Track and manage customer orders",
    hasBack: true,
  },
  "/dashboard/automation": {
    title: "Automation",
    subtitle: "Configure autonomous AI rules, auto-followups, and triggers",
    hasBack: true,
  },
  "/dashboard/settings": {
    title: "Settings",
    subtitle: "Manage your business workspace and notification preferences",
    hasBack: true,
  },
};

export function Header() {
  const [lang, setLang] = useState<"en" | "bn">("bn");
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const currentMeta = pageMetaMap[pathname] || {
    title: pathname.split("/")[2] ? pathname.split("/")[2].charAt(0).toUpperCase() + pathname.split("/")[2].slice(1) : "Dashboard",
    subtitle: "Mogent AI Autonomous Customer Platform",
  };

  return (
    <header className="h-16 border-b border-[#E5E7EB] bg-[#FFFFFF] px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Page Title & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        {currentMeta.hasBack && (
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full border border-[#E5E7EB] hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] hover:text-[#111827] transition-colors shrink-0 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#111827] leading-tight truncate">
            {currentMeta.title}
          </h1>
          <p className="text-xs text-[#6B7280] truncate hidden sm:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
        {/* Automation Quick Button */}
        <Link
          href="/dashboard/automation"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
          <span>✨ অটোমেশন</span>
        </Link>

        {/* Conversations / Credits Badge */}
        <Link
          href="/dashboard/billing"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF5] hover:bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold transition-all shadow-sm"
        >
          <Coins className="w-3.5 h-3.5 text-[#D97706]" />
          <span>🪙 98 কথোপকথন</span>
        </Link>

        {/* Language Switcher Toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-bold">
          <button
            onClick={() => setLang("en")}
            className={cn(
              "px-2.5 py-0.5 rounded-full transition-all cursor-pointer",
              lang === "en"
                ? "bg-[#F59E0B] text-black shadow-sm font-black"
                : "text-[#475569] hover:text-[#0F172A]"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLang("bn")}
            className={cn(
              "px-2.5 py-0.5 rounded-full transition-all cursor-pointer",
              lang === "bn"
                ? "bg-[#F59E0B] text-black shadow-sm font-black"
                : "text-[#475569] hover:text-[#0F172A]"
            )}
          >
            বাংলা
          </button>
        </div>

        {/* User Profile Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full border-2 border-[#FDE68A] bg-[#FEF3C7] text-[#D97706] flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-[#F59E0B]/20 transition-all cursor-pointer"
          >
            {user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-[#E5E7EB] shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-[#F3F4F6]">
                <p className="text-xs font-bold text-[#111827] truncate">{user?.name || "User"}</p>
                <p className="text-[10px] text-[#6B7280] truncate">{user?.email}</p>
              </div>
              <Link
                href="/dashboard/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#374151] hover:bg-[#F9FAFB] transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2] transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
