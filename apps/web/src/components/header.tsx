"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Menu,
  X,
  BarChart3,
  MessageSquare,
  Users,
  ShoppingBag,
  Bot,
  Share2,
  Settings,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { fetchPages } from "@/lib/api";

const navigation = [
  { name: "Analytics", href: "/dashboard", icon: BarChart3 },
  { name: "Live Inbox", href: "/dashboard/inbox", icon: MessageSquare, badge: "Live" },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Orders & Catalog", href: "/dashboard/commerce", icon: ShoppingBag, badge: "New" },
  { name: "AI Studio", href: "/dashboard/ai", icon: Bot },
  { name: "Integrations", href: "/dashboard/integrations", icon: Share2 },
  { name: "Billing & Plans", href: "/dashboard/billing", icon: CreditCard },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pagesList, setPagesList] = useState<any[]>([]);
  const [activePageId, setActivePageId] = useState<string>("ALL");
  const pathname = usePathname();
  const { workspace, user } = useAuth();

  useEffect(() => {
    fetchPages().then((pages) => {
      if (Array.isArray(pages)) {
        setPagesList(pages);
      } else {
        setPagesList([]);
      }
    });

    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    if (saved) {
      setActivePageId(saved);
    }
  }, [pathname]);

  const handlePageSwitch = (pageId: string) => {
    setActivePageId(pageId);
    if (typeof window !== "undefined") {
      localStorage.setItem("mogent_active_page_id", pageId);
      window.dispatchEvent(new CustomEvent("mogent_page_changed", { detail: { pageId } }));
    }
  };

  return (
    <>
      <header className="h-14 border-b border-[#222] bg-[#0A0A0A]/90 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-[#888] hover:text-[#EDEDED] transition-colors p-1 cursor-pointer"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#EDEDED]">
            <div className="flex items-center gap-1.5 text-[#888]">
              <span className="hidden sm:inline">{workspace?.name || user?.name || "Workspace"}</span>
              <span className="hidden sm:inline text-[#333]">/</span>
              <span className="text-[#EDEDED] capitalize">
                {pathname === "/dashboard" ? "Analytics" : pathname.split("/")[2] || "Overview"}
              </span>
            </div>
            <span className="ml-2 px-1.5 py-0.5 rounded bg-[#1C1C1C] text-[#888] text-[10px] font-mono border border-[#333]">
              {workspace?.role || "OWNER"}
            </span>
          </div>
        </div>

        {/* Right Controls & Global Page Switcher */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Global Multi-Page Switcher Dropdown */}
          {pagesList.length > 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141414] border border-[#333] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <select
                value={activePageId}
                onChange={(e) => handlePageSwitch(e.target.value)}
                className="bg-transparent text-xs font-semibold text-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#111] text-[#EDEDED]">
                  🏢 All Connected Pages ({pagesList.length})
                </option>
                {pagesList.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111] text-[#EDEDED]">
                    📄 {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Link
              href="/dashboard/pages"
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#111] border border-[#222] text-[11px] text-[#888] hover:border-[#333] transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>0 Pages Connected</span>
            </Link>
          )}

          <div className="w-[1px] h-4 bg-[#222]"></div>

          <Link
            href="/dashboard/settings"
            className="text-[#888] hover:text-[#EDEDED] transition-colors p-1.5 rounded-md hover:bg-[#111]"
          >
            <Bell className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[260px] h-full bg-[#0A0A0A] border-r border-[#222] flex flex-col p-4 animate-in slide-in-from-left-full duration-200">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-sm text-[#EDEDED]">Mogent Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                      isActive
                        ? "bg-[#222] text-[#EDEDED] font-semibold"
                        : "text-[#888] hover:text-[#EDEDED] hover:bg-[#111]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[#888]")} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-black">
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
