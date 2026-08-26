"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Plus,
  Clock,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Bot,
  BookOpen,
  PlayCircle,
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchAutomationRules,
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  fetchPages
} from "@/lib/api";
import { ConfirmModal } from "@/components/confirm-modal";

interface TriggerRule {
  id: string;
  name: string;
  reason: string;
  keywords: string[];
  action: string;
  isActive: boolean;
  hitsCount: number;
}

export default function AutomationPage() {
  const [rules, setRules] = useState<TriggerRule[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newReason, setNewReason] = useState("CUSTOM_KEYWORD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesData, pagesData] = await Promise.all([
        fetchAutomationRules(),
        fetchPages(),
      ]);
      if (Array.isArray(rulesData)) setRules(rulesData);
      if (Array.isArray(pagesData)) setPages(pagesData);
    } catch (err) {
      console.error("Failed to load automation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    if (saved) setSelectedPageId(saved);
    loadData();

    const handleGlobalPageChange = (e: any) => {
      const newPageId = e.detail?.pageId || "ALL";
      setSelectedPageId(newPageId);
    };

    window.addEventListener("mogent_page_changed", handleGlobalPageChange);
    return () => window.removeEventListener("mogent_page_changed", handleGlobalPageChange);
  }, []);

  const handlePageChange = (newPageId: string) => {
    setSelectedPageId(newPageId);
    if (typeof window !== "undefined") {
      localStorage.setItem("mogent_active_page_id", newPageId);
    }
  };

  const [deleteRuleItem, setDeleteRuleItem] = useState<TriggerRule | null>(null);

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !currentActive } : r))
    );
    await toggleAutomationRule(id, !currentActive);
  };

  const confirmDeleteRule = async () => {
    if (!deleteRuleItem) return;
    const id = deleteRuleItem.id;
    setRules((prev) => prev.filter((r) => r.id !== id));
    await deleteAutomationRule(id);
    setDeleteRuleItem(null);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    setIsSubmitting(true);
    const keywordsArray = newKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const res = await createAutomationRule({
      name: newRuleName.trim(),
      keywords: keywordsArray,
      reason: newReason,
    });
    setIsSubmitting(false);

    if (res.success && res.data) {
      setRules((prev) => [
        {
          id: res.data.id,
          name: res.data.name,
          reason: res.data.reason,
          keywords: res.data.keywords,
          action: "TRANSFER_HUMAN",
          isActive: res.data.isActive,
          hitsCount: 0,
        },
        ...prev,
      ]);
      setShowAddModal(false);
      setNewRuleName("");
    } else {
      console.error("Failed to create rule:", res.error);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header & Page Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED] flex items-center gap-2.5">
              <Zap className="w-6 h-6 text-amber-500" />
              <span>Automation & Instant Triggers</span>
            </h1>
            {selectedPageId !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold font-mono">
                📄 {pages.find((p) => p.id === selectedPageId)?.name || "Selected Page"}
              </span>
            )}
          </div>
          <p className="text-[14px] text-[#888] mt-1">
            Configure keyword-based human escalation rules, instant alert triggers, and manager handoff protocols.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Page Switcher */}
          {pages.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141414] border border-[#333] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-xs text-[#888] font-semibold hidden sm:inline">Page:</span>
              <select
                value={selectedPageId}
                onChange={(e) => handlePageChange(e.target.value)}
                className="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#111] text-[#EDEDED]">
                  🏢 All Connected Pages ({pages.length})
                </option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111] text-[#EDEDED]">
                    📄 {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors w-fit cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>New Escalation Rule</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Active Trigger Rules</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#EDEDED]">
            {rules.filter((r) => r.isActive).length} / {rules.length}
          </p>
          <span className="text-[11px] text-[#666]">Monitoring incoming Messenger chats</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Escalation Action</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-400">Human Takeover</p>
          <span className="text-[11px] text-[#666]">Alerts Telegram & switches chat to human</span>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Fallback AI Engine</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">Mogent AI</p>
          <span className="text-[11px] text-[#666]">Answers non-escalated standard queries</span>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[#EDEDED]">Configured Rules</h3>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading automation rules...</span>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3">
            <Zap className="w-8 h-8 text-[#444] mx-auto" />
            <h3 className="font-semibold text-sm text-[#EDEDED]">No automation rules defined</h3>
            <p className="text-xs text-[#888] max-w-sm mx-auto">
              Create rules like "Urgent refund", "Manager demand", or "Angry complaint" to automatically hand off chats to a human agent.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-[#EDEDED] cursor-pointer"
            >
              + Create First Rule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all space-y-4",
                  rule.isActive
                    ? "bg-[#0A0A0A] border-[#222] hover:border-[#333]"
                    : "bg-[#080808] border-[#181818] opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#EDEDED]">{rule.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold mt-1 inline-block">
                      {rule.reason}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.isActive)}
                      className="text-[#888] hover:text-white transition-colors"
                      title={rule.isActive ? "Disable Rule" : "Enable Rule"}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-[#666]" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteRuleItem(rule)}
                      className="p-1 text-[#666] hover:text-red-400 rounded transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-[#888] font-medium">Trigger Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.keywords && rule.keywords.length > 0 ? (
                      rule.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-[11px] text-[#DDD] font-mono"
                        >
                          "{kw}"
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#666] italic">Any negative sentiment</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1a1a1a] flex items-center justify-between text-[11px] text-[#888]">
                  <span>Action: <strong>Switch to Human Takeover</strong></span>
                  <span className="font-mono text-[10px] text-[#666]">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h3 className="font-bold text-sm text-[#EDEDED]">New Escalation Rule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#888] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Complaint & Fraud Alert"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1">Escalation Category</label>
                <select
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none"
                >
                  <option value="CUSTOM_KEYWORD">Custom Keywords</option>
                  <option value="NEGATIVE_SENTIMENT">Negative Sentiment Detected</option>
                  <option value="COMPLAINT_DETECTED">Customer Complaint / Refund</option>
                  <option value="HUMAN_REQUESTED">Explicit Human Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1">Trigger Keywords (comma separated)</label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g. বাটপার, নষ্ট, refund, scam, ম্যানেজার"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none"
                />
                <span className="text-[10px] text-[#666] mt-1 block">
                  When a customer types any of these words, the chat will automatically escalate to human mode.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#222] text-xs font-semibold text-[#888]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteRuleItem}
        onClose={() => setDeleteRuleItem(null)}
        onConfirm={confirmDeleteRule}
        title="Delete Escalation Rule"
        description={`Are you sure you want to delete escalation rule "${deleteRuleItem?.name}"?`}
        confirmText="Delete Rule"
        variant="danger"
      />
    </div>
  );
}
