"use client";

import { useState } from "react";
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
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TriggerRule {
  id: string;
  name: string;
  triggerType: "KEYWORD" | "GREETING" | "AFTER_HOURS" | "ORDER_INTENT";
  keywords: string[];
  actionType: "INSTANT_REPLY" | "ROUTE_TO_HUMAN" | "APPLY_TAG" | "COLLECT_PHONE";
  replyContent: string;
  isActive: boolean;
  timesTriggered: number;
}

const mockRules: TriggerRule[] = [
  {
    id: "r-1",
    name: "Instant Price & Stock Query",
    triggerType: "KEYWORD",
    keywords: ["দাম কত", "price", "koto", "cost", "টাকা"],
    actionType: "INSTANT_REPLY",
    replyContent: "আমাদের সকল প্রোডাক্টের বর্তমান প্রাইস ও ডিসকাউন্ট অফার জানতে আমাদের ক্যাটালগ দেখতে পারেন। আপনি নির্দিষ্ট কোন মডেলটি সম্পর্কে জানতে চাচ্ছেন?",
    isActive: true,
    timesTriggered: 1420,
  },
  {
    id: "r-2",
    name: "Delivery Charge & COD Info",
    triggerType: "KEYWORD",
    keywords: ["ডেলিভারি চার্জ", "delivery charge", "cod", "ক্যাশ অন ডেলিভারি"],
    actionType: "INSTANT_REPLY",
    replyContent: "সারা বাংলাদেশে আমাদের ক্যাশ অন ডেলিভারি সুবিধা আছে। ঢাকার ভেতরে ডেলিভারি চার্জ ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা।",
    isActive: true,
    timesTriggered: 980,
  },
  {
    id: "r-3",
    name: "Night Time / After-Hours Auto Greeting",
    triggerType: "AFTER_HOURS",
    keywords: ["11:00 PM - 08:00 AM"],
    actionType: "INSTANT_REPLY",
    replyContent: "আমাদের অফিস এখন বন্ধ রয়েছে। তবে আমাদের AI সহকারী আপনাকে সাহায্য করতে প্রস্তুত। আপনার যেকোনো প্রশ্ন বা অর্ডার বিস্তারিত এখানে লিখে রাখুন।",
    isActive: true,
    timesTriggered: 450,
  },
  {
    id: "r-4",
    name: "Urgent Human Escalation on Complaint",
    triggerType: "KEYWORD",
    keywords: ["নষ্ট", "খারাপ", "fraud", "বাটপারি", "ম্যানেজার"],
    actionType: "ROUTE_TO_HUMAN",
    replyContent: "আমরা আপনার অভিযোগটি অত্যন্ত গুরুত্ব সহকারে দেখছি। আমাদের কাস্টমার সাপোর্ট ম্যানেজার আপনার সাথে অবিলম্বে যোগাযোগ করবেন।",
    isActive: true,
    timesTriggered: 38,
  },
];

export default function AutomationPage() {
  const [rules, setRules] = useState<TriggerRule[]>(mockRules);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [newReply, setNewReply] = useState("");
  const [newTriggerType, setNewTriggerType] = useState<"KEYWORD" | "GREETING" | "AFTER_HOURS">("KEYWORD");

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newReply.trim()) return;

    const newRule: TriggerRule = {
      id: `r-${Date.now()}`,
      name: newRuleName,
      triggerType: newTriggerType,
      keywords: newKeywords.split(",").map((k) => k.trim()).filter((k) => k.length > 0),
      actionType: "INSTANT_REPLY",
      replyContent: newReply,
      isActive: true,
      timesTriggered: 0,
    };

    setRules([newRule, ...rules]);
    setNewRuleName("");
    setNewKeywords("");
    setNewReply("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Sector Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#222] pb-3 text-xs">
        <Link
          href="/dashboard/knowledge"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Knowledge Base</span>
        </Link>
        <Link
          href="/dashboard/automation"
          className="px-3 py-1.5 rounded-lg bg-[#222] text-[#EDEDED] font-semibold flex items-center gap-2"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Rules & Triggers</span>
        </Link>
        <Link
          href="/dashboard/playground"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>AI Playground</span>
        </Link>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Rules & Keyword Triggers
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Configure instant keyword shortcuts, after-hours greetings, and custom escalation flows.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-2 hover:bg-[#EDEDED] transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Rule</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Active Trigger Rules</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[#EDEDED] mt-2">
            {rules.filter((r) => r.isActive).length} / {rules.length}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>Total Automated Hits</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-[#EDEDED] mt-2">
            {rules.reduce((acc, r) => acc + r.timesTriggered, 0).toLocaleString()}
          </p>
        </div>

        <div className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between text-xs text-[#888]">
            <span>AI Fallback Safety</span>
            <Bot className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-2xl font-bold text-[#10B981] mt-2">100% Active</p>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              "p-5 rounded-xl border bg-[#0A0A0A] transition-all",
              rule.isActive ? "border-[#222] hover:border-[#333]" : "border-[#222]/50 opacity-60"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm text-[#EDEDED]">{rule.name}</h3>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                      rule.triggerType === "KEYWORD"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : rule.triggerType === "AFTER_HOURS"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {rule.triggerType}
                  </span>
                  <span className="text-xs text-[#888] font-mono">
                    Triggered {rule.timesTriggered.toLocaleString()} times
                  </span>
                </div>

                {/* Keywords Tags */}
                {rule.keywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-[#888]">Matches:</span>
                    {rule.keywords.map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-[#111] border border-[#222] text-[11px] font-mono text-[#EDEDED]"
                      >
                        "{k}"
                      </span>
                    ))}
                  </div>
                )}

                {/* Reply snippet */}
                <p className="text-xs text-[#888] bg-[#111] p-3 rounded-lg border border-[#222] leading-relaxed mt-2">
                  <span className="text-[#555] font-semibold">Response: </span>
                  {rule.replyContent}
                </p>
              </div>

              {/* Actions & Switch */}
              <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                    rule.isActive
                      ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 hover:bg-[#10B981]/20"
                      : "bg-[#222] text-[#888] border-[#333] hover:text-[#EDEDED]"
                  )}
                >
                  {rule.isActive ? "Enabled" : "Disabled"}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#0A0A0A] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold text-[#EDEDED]">Create Automation Rule</h2>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Rule Name</label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Bkash Payment Details"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Trigger Type</label>
                <select
                  value={newTriggerType}
                  onChange={(e) => setNewTriggerType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                >
                  <option value="KEYWORD">Keyword Match (Exact & Partial)</option>
                  <option value="GREETING">First-Time Customer Greeting</option>
                  <option value="AFTER_HOURS">After-Hours / Night Shift</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">
                  Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={newKeywords}
                  onChange={(e) => setNewKeywords(e.target.value)}
                  placeholder="e.g. বিকাশ, bkash, payment, send money"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs text-[#888] mb-1.5">Instant Reply Message</label>
                <textarea
                  rows={3}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Type the exact message to reply with..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#111] text-xs text-[#888] hover:text-[#EDEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-white text-black font-semibold text-xs hover:bg-[#EDEDED]"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
