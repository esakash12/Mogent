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
  HelpCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchKnowledgeAndWhatsApp, createKnowledgeItem, deleteKnowledgeItem, saveWhatsAppProtocol, testPlaygroundChat, saveSystemPrompt, fetchPages } from "@/lib/api";

export default function AIAutomationSectorPage() {
  const [activeTab, setActiveTab] = useState<"KNOWLEDGE" | "PROMPT" | "WHATSAPP_CONTACT" | "RULES" | "PLAYGROUND">("KNOWLEDGE");
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");

  // --- 0. CUSTOM SYSTEM PROMPT & PERSONA STATE ---
  const [systemPrompt, setSystemPrompt] = useState("");
  const [whatsappPrompt, setWhatsappPrompt] = useState("");
  const [channelPromptTab, setChannelPromptTab] = useState<"MESSENGER" | "WHATSAPP">("MESSENGER");
  const [playgroundChannel, setPlaygroundChannel] = useState<"MESSENGER" | "WHATSAPP">("MESSENGER");
  const [businessName, setBusinessName] = useState("");
  const [promptSaved, setPromptSaved] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // --- 1. KNOWLEDGE STATE ---
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("PRODUCT_CATALOG");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 2. WHATSAPP & CONTACT SHARING STATE ---
  const [whatsAppMode, setWhatsAppMode] = useState<"ON_DEMAND" | "ALWAYS" | "DISABLED">("ON_DEMAND");
  const [whatsAppNumber, setWhatsAppNumber] = useState("+8801819234567");
  const [hotlineNumber, setHotlineNumber] = useState("09612345678");
  const [officeAddress, setOfficeAddress] = useState("Level 4, House 12, Road 4, Dhanmondi, Dhaka");
  const [whatsAppPrefillText, setWhatsAppPrefillText] = useState("Hello! I saw your products on Facebook and want to place an order.");
  const [contactSaved, setContactSaved] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Load from DB & Support Multi-Page Switch
  const loadPageConfig = async (pageId = selectedPageId) => {
    try {
      const [data, pagesList] = await Promise.all([
        fetchKnowledgeAndWhatsApp(pageId),
        fetchPages(),
      ]);

      if (Array.isArray(pagesList)) {
        setPages(pagesList);
      }

      if (data) {
        if (data.systemPrompt !== undefined) setSystemPrompt(data.systemPrompt || "");
        if (data.whatsappPrompt !== undefined) setWhatsappPrompt(data.whatsappPrompt || "");
        if (data.businessName !== undefined) setBusinessName(data.businessName || "");
        if (data.items && Array.isArray(data.items)) {
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
    } catch (err) {
      console.error("Failed to load page AI config:", err);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    const initialPage = saved || "ALL";
    setSelectedPageId(initialPage);
    loadPageConfig(initialPage);

    const handleGlobalPageChange = (e: any) => {
      const newPageId = e.detail?.pageId || "ALL";
      setSelectedPageId(newPageId);
      loadPageConfig(newPageId);
    };

    window.addEventListener("mogent_page_changed", handleGlobalPageChange);
    return () => window.removeEventListener("mogent_page_changed", handleGlobalPageChange);
  }, []);

  const handlePageChange = (newPageId: string) => {
    setSelectedPageId(newPageId);
    if (typeof window !== "undefined") {
      localStorage.setItem("mogent_active_page_id", newPageId);
    }
    loadPageConfig(newPageId);
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    const created = await createKnowledgeItem({
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
    });
    setIsSubmitting(false);

    if (created) {
      setKnowledgeItems((prev) => [created, ...prev]);
      setShowAddKnowledge(false);
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
    setIsSavingContact(true);
    const res = await saveWhatsAppProtocol({
      mode: whatsAppMode,
      number: whatsAppNumber,
      hotline: hotlineNumber,
      address: officeAddress,
      prefillText: whatsAppPrefillText,
    });
    setIsSavingContact(false);
    if (res) {
      setContactSaved(true);
      setTimeout(() => setContactSaved(false), 3000);
    }
  };

  const handleSaveSystemPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrompt(true);
    const res = await saveSystemPrompt({
      systemPrompt,
      whatsappPrompt,
      businessName,
      pageId: selectedPageId,
    });
    setIsSavingPrompt(false);
    if (res && (res.success || !res.error)) {
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2500);
    }
  };

  // --- 3. RULES STATE ---
  const [rules, setRules] = useState<any[]>([]);

  // --- 4. PLAYGROUND STATE ---
  const [simMessages, setSimMessages] = useState<
    Array<{ role: string; content: string; thinking?: string; button?: { title: string; url: string } }>
  >([
    {
      role: "model",
      content: "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি? আপনার অর্ডার বা যেকোনো তথ্যের জন্য বলতে পারেন।",
      thinking: "Persona initialized with friendly Bangladeshi sales moderator tone.",
    },
  ]);
  const [testInput, setTestInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSimSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim() || isTyping) return;
    const q = testInput;
    setTestInput("");
    
    const updatedHistory = [...simMessages, { role: "user", content: q }];
    setSimMessages(updatedHistory);
    setIsTyping(true);

    try {
      const res = await testPlaygroundChat(
        q,
        simMessages.map((m) => ({ role: m.role, content: m.content })),
        selectedPageId,
        playgroundChannel
      );

      if (res.success && res.data) {
        setSimMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: res.data.replyText || "কোনো উত্তর পাওয়া যায়নি।",
            thinking: res.data.thinking || "Generated via Mogent AI Engine with Knowledge Base.",
            button: res.data.button,
          },
        ]);
      } else {
        setSimMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: res.error || "AI সার্ভারের সাথে যোগাযোগ করা যায়নি। অনুগ্রহ করে নিশ্চিত করুন যে আপনার জেমিনি কী একটিভ আছে।",
            thinking: "Error communicating with AI Proxy Gateway.",
          },
        ]);
      }
    } catch (err: any) {
      setSimMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "একটি ত্রুটি হয়েছে: " + err.message,
          thinking: "Connection error",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Sector Tabs Bar & Page Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
              AI Automation Studio
            </h1>
            {selectedPageId !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold font-mono">
                📄 {pages.find((p) => p.id === selectedPageId)?.name || "Selected Page"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#888] mt-0.5">
            Train your AI agent, configure WhatsApp & Contact protocols, instant rules, and test responses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* The Sector Top Navigation Tabs (No Scrollbar) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
            <button
              onClick={() => setActiveTab("KNOWLEDGE")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === "KNOWLEDGE"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Knowledge Base</span>
            </button>

            <button
              onClick={() => setActiveTab("PROMPT")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                activeTab === "PROMPT"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Custom System Prompt</span>
            </button>

            <button
              onClick={() => setActiveTab("WHATSAPP_CONTACT")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
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
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
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
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
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
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active in Mogent AI Context
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
      {/* TAB: CUSTOM SYSTEM PROMPT & PERSONA INSTRUCTIONS */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* TAB: CUSTOM SYSTEM PROMPT & PERSONA INSTRUCTIONS (DUAL CHANNEL) */}
      {/* ========================================================================= */}
      {activeTab === "PROMPT" && (
        <form onSubmit={handleSaveSystemPrompt} className="space-y-6 max-w-4xl animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#EDEDED]">Custom AI System Prompt & Persona</h3>
                  <p className="text-xs text-[#888]">
                    Messenger ও WhatsApp এর জন্য আলাদা আলাদা প্রম্পট ও নিয়ম নির্ধারণ করুন।
                  </p>
                </div>
              </div>
              {promptSaved && (
                <span className="text-xs font-semibold text-[#10B981] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>

            {/* Brand / Store Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#EDEDED]">
                Brand or Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Dream Fashion BD"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Channel Persona Switcher */}
            <div className="flex items-center gap-2 p-1 bg-[#111] border border-[#222] rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setChannelPromptTab("MESSENGER")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                  channelPromptTab === "MESSENGER"
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                🔵 Messenger AI প্রম্পট
              </button>
              <button
                type="button"
                onClick={() => setChannelPromptTab("WHATSAPP")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                  channelPromptTab === "WHATSAPP"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                    : "text-[#888] hover:text-[#EDEDED]"
                )}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                🟢 WhatsApp Masterclass Closer প্রম্পট
              </button>
            </div>

            {/* --- MESSENGER TAB --- */}
            {channelPromptTab === "MESSENGER" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#888]">
                    Messenger Quick Templates:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSystemPrompt(
                          `আপনি "${businessName || "আমাদের শপ"}" এর একজন অভিজ্ঞ, ভদ্র এবং অত্যন্ত আন্তরিক বাস্তব মানব সেলস মডারেটর।\n\nকাজের নিয়মাবলী:\n১. সবসময় বাংলায় মিষ্টি ভাষায় কথা বলবেন এবং কাস্টমারকে সম্মান দিয়ে "আপনি" সম্বোধন করবেন।\n২. কাস্টমার কোনো প্রোডাক্ট পছন্দ করলে তাকে সাইজ ও কালার সিলেক্ট করতে সহায়তা করবেন।\n৩. অর্ডার কনফার্ম করতে কাস্টমারের কাছে তার নাম, মোবাইল নাম্বার এবং সম্পূর্ণ ডেলিভারি ঠিকানা চাইবেন।\n৪. আমাদের ডেলিভারি চার্জ ঢাকার ভেতরে ৬০ টাকা এবং ঢাকার বাইরে ১২০ টাকা।\n৫. কোনো তথ্য অজানা থাকলে কাস্টমারকে বলবেন যে আমাদের ম্যানেজার শীঘ্রই তার সাথে যোগাযোগ করবেন।`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-[11px] text-[#EDEDED] transition-colors"
                    >
                      🛍️ E-Commerce Sales Executive (Bangla)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSystemPrompt(
                          `You are an elite customer support representative for "${businessName || "Our Brand"}".\n\nKey Directives:\n- Maintain a professional, polite, and empathetic tone at all times.\n- Answer customer inquiries concisely based strictly on provided knowledge base.\n- When a lead or inquiry is urgent, collect their phone number for instant manager callback.\n- Do not fabricate facts or pricing not present in the catalog.`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-[11px] text-[#EDEDED] transition-colors"
                    >
                      👔 Professional Support (English)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#EDEDED]">
                      Facebook Messenger System Instructions
                    </label>
                    <span className="text-[11px] font-mono text-[#666]">
                      {systemPrompt.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={11}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={`এখানে আপনার ফেসবুক মেসেঞ্জারের জন্য বিস্তারিত প্রম্পট ও নিয়ম লিখুন...\n\nযেমন:\n- আপনি অমুক কোম্পানির সেলস এক্সিকিউটিভ\n- কাস্টমার দাম জানতে চাইলে প্রাইস লিস্ট অনুযায়ী উত্তর দেবেন\n- কাস্টমার প্রোডাক্ট অর্ডার করতে চাইলে ঠিকানা ও ফোন নাম্বার সংগ্রহ করবেন`}
                    className="w-full p-4 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-blue-500 font-sans leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-[#888]">
                    💡 <strong>Tip:</strong> ফেসবুক মেসেঞ্জারে কাস্টমারদের সাথে দীর্ঘ কথোপকথন ও অর্ডার বুকিং পরিচালনার জন্য এটি প্রযোজ্য।
                  </p>
                </div>
              </div>
            )}

            {/* --- WHATSAPP TAB --- */}
            {channelPromptTab === "WHATSAPP" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30 text-xs text-emerald-300/90 leading-relaxed">
                  <strong>✨ WhatsApp Masterclass Sales Closer মোড:</strong> আপনি শুধুমাত্র আপনার পণ্যের বেসিক তথ্য, রেট বা নিয়ম দিয়ে দিবেন। AI নিজে থেকেই একজন অভিজ্ঞ বাঙালি শপ ওনার ও সেলস এক্সপার্টের মতো <strong>১-২ লাইনে অত্যন্ত সংক্ষিপ্ত, মিষ্টি ও পয়েন্ট-টু-পয়েন্ট</strong> উত্তর দিয়ে কাস্টমার ক্লোজ করবে।
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#888]">
                    WhatsApp Masterclass Templates:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setWhatsappPrompt(
                          `আপনি "${businessName || "আমাদের শপ"}" এর একজন বাস্তব অভিজ্ঞ সেলস এক্সপার্ট ও শপ ওনার। কাস্টমার মাত্রই WhatsApp এ নক দিয়েছেন।\n\nকাজের মূল নিয়মাবলী:\n১. উত্তর সবসময় খুব ছোট হবে (৯০% রিপ্লাই ১ থেকে ২ টি বাক্যের মধ্যে)। অপ্রয়োজনীয় বড় লম্বা প্যারাগ্রাফ একদম দেবেন না।\n২. কাস্টমার যা জানতে চাইবে আগে হুবহু সেটার সরাসরি উত্তর দিন, তারপর কথা এগিয়ে নেওয়ার জন্য পাল্টা মিষ্টি প্রশ্ন করুন।\n৩. কাস্টমার প্রোডাক্ট বা সার্ভিসের কথা বললে আগে নিশ্চিত করুন (যেমন: "জী স্যার, আপনি কি এটা করতে চাচ্ছেন?")।\n৪. কাস্টমার দাম জানতে চাইলে সংক্ষেপে দাম বলে সাইজ/পরিমাণ জেনে নিন।\n৫. ছবি বা ফাইল দেওয়ার পর ধন্যবাদ দিয়ে ডেলিভারির জন্য নাম ও ঠিকানা চেয়ে অর্ডার ফাইনাল করুন।\n৬. আপনি ইতিমধ্যে WhatsApp এ আছেন, তাই ভুলেও WhatsApp নাম্বার বা লিংক দেবেন না।`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-[11px] text-[#EDEDED] transition-colors"
                    >
                      ⚡ দ্রুত সেলস ক্লোজার (১-২ লাইনে উত্তর)
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setWhatsappPrompt(
                          `আপনি "${businessName || "প্রাইম প্রিন্ট"}" এর প্রধান সেলস এক্সপার্ট। কাস্টমার NID কার্ড, পিভিসি কার্ড বা প্রিন্টিং সার্ভিসের জন্য WhatsApp এ এসেছেন।\n\nকাজের নিয়মাবলী:\n১. কাস্টমার প্রিন্ট করতে চাইলে সরাসরি উত্তর দিন: "জী স্যার, আপনি কি NID কার্ড প্রিন্ট করতে চাচ্ছেন? আপনার NID কার্ডের উভয় পাশের ছবি বা PDF ফাইলটি এখানে পাঠান।"\n২. কাস্টমার ফাইল পাঠালে চেক করে রেগুলার ও প্রিমিয়াম কার্ডের রেট সংক্ষেপে বলুন এবং তার কয়টি কপি লাগবে তা জেনে নিন।\n৩. ডেলিভারি চার্জ ঢাকার ভেতরে ৬০ টাকা, ঢাকার বাইরে ১২০ টাকা জানিয়ে সম্পূর্ণ ডেলিভারি ঠিকানা ও সচল মোবাইল নম্বর নিয়ে অর্ডার কনফার্ম করুন।\n৪. প্রতিটি উত্তর মাত্র ১-২ লাইনে বাস্তব মানুষের মতো আন্তরিকভাবে দিন।`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-[11px] text-[#EDEDED] transition-colors"
                    >
                      🖨️ NID ও প্রিন্টিং সার্ভিস স্পেশালিস্ট
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setWhatsappPrompt(
                          `আপনি "${businessName || "আমাদের ব্র্যান্ড"}" এর একজন প্রো-লেভেল সেলস ক্লোজার।\n\nনিয়মাবলী:\n১. কাস্টমার কোনো প্রোডাক্টের কথা জানতে চাইলে আগে হ্যাঁ/না উত্তর দিয়ে সাইজ বা কালার পছন্দ জিজ্ঞেস করুন।\n২. কাস্টমার পছন্দ করলে সাথে সাথে ডেলিভারি চার্জ (ঢাকার ভেতরে ৬০ টাকা, ঢাকার বাইরে ১২০ টাকা) উল্লেখ করে নাম, মোবাইল নম্বর ও ঠিকানা চেয়ে নিন।\n৩. কোনো তথ্য কাস্টমার আগের মেসেজে দিয়ে দিলে সেটা আর দ্বিতীয়বার জিজ্ঞেস করবেন না।\n৪. সব উত্তর সংক্ষিপ্ত, মিষ্টি ও প্রফেশনাল রাখবেন।`
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-[#222] text-[11px] text-[#EDEDED] transition-colors"
                    >
                      📦 ই-কমার্স সরাসরি অর্ডার কনফার্ম
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#EDEDED]">
                      WhatsApp System Instructions (খালি রাখলে Mogent Master Closer স্বয়ংক্রিয়ভাবে চলবে)
                    </label>
                    <span className="text-[11px] font-mono text-[#666]">
                      {whatsappPrompt.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={11}
                    value={whatsappPrompt}
                    onChange={(e) => setWhatsappPrompt(e.target.value)}
                    placeholder={`এখানে WhatsApp এর জন্য আপনার বেসিক নিয়মাবলী ও পণ্যের রেট লিখে রাখুন...\n\nযেমন:\n- কাস্টমার NID প্রিন্ট করতে চাইলে ছবি চাইতে হবে\n- ১ পিসের দাম ১৫০ টাকা, ২ পিস ২৫০ টাকা\n- ঢাকার ভেতরে ডেলিভারি ৬০ টাকা, বাইরে ১২০ টাকা\n- উত্তর সবসময় ১-২ লাইনে মানুষের মতো মিষ্টি করে দিতে হবে`}
                    className="w-full p-4 rounded-xl bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-emerald-500 font-sans leading-relaxed resize-y"
                  />
                  <p className="text-[11px] text-[#888]">
                    🛡️ <strong>WhatsApp Guard:</strong> WhatsApp এর জন্য এআই কখনো নিজেকে বট বলবে না, কখনোই "WhatsApp এ মেসেজ দিন" বলবে না, এবং কাস্টমারের পূর্ববর্তী চ্যাট ইতিহাস নিখুঁতভাবে মনে রাখবে।
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#222]">
              <button
                type="submit"
                disabled={isSavingPrompt}
                className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-purple-500/20 disabled:opacity-50"
              >
                {isSavingPrompt ? "Saving All Prompts..." : "Save AI Personas & Prompts"}
              </button>
            </div>
          </div>
        </form>
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
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="font-semibold">WhatsApp ও বিজনেস কনট্যাক্ট প্রোটোকল সফলভাবে সেভ হয়েছে!</span>
                </div>
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
                      💬 Persistent WhatsApp Link in Every Message
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
                disabled={isSavingContact}
                className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-[#EDEDED] transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSavingContact ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Protocol...
                  </>
                ) : (
                  "Save Contact Protocol"
                )}
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
              <p className="text-2xl font-bold text-[#10B981] mt-1">0</p>
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
                  {(r.keywords || []).map((k: string, i: number) => (
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
            <div className="h-11 px-4 border-b border-[#222] flex items-center justify-between bg-[#111]/60 text-xs text-[#888]">
              <div className="flex items-center gap-1.5 p-0.5 bg-[#000] border border-[#222] rounded-lg">
                <button
                  type="button"
                  onClick={() => setPlaygroundChannel("MESSENGER")}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                    playgroundChannel === "MESSENGER"
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      : "text-[#888] hover:text-[#EDEDED]"
                  )}
                >
                  <MessageCircle className="w-3 h-3 text-blue-400" />
                  Messenger
                </button>
                <button
                  type="button"
                  onClick={() => setPlaygroundChannel("WHATSAPP")}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                    playgroundChannel === "WHATSAPP"
                      ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                      : "text-[#888] hover:text-[#EDEDED]"
                  )}
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  WhatsApp
                </button>
              </div>

              <button
                onClick={() =>
                  setSimMessages([
                    {
                      role: "model",
                      content:
                        playgroundChannel === "WHATSAPP"
                          ? "জী স্যার, বলুন কীভাবে সহযোগিতা করতে পারি?"
                          : "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি? আপনার অর্ডার বা যেকোনো তথ্যের জন্য বলতে পারেন।",
                      thinking: `Session reset for ${playgroundChannel}.`,
                    },
                  ])
                }
                className="hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
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

                    {m.button && (
                      <div className="mt-3 pt-2 border-t border-[#262626]">
                        <a
                          href={m.button.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-[#222] hover:bg-[#2a2a2a] border border-[#333] text-[#25D366] text-xs font-semibold flex items-center justify-center gap-2 transition-all text-center shadow-sm cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                          <span>{m.button.title}</span>
                        </a>
                      </div>
                    )}
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
