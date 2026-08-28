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
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchAutomationRules,
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
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
  const [rules, setRules] = useState<TriggerRule[]>([
    {
      id: "1",
      name: "Angry / Escalation Keywords",
      reason: "COMPLAINT",
      keywords: ["বাটপার", "নষ্ট", "রিফান্ড", "refund", "scam", "ম্যানেজার"],
      action: "Pause AI & Escalate to Human",
      isActive: true,
      hitsCount: 14,
    },
    {
      id: "2",
      name: "Immediate Purchase Trigger",
      reason: "ORDER_INTENT",
      keywords: ["কিনব", "অর্ডার কনফার্ম", "বিকাশ নাম্বার দেন", "bkash number"],
      action: "Prioritize & Collect Delivery KYC",
      isActive: true,
      hitsCount: 38,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newReason, setNewReason] = useState("CUSTOM_KEYWORD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteRuleItem, setDeleteRuleItem] = useState<TriggerRule | null>(null);

  const handleToggleRule = async (id: string, currentActive: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !currentActive } : r))
    );
    try {
      await toggleAutomationRule(id, !currentActive);
    } catch (err) {
      console.error("Toggle rule error:", err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newKeywords.trim()) return;
    setIsSubmitting(true);
    try {
      const keywordsArray = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      await createAutomationRule({
        name: newRuleName,
        reason: newReason,
        keywords: keywordsArray,
      });
      setShowAddModal(false);
      setNewRuleName("");
      setNewKeywords("");
      setRules([
        {
          id: Date.now().toString(),
          name: newRuleName,
          reason: newReason,
          keywords: keywordsArray,
          action: "Pause AI & Escalate to Human",
          isActive: true,
          hitsCount: 0,
        },
        ...rules,
      ]);
    } catch (err) {
      console.error("Create rule error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteRule = async () => {
    if (!deleteRuleItem) return;
    try {
      await deleteAutomationRule(deleteRuleItem.id);
      setRules(rules.filter((r) => r.id !== deleteRuleItem.id));
      setDeleteRuleItem(null);
    } catch (err) {
      console.error("Delete rule error:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Description & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#F59E0B]" />
            <span>অটোমেশন ও স্মার্ট রুলস (Automation)</span>
          </h2>
          <p className="text-xs text-[#6B7280]">
            Configure trigger keywords, escalation behaviors, and working hour schedules.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Automation Rule</span>
        </button>
      </div>

      {/* Rules List Container */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F3F4F6] text-xs font-bold text-[#6B7280]">
          Active Automation Rules ({rules.length})
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {rules.map((rule) => (
            <div key={rule.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F9FAFB] transition-colors">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-[#111827]">{rule.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#D97706] font-semibold text-[10px] border border-[#FDE68A]">
                    {rule.action}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    • Triggered {rule.hitsCount} times
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[#6B7280] font-medium">Keywords:</span>
                  {rule.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-lg bg-[#F3F4F6] text-[#374151] font-mono text-[10px] border border-[#E5E7EB]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleToggleRule(rule.id, rule.isActive)}
                  className={cn(
                    "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                    rule.isActive ? "bg-[#F59E0B]" : "bg-[#D1D5DB]"
                  )}
                >
                  <div
                    className={cn(
                      "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                      rule.isActive ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>

                <button
                  onClick={() => setDeleteRuleItem(rule)}
                  className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827]">New Automation Rule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#9CA3AF] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complaint Escalation"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Trigger Keywords (comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. বাটপার, নষ্ট, refund, scam, ম্যানেজার"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">
                  When a customer types any of these words in chat, AI will execute the handoff.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-[#4B5563]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Rule Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteRuleItem)}
        onClose={() => setDeleteRuleItem(null)}
        onConfirm={confirmDeleteRule}
        title="Delete Automation Rule"
        description={`Are you sure you want to delete "${deleteRuleItem?.name}"?`}
        confirmText="Delete Rule"
        variant="danger"
      />
    </div>
  );
}
