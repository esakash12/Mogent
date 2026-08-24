"use client";

import { useState } from "react";
import {
  Facebook,
  Plus,
  Zap,
  ShieldCheck,
  Settings2,
  Trash2,
  CheckCircle2,
  Bot,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FacebookPageItem {
  id: string;
  name: string;
  pageId: string;
  category: string;
  aiMode: "AUTO" | "HYBRID" | "MANUAL" | "OFF";
  webhookStatus: "SUBSCRIBED" | "PENDING";
  systemPrompt: string;
  temperature: number;
}

const mockPages: FacebookPageItem[] = [
  {
    id: "p1",
    name: "TechGear Bangladesh",
    pageId: "109283749281723",
    category: "E-Commerce / Gadgets",
    aiMode: "HYBRID",
    webhookStatus: "SUBSCRIBED",
    systemPrompt:
      "You are a friendly customer service executive for TechGear Bangladesh. Always assist customers with product specs, warranty, and order placement in polite Bengali.",
    temperature: 0.3,
  },
  {
    id: "p2",
    name: "StyleFashion BD",
    pageId: "982736451029384",
    category: "Clothing & Apparel",
    aiMode: "AUTO",
    webhookStatus: "SUBSCRIBED",
    systemPrompt:
      "You are a sales assistant for StyleFashion BD. Answer clothing size, color, delivery charge, and return policies.",
    temperature: 0.4,
  },
];

export default function PagesManagementPage() {
  const [pages, setPages] = useState<FacebookPageItem[]>(mockPages);
  const [showModal, setShowModal] = useState(false);
  const [newPage, setNewPage] = useState({
    name: "",
    pageId: "",
    accessToken: "",
    systemPrompt: "",
    aiMode: "HYBRID" as const,
  });

  const handleModeChange = (pageId: string, newMode: "AUTO" | "HYBRID" | "MANUAL" | "OFF") => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, aiMode: newMode } : p))
    );
  };

  const handleAddPage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPage.name || !newPage.pageId) return;

    const created: FacebookPageItem = {
      id: `p-${Date.now()}`,
      name: newPage.name,
      pageId: newPage.pageId,
      category: "Online Business",
      aiMode: newPage.aiMode,
      webhookStatus: "SUBSCRIBED",
      systemPrompt: newPage.systemPrompt || "You are a helpful AI customer support representative.",
      temperature: 0.3,
    };

    setPages((prev) => [...prev, created]);
    setShowModal(false);
    setNewPage({ name: "", pageId: "", accessToken: "", systemPrompt: "", aiMode: "HYBRID" });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">Facebook Pages</h1>
          <p className="text-[14px] text-[#888]">
            Connect Facebook Pages and manage AI automation modes & system personas.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-md bg-white text-black text-[13px] font-medium hover:bg-[#EDEDED] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Page</span>
        </button>
      </div>

      {/* Pages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pages.map((page) => (
          <div
            key={page.id}
            className="p-6 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-6 hover:border-[#444] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#222] text-[#EDEDED] flex items-center justify-center">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[14px] text-[#EDEDED]">{page.name}</h3>
                  <p className="text-[11px] text-[#888] font-mono mt-0.5">Page ID: {page.pageId}</p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-sm bg-[#10B981]/10 text-[#10B981]">
                <CheckCircle2 className="w-3 h-3" />
                {page.webhookStatus}
              </span>
            </div>

            {/* AI Mode Selector */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-[#888]">
                AI Automation Mode
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#111] border border-[#222] text-[12px]">
                {(["AUTO", "HYBRID", "MANUAL", "OFF"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeChange(page.id, mode)}
                    className={cn(
                      "py-1.5 rounded-md font-medium transition-colors",
                      page.aiMode === mode
                        ? "bg-[#333] text-[#EDEDED] shadow-sm"
                        : "text-[#888] hover:text-[#EDEDED]"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* System Persona Snippet */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-[#888] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#EDEDED]" />
                <span>Active System Prompt</span>
              </label>
              <p className="text-[12px] text-[#888] bg-[#111] p-3.5 rounded-lg border border-[#222] leading-relaxed">
                "{page.systemPrompt}"
              </p>
            </div>

            {/* Footer Settings Info */}
            <div className="pt-4 border-t border-[#222] flex items-center justify-between text-[11px] text-[#888]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                Token Encrypted (AES-256)
              </span>
              <span>Temperature: {page.temperature}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Connect Page Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h3 className="font-semibold text-[15px] text-[#EDEDED]">Connect Facebook Page</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-[#EDEDED] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPage} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Page Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Online Shop"
                  value={newPage.name}
                  onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Facebook Page ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 109283749281723"
                  value={newPage.pageId}
                  onChange={(e) => setNewPage({ ...newPage, pageId: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Page Access Token</label>
                <input
                  type="password"
                  required
                  placeholder="EAAB..."
                  value={newPage.accessToken}
                  onChange={(e) => setNewPage({ ...newPage, accessToken: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors font-mono"
                />
                <p className="text-[10px] text-[#555]">
                  Automatically encrypted with AES-256-GCM before saving to database.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">AI System Prompt (Persona)</label>
                <textarea
                  rows={3}
                  placeholder="Define how the AI should talk, tone, and guidelines..."
                  value={newPage.systemPrompt}
                  onChange={(e) => setNewPage({ ...newPage, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md text-[13px] font-medium text-[#888] hover:text-[#EDEDED] hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-white text-black text-[13px] font-medium hover:bg-[#EDEDED] transition-colors"
                >
                  Save & Connect Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
