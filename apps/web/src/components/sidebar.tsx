"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  BookOpen,
  Wrench,
  Globe,
  Bot,
  Layers,
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Megaphone,
  Users,
  ShoppingCart,
  ChevronDown,
  Sparkles,
  LogOut,
  Settings,
  Key,
  Shield,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { fetchPages } from "@/lib/api";

interface NavItem {
  name: string;
  nameBn?: string;
  href: string;
  icon: any;
  badge?: string;
  matchPrefixes?: string[];
}

const yourAiNav: NavItem[] = [
  {
    name: "Products",
    nameBn: "Products",
    href: "/dashboard/commerce",
    icon: Package,
    matchPrefixes: ["/dashboard/commerce", "/dashboard/products"],
  },
  {
    name: "Knowledge Base",
    nameBn: "Knowledge Base",
    href: "/dashboard/knowledge",
    icon: BookOpen,
    matchPrefixes: ["/dashboard/knowledge", "/dashboard/ai"],
  },
  {
    name: "Services",
    nameBn: "সার্ভিস",
    href: "/dashboard/services",
    icon: Wrench,
    matchPrefixes: ["/dashboard/services"],
  },
  {
    name: "Website",
    nameBn: "Website",
    href: "/dashboard/website",
    icon: Globe,
    matchPrefixes: ["/dashboard/website"],
  },
  {
    name: "Try Your AI",
    nameBn: "Try Your AI",
    href: "/dashboard/playground",
    icon: Bot,
    matchPrefixes: ["/dashboard/playground"],
  },
];

const goLiveNav: NavItem[] = [
  {
    name: "Integrations",
    nameBn: "Integrations",
    href: "/dashboard/integrations",
    icon: Layers,
    matchPrefixes: ["/dashboard/integrations", "/dashboard/pages", "/dashboard/telegram"],
  },
];

const activityNav: NavItem[] = [
  {
    name: "Dashboard",
    nameBn: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Inbox",
    nameBn: "Inbox",
    href: "/dashboard/inbox",
    icon: MessageSquare,
    matchPrefixes: ["/dashboard/inbox"],
  },
  {
    name: "Comments",
    nameBn: "Comments",
    href: "/dashboard/comments",
    icon: MessageCircle,
    matchPrefixes: ["/dashboard/comments"],
  },
  {
    name: "Campaigns",
    nameBn: "ক্যাম্পেইন",
    href: "/dashboard/broadcasts",
    icon: Megaphone,
    badge: "বেটা",
    matchPrefixes: ["/dashboard/broadcasts", "/dashboard/campaigns"],
  },
  {
    name: "Leads",
    nameBn: "Leads",
    href: "/dashboard/leads",
    icon: Users,
    matchPrefixes: ["/dashboard/leads", "/dashboard/contacts"],
  },
  {
    name: "Orders",
    nameBn: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    matchPrefixes: ["/dashboard/orders"],
  },
];

const adminNavigation: NavItem[] = [
  {
    name: "Mogent API Keys",
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

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ onNavigate, className }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, workspace, logout } = useAuth();
  const [pagesList, setPagesList] = useState<any[]>([]);
  const [activePageId, setActivePageId] = useState<string>("ALL");
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);

  useEffect(() => {
    fetchPages().then((pages) => {
      if (Array.isArray(pages)) {
        setPagesList(pages);
      }
    });

    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    if (saved) {
      setActivePageId(saved);
    }
  }, [pathname]);

  const handlePageSwitch = (pageId: string) => {
    setActivePageId(pageId);
    setPageDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("mogent_active_page_id", pageId);
      window.dispatchEvent(new CustomEvent("mogent_page_changed", { detail: { pageId } }));
    }
    if (onNavigate) {
      onNavigate();
    }
  };

  const isNavActive = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.matchPrefixes && item.matchPrefixes.some((p) => pathname.startsWith(p))) return true;
    return false;
  };

  const activePageObj = pagesList.find((p) => p.id === activePageId);
  const activeBusinessName = activePageId === "ALL" 
    ? (workspace?.name || user?.name || "MD Shohag's Business")
    : (activePageObj?.name || "Connected Page");

  const initials = (activeBusinessName || "MS")
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] px-3 mb-1.5">
        {title}
      </p>
      {items.map((item) => {
        const active = isNavActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all group",
              active
                ? "bg-[#FEF3C7] text-[#92400E] font-bold border border-[#FDE68A] shadow-sm"
                : "text-[#334155] font-semibold hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  active ? "text-[#D97706]" : "text-[#64748B] group-hover:text-[#0F172A]"
                )}
              />
              <span>{item.nameBn || item.name}</span>
            </div>
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside
      className={cn(
        "w-64 border-r border-[#E5E7EB] bg-[#FFFFFF] flex flex-col justify-between select-none h-screen sticky top-0 shadow-[1px_0_4px_rgba(0,0,0,0.02)]",
        className
      )}
    >
      <div className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-none">
        {/* Brand Logo & Mobile Close Button */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
            <span className="text-2xl font-black tracking-tight text-[#EAB308] flex items-center gap-1 font-serif italic">
              Mogent
              <span className="text-xs not-italic font-bold px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                AI
              </span>
            </span>
          </Link>

          {onNavigate && (
            <button
              onClick={onNavigate}
              className="md:hidden p-1.5 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer transition-colors"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Business Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#F59E0B] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-[#111827] truncate">
                  {activeBusinessName}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#4B5563] shrink-0 transition-transform" />
          </button>

          {/* Business Switcher Dropdown */}
          {pageDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 rounded-xl bg-white border border-[#E5E7EB] shadow-lg z-50 space-y-1">
              <button
                onClick={() => handlePageSwitch("ALL")}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                  activePageId === "ALL" ? "bg-[#FEF9EE] text-[#D97706] font-semibold" : "hover:bg-[#F3F4F6] text-[#374151]"
                )}
              >
                <span>All Connected Pages</span>
                <span className="text-[10px] text-[#9CA3AF]">{pagesList.length}</span>
              </button>
              {pagesList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePageSwitch(p.id)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                    activePageId === p.id ? "bg-[#FEF9EE] text-[#D97706] font-semibold" : "hover:bg-[#F3F4F6] text-[#374151]"
                  )}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Categories */}
        <nav className="space-y-5 pt-2">
          {renderNavGroup("YOUR AI", yourAiNav)}
          {renderNavGroup("GO LIVE", goLiveNav)}
          {renderNavGroup("ACTIVITY", activityNav)}

          {/* Admin Navigation (Only for Super Admins, never for normal workspace users/owners) */}
          {user?.isAdmin === true && (
            renderNavGroup("ENTERPRISE ADMIN", adminNavigation)
          )}
        </nav>
      </div>

      {/* Footer User Account */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#F3F4F6] transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#E5E7EB] text-[#374151] font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="truncate min-w-0">
              <p className="text-xs font-semibold text-[#111827] truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-[#6B7280] truncate">{user?.email || "user@mogent.com"}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log out"
            className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors p-1.5 rounded-lg hover:bg-white cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

