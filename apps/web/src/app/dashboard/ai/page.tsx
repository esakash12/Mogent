"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Zap,
  PlayCircle,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Send,
  Bot,
  Sliders,
  Sparkles,
  RotateCcw,
  Clock,
  ChevronRight,
  MessageCircle,
  Phone,
  MapPin,
  Shield,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchKnowledgeAndWhatsApp, createKnowledgeItem, deleteKnowledgeItem, saveWhatsAppProtocol } from "@/lib/api";

export default function AIAutomationSectorPage() {
  const [activeTab, setActiveTab] = useState<"KNOWLEDGE" | "WHATSAPP_CONTACT" | "RULES" | "PLAYGROUND">("KNOWLEDGE");

  // --- 1. KNOWLEDGE STATE ---
  const [knowledgeItems, setKnowledgeItems] = useState([
    {
      id: "k1",
      title: "Smartwatch Ultra Pro Specs & Pricing",
      category: "PRODUCT_CATALOG",
      content:
        "Product: Smartwatch Ultra Pro 2026. Price: 2,450 BDT (Regular 3,200 BDT). Features: AMOLED 1.9-inch display, 7-day battery backup, Heart rate & SpO2 sensor, Bluetooth Calling. In stock: Yes.",
      priority: 10,
    },
    {
      id: "k2",
      title: "Delivery Charges & Return Policy",
      category: "POLICY",
      content:
        "Delivery charge inside Dhaka: 60 BDT (1-2 days). Outside Dhaka: 120 BDT (2-3 days). Cash on Delivery available nationwide. 7 days replacement guarantee for manufacturing defects.",
      priority: 9,
    },
    {
      id: "k3",
      title: "How to Place an Order (FAQ)",
      category: "FAQ",
      content:
        "To place an order, customers need to provide their Name, Mobile Number, Product Quantity/Color, and Full Delivery Address. We confirm via call or SMS.",
      priority: 8,
    },
  ]);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("PRODUCT_CATALOG");

  // --- 2. WHATSAPP & CONTACT SHARING STATE ---
  const [whatsAppMode, setWhatsAppMode] = useState<"ON_DEMAND" | "ALWAYS" | "DISABLED">("ON_DEMAND");
  const [whatsAppNumber, setWhatsAppNumber] = useState("+8801819234567");
  const [hotlineNumber, setHotlineNumber] = useState("09612345678");
  const [officeAddress, setOfficeAddress] = useState("Level 4, House 12, Road 4, Dhanmondi, Dhaka");
  const [whatsAppPrefillText, setWhatsAppPrefillText] = useState("Hello! I saw your products on Facebook and want to place an order.");
  const [contactSaved, setContactSaved] = useState(false);

  // Load from DB
  useEffect(() => {
    fetchKnowledgeAndWhatsApp().then((data) => {
      if (data) {
        if (data.items && data.items.length > 0) {
          setKnowledgeItems(data.items);
        }
        if (data.whatsAppProtocol) {
          setWhatsAppMode(data.whatsAppProtocol.mode as any);
          if (data.whatsAppProtocol.number) setWhatsAppNumber(data.whatsAppProtocol.number);
          if (data.whatsAppProtocol.hotline) setHotlineNumber(data.whatsAppProtocol.hotline);
          if (data.whatsAppProtocol.address) setOfficeAddress(data.whatsAppProtocol.address);
          if (data.whatsAppProtocol.prefillText) setWhatsAppPrefillText(data.whatsAppProtocol.prefillText);
        }
      }
    });
  }, []);

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const payload = {
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
    };

    const localItem = {
      id: `k-${Date.now()}`,
      ...payload,
      priority: 5,
    };
    setKnowledgeItems([localItem, ...knowledgeItems]);
    setShowAddKnowledge(false);

    // Call API
    const saved = await createKnowledgeItem(payload);
    if (saved) {
      setKnowledgeItems((prev) => prev.map((k) => (k.id === localItem.id ? saved : k)));
    }

    setNewTitle("");
    setNewContent("");
  };

  const handleDeleteKnowledge = async (id: string) => {
    setKnowledgeItems((prev) => prev.filter((i) => i.id !== id));
    await deleteKnowledgeItem(id);
  };

  const handleSaveContactProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSaved(true);
    setTimeout(() => setContactSaved(false), 2500);

    await saveWhatsAppProtocol({
      mode: whatsAppMode,
      number: whatsAppNumber,
      hotline: hotlineNumber,
      address: officeAddress,
      prefillText: whatsAppPrefillText,
    });
  };

  // --- 3. RULES STATE ---
  const [rules, setRules] = useState([
    {
      id: "r1",
      name: "Price & Cost Query",
      keywords: ["দাম কত", "price", "koto", "cost", "টাকা"],
      reply: "আমাদের সকল প্রোডাক্টের বর্তমান প্রাইস ও ডিসকাউন্ট অফার জানতে আমাদের ক্যাটালগ দেখতে পারেন। আপনি নির্দিষ্ট কোন মডেলটি খুঁজছেন?",
      isActive: true,
      hits: 1420,
    },
    {
      id: "r2",
      name: "Delivery Charge & COD",
      keywords: ["ডেলিভারি চার্জ", "delivery charge", "cod", "ক্যাশ অন ডেলিভারি"],
      reply: "সারা বাংলাদেশে আমাদের ক্যাশ অন ডেলিভারি সুবিধা আছে। ঢাকার ভেতরে ডেলিভারি চার্জ ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা।",
      isActive: true,
      hits: 980,
    },
    {
      id: "r3",
      name: "Night Shift / After-Hours Auto Greeting",
      keywords: ["11:00 PM - 08:00 AM"],
      reply: "আমাদের অফিস এখন বন্ধ রয়েছে। তবে আমাদের AI সহকারী আপনাকে সাহায্য করতে প্রস্তুত। আপনার প্রশ্ন এখানে লিখে রাখুন।",
      isActive: true,
      hits: 450,
    },
  ]);

  // --- 4. PLAYGROUND STATE ---
  const [simMessages, setSimMessages] = useState<
    Array<{ role: string; content: string; thinking?: string }>
  >([
    {
      role: "model",
      content: "আসসালামু আলাইকুম! আমি আপনার AI সহকারী। প্রোডাক্ট অর্ডার বা যেকোনো তথ্যের জন্য আমাকে মেসেজ দিন।",
      thinking: "Persona initialized with friendly Bangladeshi e-commerce tone.",
    },
  ]);
  const [testInput, setTestInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSimSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    const q = testInput;
    setTestInput("");
    setSimMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsTyping(true);

    setTimeout(() => {
      let ans = "ধন্যবাদ মেসেজ দেওয়ার জন্য! আপনার প্রশ্নটির সঠিক সমাধান দিতে আমাদের AI সিস্টেম সর্বদা প্রস্তুত।";
      let think = "General context retrieval from Knowledge Base.";

      if (q.includes("কন্টাক্ট") || q.includes("নাম্বার") || q.includes("phone") || q.includes("whatsapp") || q.includes("কথা")) {
        ans = `আমাদের সাথে সরাসরি যোগাযোগ করতে কল করুন হটলাইন: ${hotlineNumber} অথবা WhatsApp-এ মেসেজ দিন: ${whatsAppNumber}। আমাদের ঠিকানা: ${officeAddress}।`;
        think = "CUSTOMER_CONTACT_REQUEST detected. Injected WhatsApp & Business Hotline details per On-Demand Protocol.";
      } else if (q.includes("দাম") || q.includes("price")) {
        ans = "আমাদের স্মার্টওয়াচ প্রো এর অফার প্রাইস ২৪৫০ টাকা। ক্যাশ অন ডেলিভারিতে নিতে নাম ও ঠিকানা পাঠান।";
        if (whatsAppMode === "ALWAYS") {
          ans += `\n\n💬 সরাসরি WhatsApp এ কথা বলতে ক্লিক করুন: https://wa.me/88${whatsAppNumber.replace(/[^0-9]/g, "")}`;
        }
        think = "Matched Knowledge Base -> 'Smartwatch Ultra Pro' (2450 BDT).";
      } else if (q.includes("ডেলিভারি") || q.includes("delivery")) {
        ans = "ঢাকার ভেতরে ডেলিভারি চার্জ ৬০ টাকা (১ দিন) এবং ঢাকার বাইরে ১২০ টাকা (২-৩ দিন)।";
        if (whatsAppMode === "ALWAYS") {
          ans += `\n\n💬 WhatsApp সাপোর্ট: ${whatsAppNumber}`;
        }
        think = "Matched Knowledge Base -> 'Delivery Charges & Return Policy'.";
      }

      setSimMessages((prev) => [
        ...prev,
        { role: "model", content: ans, thinking: think },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Sector Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            AI Automation Studio
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Train your AI agent, configure WhatsApp & Contact protocols, instant rules, and test responses.
          </p>
        </div>

        {/* The Sector Top Navigation Tabs (No Scrollbar) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
          <button
            onClick={() => setActiveTab("KNOWLEDGE")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "KNOWLEDGE"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Knowledge Base</span>
          </button>

          <button
            onClick={() => setActiveTab("WHATSAPP_CONTACT")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "WHATSAPP_CONTACT"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
            <span>WhatsApp & Contact</span>
          </button>

          <button
            onClick={() => setActiveTab("RULES")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "RULES"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Rules & Triggers</span>
          </button>

          <button
            onClick={() => setActiveTab("PLAYGROUND")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "PLAYGROUND"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Playground</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KNOWLEDGE BASE */}
      {/* ========================================================================= */}
      {activeTab === "KNOWLEDGE" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search knowledge items..."
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-white placeholder:text-[#555]"
              />
            </div>

            <button
              onClick={() => setShowAddKnowledge(true)}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold flex items-center gap-2 hover:bg-[#EDEDED] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Knowledge Entry</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeItems
              .filter((k) =>
                k.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
                k.content.toLowerCase().includes(knowledgeSearch.toLowerCase())
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#222] hover:border-[#333] transition-colors flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222] text-[#888] border border-[#333]">
                        {item.category}
                      </span>
                      <button
                        onClick={() => handleDeleteKnowledge(item.id)}
                        className="text-[#555] hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-sm text-[#EDEDED]">{item.title}</h3>
                    <p className="text-xs text-[#888] leading-relaxed bg-[#111] p-3 rounded-lg border border-[#222]">
                      {item.content}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#222] flex items-center justify-between text-[11px] text-[#10B981]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active in Gemini Context
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* Add Knowledge Modal */}
          {showAddKnowledge && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#0A0A0A] p-6 space-y-4 animate-in zoom-in-95 duration-150">
                <h3 className="text-base font-bold text-[#EDEDED]">Add Knowledge Base Entry</h3>
                <form onSubmit={handleAddKnowledge} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Return Policy"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none"
                    >
                      <option value="PRODUCT_CATALOG">Product Catalog</option>
                      <option value="POLICY">Policy</option>
                      <option value="FAQ">FAQ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Knowledge Content</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Type details for AI to learn..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddKnowledge(false)}
                      className="px-4 py-2 rounded-lg bg-[#111] text-xs text-[#888]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-white text-black text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WHATSAPP & CONTACT SHARING PROTOCOL (Smart 3-Mode Switch) */}
      {/* ========================================================================= */}
      {activeTab === "WHATSAPP_CONTACT" && (
        <form onSubmit={handleSaveContactProtocol} className="space-y-6 max-w-3xl animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366]">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#EDEDED]">WhatsApp & Contact Sharing Protocol</h3>
                  <p className="text-xs text-[#888]">Control how and when your business contact details are shared with Facebook buyers.</p>
                </div>
              </div>
              {contactSaved && (
                <span className="text-xs font-semibold text-[#10B981] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>

            {/* 3 Core Behavior Modes */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#EDEDED]">
                When should the AI share your WhatsApp & Phone Contact?
              </label>

              <div className="grid grid-cols-1 gap-3">
                {/* Option 1: On Demand Only */}
                <div
                  onClick={() => setWhatsAppMode("ON_DEMAND")}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                    whatsAppMode === "ON_DEMAND"
                      ? "bg-[#161616] border-white text-[#EDEDED]"
                      : "bg-[#0A0A0A] border-[#222] text-[#888] hover:border-[#333]"
                  )}
                >
                  <input
                    type="radio"
                    checked={whatsAppMode === "ON_DEMAND"}
                    onChange={() => setWhatsAppMode("ON_DEMAND")}
                    className="mt-1 accent-white"
                  />
                  <div>
                    <p className="font-bold text-xs text-[#EDEDED]">
                      🎯 On-Demand Only (Recommended)
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">
                      The AI will <strong>ONLY</strong> provide your WhatsApp number, Hotline, or Office Address when a customer explicitly asks: <em>"নাম্বার দিন", "ফোন দিন", "WhatsApp নাম্বার", "Call me", "যোগাযোগের ঠিকানা"</em>.
                    </p>
                  </div>
                </div>

                {/* Option 2: Always in Every Message */}
                <div
                  onClick={() => setWhatsAppMode("ALWAYS")}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                    whatsAppMode === "ALWAYS"
                      ? "bg-[#161616] border-[#25D366] text-[#EDEDED]"
                      : "bg-[#0A0A0A] border-[#222] text-[#888] hover:border-[#333]"
                  )}
                >
                  <input
                    type="radio"
                    checked={whatsAppMode === "ALWAYS"}
                    onChange={() => setWhatsAppMode("ALWAYS")}
                    className="mt-1 accent-[#25D366]"
                  />
                  <div>
                    <p className="font-bold text-xs text-[#25D366]">
                      💬 Persistent WhatsApp Button in Every Message
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">
                      Every single message sent by the AI will automatically attach a direct clickable <strong>"Chat on WhatsApp"</strong> link at the bottom.
                    </p>
                  </div>
                </div>

                {/* Option 3: Disabled */}
                <div
                  onClick={() => setWhatsAppMode("DISABLED")}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3",
                    whatsAppMode === "DISABLED"
                      ? "bg-[#161616] border-red-500/50 text-[#EDEDED]"
                      : "bg-[#0A0A0A] border-[#222] text-[#888] hover:border-[#333]"
                  )}
                >
                  <input
                    type="radio"
                    checked={whatsAppMode === "DISABLED"}
                    onChange={() => setWhatsAppMode("DISABLED")}
                    className="mt-1 accent-red-500"
                  />
                  <div>
                    <p className="font-bold text-xs text-[#EDEDED]">
                      🚫 Never Share Contact Info (Disabled)
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5 leading-relaxed">
                      The AI will keep all communication strictly within Facebook Messenger and will decline sharing phone/WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Fields */}
            {whatsAppMode !== "DISABLED" && (
              <div className="space-y-4 pt-4 border-t border-[#222] animate-in fade-in">
                <h4 className="font-semibold text-xs text-[#EDEDED]">Official Business Contact Details</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#888] mb-1.5">Official WhatsApp Number</label>
                    <div className="relative">
                      <MessageCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#25D366]" />
                      <input
                        type="text"
                        value={whatsAppNumber}
                        onChange={(e) => setWhatsAppNumber(e.target.value)}
                        placeholder="+8801819234567"
                        className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-[#25D366]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#888] mb-1.5">Customer Support Hotline / Call</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
                      <input
                        type="text"
                        value={hotlineNumber}
                        onChange={(e) => setHotlineNumber(e.target.value)}
                        placeholder="09612345678 or 01700000000"
                        className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] font-mono focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#888] mb-1.5">Physical Shop / Office Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#888]" />
                    <textarea
                      rows={2}
                      value={officeAddress}
                      onChange={(e) => setOfficeAddress(e.target.value)}
                      placeholder="Shop 12, Block D, Dhanmondi, Dhaka"
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white leading-relaxed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#888] mb-1.5">WhatsApp Pre-filled Customer Greeting Message</label>
                  <input
                    type="text"
                    value={whatsAppPrefillText}
                    onChange={(e) => setWhatsAppPrefillText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                  />
                  <span className="text-[10px] text-[#666] mt-1 block">
                    When customer taps the link, this text will be typed for them in WhatsApp.
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-[#EDEDED] transition-colors shadow-md"
              >
                Save Contact Protocol
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RULES & TRIGGERS */}
      {/* ========================================================================= */}
      {activeTab === "RULES" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Active Triggers</span>
              <p className="text-2xl font-bold text-[#EDEDED] mt-1">{rules.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Instant Hits</span>
              <p className="text-2xl font-bold text-[#10B981] mt-1">2,850</p>
            </div>
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Response Speed</span>
              <p className="text-2xl font-bold text-indigo-400 mt-1">Instant (0ms)</p>
            </div>
          </div>

          <div className="space-y-3">
            {rules.map((r) => (
              <div
                key={r.id}
                className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-sm text-[#EDEDED]">{r.name}</h3>
                  </div>
                  <span className="text-xs font-mono text-[#888]">{r.hits} triggered</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.keywords.map((k, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#111] border border-[#222] text-[11px] font-mono text-[#EDEDED]"
                    >
                      "{k}"
                    </span>
                  ))}
                </div>

                <p className="text-xs text-[#888] bg-[#111] p-3 rounded-lg border border-[#222] leading-relaxed">
                  <span className="text-[#555] font-semibold">Instant Reply: </span>
                  {r.reply}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AI PLAYGROUND SIMULATOR */}
      {/* ========================================================================= */}
      {activeTab === "PLAYGROUND" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[560px] animate-in fade-in duration-200">
          <div className="lg:col-span-2 rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col overflow-hidden">
            <div className="h-10 px-4 border-b border-[#222] flex items-center justify-between bg-[#111]/40 text-xs text-[#888]">
              <span>Facebook Messenger Sandbox</span>
              <button
                onClick={() =>
                  setSimMessages([
                    {
                      role: "model",
                      content: "আসসালামু আলাইকুম! আমি আপনার AI সহকারী। প্রোডাক্ট অর্ডার বা যেকোনো তথ্যের জন্য আমাকে মেসেজ দিন।",
                      thinking: "Session reset.",
                    },
                  ])
                }
                className="hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {simMessages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === "user" ? "self-end items-end ml-auto" : "self-start items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-2.5 rounded-2xl text-xs leading-relaxed",
                      m.role === "user"
                        ? "bg-white text-black rounded-tr-sm font-medium"
                        : "bg-[#161616] border border-[#262626] text-[#EDEDED] rounded-tl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                  {m.thinking && (
                    <div className="mt-1 p-2 rounded bg-[#111] border border-[#222] text-[10px] font-mono text-[#888]">
                      <span className="text-amber-500 font-semibold">Brain Logic: </span>
                      {m.thinking}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="p-3 rounded-xl bg-[#161616] text-xs text-[#888] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span>AI generating reply...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSimSend} className="p-3 border-t border-[#222] flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Test question (e.g. আপনাদের ফোন নাম্বার বা কন্টাক্ট দিন / দাম কত?)..."
                className="flex-1 px-4 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                disabled={!testInput.trim()}
                className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
            <h3 className="font-semibold text-sm text-[#EDEDED]">Active Test Config</h3>
            <div className="p-3 rounded-xl bg-[#111] border border-[#222] space-y-2 text-xs">
              <span className="font-semibold text-[#EDEDED] block">WhatsApp Sharing Mode</span>
              <span className="font-mono text-[#25D366] font-bold">
                {whatsAppMode === "ON_DEMAND"
                  ? "On-Demand (When asked)"
                  : whatsAppMode === "ALWAYS"
                  ? "Every Message"
                  : "Disabled"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#111] border border-[#222] space-y-2 text-xs">
              <span className="font-semibold text-[#EDEDED] block">Active WhatsApp Number</span>
              <span className="font-mono text-[#EDEDED]">{whatsAppNumber}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
