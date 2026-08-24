"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X, LayoutDashboard, Users, Key, Server, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "System Overview", href: "/", icon: LayoutDashboard },
  { name: "Client Management", href: "/clients", icon: Users, badge: "142" },
  { name: "API Key Manager", href: "/keys", icon: Key },
  { name: "Infrastructure", href: "/infrastructure", icon: Server },
  { name: "Global Settings", href: "/settings", icon: Settings },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="h-14 border-b border-[#222] bg-[#0A0A0A]/80 backdrop-blur-md px-4 md:px-10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-[#888] hover:text-[#EDEDED] transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Breadcrumbs / Page Title */}
          <div className="flex items-center gap-2 text-[13px] md:text-[14px] font-medium text-[#EDEDED]">
            <div className="flex items-center gap-1.5 md:gap-2 text-[#888]">
              <span className="hidden sm:inline">Mogent System</span>
              <span className="hidden sm:inline text-[#333]">/</span>
              <span className="text-[#EDEDED]">Overview</span>
            </div>
            <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-500 text-[10px] font-mono border border-amber-500/20">Superuser</span>
          </div>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Real-time Webhook Pulse */}
          <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-[#888]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            <span className="hidden sm:inline">System: Online</span>
          </div>

          <div className="w-[1px] h-4 bg-[#333]"></div>

          <button className="text-[#888] hover:text-[#EDEDED] transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-[260px] h-full bg-[#0A0A0A] border-r border-[#222] flex flex-col p-4 animate-in slide-in-from-left-full duration-200">
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold text-[15px] text-[#EDEDED]">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#888] hover:text-[#EDEDED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-md text-[14px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-[#222] text-[#EDEDED]"
                        : "text-[#888] hover:text-[#EDEDED] hover:bg-[#1A1A1A]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5", isActive ? "text-[#EDEDED]" : "text-[#888]")} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-primary text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
