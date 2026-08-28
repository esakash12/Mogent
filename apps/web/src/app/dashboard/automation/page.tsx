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
  const [rules, setRules] = useState<TriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newReason, setNewReason] = useState("CUSTOM_KEYWORD");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteRuleItem, setDeleteRuleItem] = useState<TriggerRule | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAutomationRules();
      if (Array.isArray(data)) {
        setRules(
          data.map((r: any) => ({
            id: r.id,
            name: r.name,
            reason: r.reason || "CUSTOM_KEYWORD",
            keywords: Array.isArray(r.keywords) ? r.keywords : (r.keywords ? r.keywords.split(",") : []),
            action: r.action || "Pause AI & Escalate to Human",
            isActive: r.isActive !== false,
            hitsCount: r.hitsCount || 0,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load automation rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      const res = await createAutomationRule({
        name: newRuleName,
        reason: newReason,
        keywords: keywordsArray,
      });

      setShowAddModal(false);
      setNewRuleName("");
      setNewKeywords("");
      setRules([
        {
          id: res?.id || Date.now().toString(),
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
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#F59E0B]" />
            <span>অটোমেশন ও স্মার্ট রুলস (Automation Rules)</span>
          </h2>
          <p className="text-xs text-[#475569]">
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
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#475569]">
          Active Automation Rules ({rules.length})
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            <span className="text-xs font-bold text-[#64748B]">Loading automation rules...</span>
          </div>
        ) : rules.length > 0 ? (
          <div className="divide-y divide-[#F1F5F9]">
            {rules.map((rule) => (
              <div key={rule.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#0F172A]">{rule.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#92400E] font-bold text-[10px] border border-[#FDE68A]">
                      {rule.action}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      • Triggered {rule.hitsCount} times
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-[#475569] font-semibold">Keywords:</span>
                    {rule.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-[#F1F5F9] text-[#0F172A] font-mono text-[10px] border border-[#CBD5E1]"
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
                      rule.isActive ? "bg-[#F59E0B]" : "bg-[#CBD5E1]"
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
                    className="p-2 rounded-xl text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <Zap className="w-8 h-8 text-[#CBD5E1] mx-auto" />
            <p className="text-xs font-bold text-[#0F172A]">No automation rules created yet</p>
            <p className="text-[11px] text-[#64748B]">
              Add custom keyword escalation rules (e.g. for refund, complaint, manager) to automatically handoff to human agents.
            </p>
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">New Automation Rule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complaint Escalation"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Trigger Keywords (comma separated) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. বাটপার, নষ্ট, refund, scam, ম্যানেজার"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  When a customer types any of these words in chat, AI will execute the handoff.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
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
