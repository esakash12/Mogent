"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Tag,
  Search,
  Sparkles,
  CheckCircle2,
  Trash2,
  Edit2,
  HelpCircle,
  Package,
  FileText,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchKnowledgeAndWhatsApp, createKnowledgeItem, deleteKnowledgeItem } from "@/lib/api";

interface KnowledgeItem {
  id: string;
  title: string;
  category: "PRODUCT_CATALOG" | "FAQ" | "POLICY" | "SYSTEM_INSTRUCTION";
  content: string;
  priority: number;
  isActive: boolean;
}

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newItem, setNewItem] = useState({
    title: "",
    category: "FAQ" as const,
    content: "",
    priority: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadKnowledge = async () => {
    setLoading(true);
    const data = await fetchKnowledgeAndWhatsApp();
    if (data && Array.isArray(data.items)) {
      setItems(data.items);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "ALL" || item.category === activeTab;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.content) return;

    setIsSubmitting(true);
    const res = await createKnowledgeItem(newItem);
    if (res.success) {
      setShowModal(false);
      setNewItem({ title: "", category: "FAQ", content: "", priority: 5 });
      loadKnowledge();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this knowledge document?")) return;
    await deleteKnowledgeItem(id);
    loadKnowledge();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sector Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#222] pb-3 text-xs">
        <Link
          href="/dashboard/knowledge"
          className="px-3 py-1.5 rounded-lg bg-[#222] text-[#EDEDED] font-semibold flex items-center gap-2"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Knowledge Base</span>
        </Link>
        <Link
          href="/dashboard/ai"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Personality & Prompt</span>
        </Link>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Knowledge Base & RAG Context
          </h1>
          <p className="text-[14px] text-[#888] mt-1">
            Teach your Gemini 2.0 AI agent your company policies, FAQs, delivery rules, and product specs.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/10 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Document</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAQs, policies..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#111] border border-[#222] text-xs">
          {[
            { id: "ALL", label: "All Items" },
            { id: "PRODUCT_CATALOG", label: "Catalog Specs" },
            { id: "FAQ", label: "FAQs" },
            { id: "POLICY", label: "Store Policies" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition-colors cursor-pointer",
                activeTab === c.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 border border-[#222] bg-[#0A0A0A] rounded-2xl">
          <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          <span className="text-xs text-[#888]">Loading knowledge context...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 px-4 flex flex-col items-center justify-center text-center space-y-3 border border-[#222] bg-[#0A0A0A] rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-amber-500">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#EDEDED]">No Knowledge Documents Found</h3>
            <p className="text-xs text-[#777] max-w-sm leading-relaxed">
              Add your store's return policy, delivery charges, payment options, and FAQs so Gemini 2.0 AI can accurately answer customer questions.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Knowledge Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3 hover:border-[#333] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] text-[#888] border border-[#333]">
                    {item.category}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="font-bold text-sm text-[#EDEDED]">{item.title}</h4>
                <p className="text-xs text-[#AAA] leading-relaxed whitespace-pre-wrap">{item.content}</p>
              </div>

              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-[11px] text-[#666]">
                <span>Priority: High</span>
                <span className="text-[#10B981] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Indexed for AI
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Document */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h3 className="font-bold text-base text-[#EDEDED]">Add Knowledge Document</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delivery Charges & Return Policy"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                >
                  <option value="FAQ">FAQ (Frequently Asked Questions)</option>
                  <option value="POLICY">Store Policy / Delivery / Returns</option>
                  <option value="PRODUCT_CATALOG">Product Specs / Sizing</option>
                  <option value="SYSTEM_INSTRUCTION">Custom AI Instruction</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Content (Instruction / Policy / Details)</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Delivery charge inside Dhaka: 60 BDT. Outside Dhaka: 120 BDT. 7 days replacement guarantee..."
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-[#EDEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Document</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
