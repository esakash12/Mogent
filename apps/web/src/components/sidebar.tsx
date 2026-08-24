"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  MessageSquare,
  Users,
  ShoppingBag,
  Bot,
  Share2,
  Settings,
  Sparkles,
  LogOut,
  CreditCard,
  Key,
  Shield,
  CheckCircle2,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const mainNavigation = [
  {
    name: "Analytics",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    name: "Live Inbox",
    href: "/dashboard/inbox",
    icon: MessageSquare,
    badge: "Live",
  },
  {
    name: "Contacts",
    href: "/dashboard/contacts",
    icon: Users,
    matchPrefixes: ["/dashboard/contacts", "/dashboard/leads"],
  },
  {
    name: "Orders & Catalog",
    href: "/dashboard/commerce",
    icon: ShoppingBag,
    badge: "New",
    matchPrefixes: ["/dashboard/commerce", "/dashboard/orders"],
  },
  {
    name: "AI Studio",
    href: "/dashboard/ai",
    icon: Bot,
    matchPrefixes: ["/dashboard/ai", "/dashboard/knowledge", "/dashboard/automation", "/dashboard/playground"],
  },
  {
    name: "Integrations",
    href: "/dashboard/integrations",
    icon: Share2,
    matchPrefixes: ["/dashboard/integrations", "/dashboard/pages", "/dashboard/telegram"],
  },
  {
    name: "Billing & Plans",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const adminNavigation = [
  {
    name: "Gemini Key Pool",
    href: "/dashboard/admin/keys",
    icon: Key,
    badge: "Pool",
  },
  {
    name: "Payment Approvals",
    href: "/dashboard/admin/billing",
    icon: CheckCircle2,
  },
  {
    name: "All Client Stores",
    href: "/dashboard/admin/clients",
    icon: Users,
  },
  {
    name: "Meta OAuth Config",
    href: "/dashboard/admin/settings",
    icon: Shield,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, workspace, logout } = useAuth();

  const isSuperAdmin =
    user?.isAdmin ||
    user?.email === "shohag@burhan.com" ||
    user?.email === "admin@mogent.tech" ||
    user?.email === "shohag.tech@gmail.com" ||
    (user?.email && user.email.toLowerCase().includes("admin"));

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "SA";

  return (
    <aside className="w-[240px] border-r border-[#222] bg-[#0A0A0A] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-20 select-none overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#222]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[15px] tracking-tight text-[#EDEDED]">
                  Mogent
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#222] text-[#888] border border-[#333]">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-[#666] font-medium leading-none">
                AI Customer Engine
              </span>
            </div>
          </Link>
        </div>

        {/* Primary Navigation Menu */}
        <nav className="p-3 space-y-1 mt-2">
          {mainNavigation.map((item) => {
            const isActive =
              item.matchPrefixes
                ? item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
                : pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-[#1C1C1C] text-[#EDEDED] font-semibold border border-[#333] shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED] hover:bg-[#121212]"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] transition-colors",
                      isActive ? "text-white" : "text-[#777] group-hover:text-[#EDEDED]"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1.5",
                      isActive
                        ? "bg-white text-black font-bold"
                        : "bg-[#222] text-[#888] group-hover:text-[#EDEDED]"
                    )}
                  >
                    {item.badge === "Live" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                    )}
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Super Admin Console Section (For Platform Owner) */}
        {isSuperAdmin && (
          <div className="px-3 pt-4 pb-2 border-t border-[#1C1C1C] mt-2">
            <div className="px-3 py-1 flex items-center gap-2 text-[10px] font-bold tracking-wider text-amber-500 uppercase">
              <Shield className="w-3 h-3" />
              <span>Super Admin Suite</span>
            </div>
            <nav className="space-y-1 mt-1.5">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-amber-500/10 text-amber-500 font-bold border border-amber-500/30"
                        : "text-[#888] hover:text-[#EDEDED] hover:bg-[#121212]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Footer User Profile Card */}
      <div className="p-3 border-t border-[#222] bg-[#0A0A0A] space-y-3">
        {/* Real-time Webhook Pulse */}
        <div className="px-3 py-2 rounded-lg bg-[#111] border border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-[#888]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Gemini 2.0 AI Gateway</span>
          </div>
          <span className="text-[10px] font-mono text-[#10B981] font-semibold">Active</span>
        </div>

        {/* User Account */}
        <div 
          onClick={logout}
          title="Click to sign out"
          className="p-2.5 rounded-xl bg-[#111] border border-[#222] flex items-center justify-between hover:border-red-500/30 hover:bg-red-500/5 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 border border-[#444] flex items-center justify-center font-bold text-xs text-black shrink-0">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#EDEDED] truncate">
                {workspace?.name || user?.name || "Mogent Master"}
              </span>
              <span className="text-[10px] text-[#888] truncate font-mono">
                {user?.email || "Signed In"} • Click to Logout
              </span>
            </div>
          </div>
          <LogOut className="w-4 h-4 text-[#555] group-hover:text-red-400 transition-colors shrink-0" />
        </div>
      </div>
    </aside>
  );
}
