"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KnowledgeItem {
  id: string;
  title: string;
  category: "PRODUCT_CATALOG" | "FAQ" | "POLICY" | "SYSTEM_INSTRUCTION";
  content: string;
  priority: number;
  isActive: boolean;
}

const mockKnowledge: KnowledgeItem[] = [
  {
    id: "k1",
    title: "Smartwatch Ultra Pro Specs & Pricing",
    category: "PRODUCT_CATALOG",
    content:
      "Product: Smartwatch Ultra Pro 2026. Price: 2,450 BDT (Regular 3,200 BDT). Features: AMOLED 1.9-inch display, 7-day battery backup, Heart rate & SpO2 sensor, Bluetooth Calling. In stock: Yes.",
    priority: 10,
    isActive: true,
  },
  {
    id: "k2",
    title: "Delivery Charges & Return Policy",
    category: "POLICY",
    content:
      "Delivery charge inside Dhaka: 60 BDT (1-2 days). Outside Dhaka: 120 BDT (2-3 days). Cash on Delivery available nationwide. 7 days replacement guarantee for manufacturing defects.",
    priority: 9,
    isActive: true,
  },
  {
    id: "k3",
    title: "How to Place an Order (FAQ)",
    category: "FAQ",
    content:
      "To place an order, customers need to provide their Name, Mobile Number, Product Quantity/Color, and Full Delivery Address. We confirm via call or SMS.",
    priority: 8,
    isActive: true,
  },
];

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>(mockKnowledge);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newItem, setNewItem] = useState({
    title: "",
    category: "PRODUCT_CATALOG" as const,
    content: "",
    priority: 5,
  });

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "ALL" || item.category === activeTab;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.content) return;

    const created: KnowledgeItem = {
      id: `k-${Date.now()}`,
      title: newItem.title,
      category: newItem.category,
      content: newItem.content,
      priority: newItem.priority,
      isActive: true,
    };

    setItems((prev) => [created, ...prev]);
    setShowModal(false);
    setNewItem({ title: "", category: "PRODUCT_CATALOG", content: "", priority: 5 });
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
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
          href="/dashboard/automation"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rules & Triggers</span>
        </Link>
        <Link
          href="/dashboard/playground"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>AI Playground</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">Business Knowledge Base</h1>
          <p className="text-[14px] text-[#888] mt-1">
            Feed product catalogs, FAQs, and business policies for Gemini AI context injection.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-md bg-white text-black text-[13px] font-medium hover:bg-[#EDEDED] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Entry</span>
        </button>
      </div>

      {/* Controls & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#111] border border-[#222] text-[13px]">
          {[
            { id: "ALL", label: "All Items" },
            { id: "PRODUCT_CATALOG", label: "Products" },
            { id: "FAQ", label: "FAQs" },
            { id: "POLICY", label: "Policies" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-[#333] text-[#EDEDED] shadow-sm"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Search knowledge items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors placeholder:text-[#555]"
          />
        </div>
      </div>

      {/* Knowledge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-xl bg-[#0A0A0A] border border-[#222] hover:border-[#444] transition-colors space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium px-2 py-1 rounded-sm bg-[#333] text-[#EDEDED]">
                    {item.category.replace("_", " ")}
                  </span>
                  <span className="text-[11px] font-mono text-[#888]">
                    Priority: {item.priority}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-[#555] hover:text-red-400 p-1 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold text-[14px] leading-snug text-[#EDEDED]">{item.title}</h3>
              <p className="text-[13px] text-[#888] leading-relaxed bg-[#111] p-3.5 rounded-lg border border-[#222]">
                {item.content}
              </p>
            </div>

            <div className="pt-3 border-t border-[#222] flex items-center justify-between text-[11px] text-[#888]">
              <span className="flex items-center gap-1.5 text-[#10B981] font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active in Prompt Context
              </span>
              <span>ID: {item.id}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h3 className="font-semibold text-[15px] text-[#EDEDED]">Add Knowledge Base Item</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-[#EDEDED] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Return & Exchange Policy"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[#888]">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors"
                  >
                    <option value="PRODUCT_CATALOG">Product Catalog</option>
                    <option value="FAQ">FAQ</option>
                    <option value="POLICY">Policy</option>
                    <option value="SYSTEM_INSTRUCTION">System Instruction</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-[#888]">Priority (1 - 10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newItem.priority}
                    onChange={(e) => setNewItem({ ...newItem, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#888]">Content / Knowledge Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write full product specs, pricing, or policy rules in clear text..."
                  value={newItem.content}
                  onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                  className="w-full px-3 py-2 text-[13px] rounded-md bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-[#555] transition-colors leading-relaxed resize-none"
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
                  Save Knowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
