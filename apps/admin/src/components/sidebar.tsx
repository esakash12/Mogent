"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Key,
  Server,
  Settings,
  ShieldAlert,
  Bot,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "System Overview", href: "/", icon: LayoutDashboard },
  { name: "Payment Approvals", href: "/billing", icon: CreditCard, badge: "Live" },
  { name: "Client Workspaces", href: "/clients", icon: Users },
  { name: "Gemini Key Rotator", href: "/keys", icon: Key },
  { name: "Infrastructure", href: "/infrastructure", icon: Server },
  { name: "Global Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-20 bg-[#0A0A0A]">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#222]">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px] tracking-tight text-[#EDEDED]">
                Mogent Admin
              </span>
              <span className="text-[11px] text-amber-500 font-medium leading-none">
                Superuser Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-0.5 mt-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-[#222] text-[#EDEDED]"
                    : "text-[#888] hover:text-[#EDEDED] hover:bg-[#1A1A1A]"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-[18px] h-[18px]", isActive ? "text-[#EDEDED]" : "text-[#888] group-hover:text-[#EDEDED]")} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1.5 transition-colors",
                      isActive
                        ? "bg-amber-500 text-black"
                        : "bg-[#222] text-[#888] group-hover:text-[#EDEDED]"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info: AI Engine Status */}
      <div className="p-4">
        <div className="p-3 rounded-lg border border-[#222] bg-[#111] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#EDEDED]">Core System</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#10B981]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              Healthy
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#888]">
            <Server className="w-3.5 h-3.5 text-primary" />
            <span>All microservices up</span>
          </div>
        </div>
        
        {/* User Profile Mini */}
        <div className="mt-4 flex items-center gap-3 px-2 cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 border border-[#333] flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]">
            SH
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[13px] font-medium text-[#EDEDED] truncate">Shohag</span>
            <span className="text-[11px] text-amber-500 truncate">System Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
