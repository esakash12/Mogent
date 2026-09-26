"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  HelpCircle,
  Truck,
  RotateCcw,
  Building2,
  PhoneCall,
  UserCheck,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Edit2,
  Info,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  fetchKnowledgeAndWhatsApp,
  saveSystemPrompt,
  saveWhatsAppPrompt,
  createKnowledgeItem,
  deleteKnowledgeItem,
  saveWhatsAppProtocol,
  saveAboutInfo,
  saveKycSettings,
} from "@/lib/api";

type KnowledgeTab =
  | "PERSONA"
  | "WHATSAPP"
  | "FAQ"
  | "DELIVERY"
  | "RETURN"
  | "ABOUT"
  | "CONTACT"
  | "KYC";

const tabsList: { id: KnowledgeTab; label: string; isWhatsApp?: boolean }[] = [
  { id: "PERSONA", label: "Messenger AI Persona" },
  { id: "WHATSAPP", label: "WhatsApp Prompt", isWhatsApp: true },
  { id: "FAQ", label: "FAQ" },
  { id: "DELIVERY", label: "Delivery" },
  { id: "RETURN", label: "Return & Refund" },
  { id: "ABOUT", label: "About" },
  { id: "CONTACT", label: "Contact" },
  { id: "KYC", label: "KYC Fields" },
];

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("PERSONA");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Persona
  const [personaPrompt, setPersonaPrompt] = useState("");
  const [businessName, setBusinessName] = useState("");

  // WhatsApp Prompt State
  const [whatsappPrompt, setWhatsappPrompt] = useState("");
  const [isGeneratingWhatsApp, setIsGeneratingWhatsApp] = useState(false);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [savedWhatsAppSuccess, setSavedWhatsAppSuccess] = useState(false);

  // FAQ
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [showAddFaq, setShowAddFaq] = useState(false);

  // Delivery
  const [deliveryData, setDeliveryData] = useState({
    insideDhaka: "80",
    outsideDhaka: "150",
    timeDhaka: "1-2 Business Days",
    timeOutside: "2-4 Business Days",
    courierPartner: "Steadfast / Pathao / RedX",
    freeDeliveryThreshold: "2000",
  });

  // Return & Refund
  const [returnPolicy, setReturnPolicy] = useState(
    `১. ডেলিভারি ম্যানের উপস্থিতিতে প্রোডাক্ট চেক করে নিবেন।
২. সাইজ পরিবর্তন বা কোনো ডিফেক্ট থাকলে ৩ দিনের মধ্যে আমাদের পেইজে জানালে ফ্রি এক্সচেঞ্জ করে দেওয়া হবে।
৩. ক্যাশ রিফান্ড ৭ কার্যদিবসের মধ্যে আপনার বিকাশ/নগদ নাম্বারে পাঠানো হবে।`
  );

  // About
  const [aboutData, setAboutData] = useState({
    businessName: "My Online Store",
    tagline: "Quality Products with Fast Nationwide Delivery",
    description: "We are a trusted Bangladeshi e-commerce brand offering genuine premium apparel and accessories.",
  });

  // Contact
  const [contactData, setContactData] = useState({
    phone: "+880 1700-000000",
    whatsapp: "+880 1700-000000",
    email: "support@mogent.ai",
    address: "Dhaka, Bangladesh",
  });

  // KYC Fields
  const [kycFields, setKycFields] = useState([
    { id: "name", label: "Customer Full Name", description: "Mandatory for shipping label", required: true },
    { id: "phone", label: "Mobile Phone Number", description: "Required for courier OTP and call", required: true },
    { id: "address", label: "Full Delivery Address", description: "House, Road, Area details", required: true },
    { id: "city", label: "District / City", description: "Inside or Outside Dhaka detection", required: true },
    { id: "note", label: "Special Delivery Instructions", description: "Optional customer note", required: false },
  ]);

  // Load real knowledge data from database
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchKnowledgeAndWhatsApp();
      if (data) {
        if (data.systemPrompt) {
          setPersonaPrompt(data.systemPrompt);
        } else {
          setPersonaPrompt(
            `You are a helpful sales assistant for ${data.businessName || "our store"}.\nAlways reply in friendly Bengali (বাংলা / বাংলিশ).\nBe polite, concise, and help customers complete their orders quickly.\nDo not discuss competitor products or unrelated topics.`
          );
        }

        if (data.whatsappPrompt) {
          setWhatsappPrompt(data.whatsappPrompt);
        } else {
          setWhatsappPrompt(
            `আপনি "${data.businessName || "আমাদের শপ"}" এর একজন বাস্তব অভিজ্ঞ সেলস এক্সপার্ট ও শপ ওনার।
কাস্টমার মাত্রই WhatsApp-এ সরাসরি মেসেজ দিয়েছেন।
আপনার উত্তরগুলো হবে বাস্তব মানুষের মতো স্বাভাবিক, অত্যন্ত সংক্ষিপ্ত ও সরাসরি টু-দ্য-পয়েন্ট (১-২ টি ছোট বাক্যে)।
কখনোই রোবটের মতো দীর্ঘ বিবরণ বা বড় প্যারাগ্রাফ দেবেন না। সরাসরি প্রশ্নের উত্তর দিয়ে কাস্টমারকে অর্ডার কনফার্ম করতে সহায়তা করুন।`
          );
        }

        if (data.businessName) {
          setBusinessName(data.businessName);
          setAboutData((prev) => ({ ...prev, businessName: data.businessName }));
        }

        if (Array.isArray(data.items) && data.items.length > 0) {
          const faqItems = data.items
            .filter((i: any) => i.category === "FAQ" || i.category === "GENERAL_FAQ")
            .map((i: any) => ({ id: i.id, question: i.title, answer: i.content }));

          if (faqItems.length > 0) {
            setFaqs(faqItems);
          } else {
            setFaqs([
              { id: "1", question: "ডেলিভারি চার্জ কত?", answer: "ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৫০ টাকা।" },
              { id: "2", question: "ক্যাশ অন ডেলিভারি কি আছে?", answer: "হ্যাঁ, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।" },
            ]);
          }

          const deliveryItem = data.items.find((i: any) => i.category === "DELIVERY_POLICY");
          if (deliveryItem) {
            try {
              const parsed = JSON.parse(deliveryItem.content);
              setDeliveryData((prev) => ({ ...prev, ...parsed }));
            } catch {}
          }

          const returnItem = data.items.find((i: any) => i.category === "RETURN_POLICY");
          if (returnItem) {
            setReturnPolicy(returnItem.content);
          }
        } else {
          setFaqs([
            { id: "1", question: "ডেলিভারি চার্জ কত?", answer: "ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৫০ টাকা।" },
            { id: "2", question: "ক্যাশ অন ডেলিভারি কি আছে?", answer: "হ্যাঁ, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।" },
          ]);
        }

        if (data.aboutData) {
          setAboutData((prev) => ({ ...prev, ...data.aboutData }));
          if (data.aboutData.businessName) {
            setBusinessName(data.aboutData.businessName);
          }
        }

        if (Array.isArray(data.kycFields) && data.kycFields.length > 0) {
          setKycFields(data.kycFields);
        }

        if (data.whatsAppProtocol) {
          setContactData((prev) => ({
            ...prev,
            phone: data.whatsAppProtocol.hotline || prev.phone,
            whatsapp: data.whatsAppProtocol.number || prev.whatsapp,
            address: data.whatsAppProtocol.address || prev.address,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load knowledge from DB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateAiPersona = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPersonaPrompt(
        `You are Mogent AI, an expert, polite, and persuasive sales consultant for ${businessName || "our store"}.

Key Guidelines:
1. Always communicate in warm, natural Bengali or Banglish.
2. Pitch products based on our live catalog with exact prices and features.
3. Clearly state delivery charges (Inside Dhaka 80 BDT, Outside Dhaka 150 BDT).
4. Promptly capture customer name, phone number, and delivery address to finalize orders.
5. Provide a 3-day easy return and exchange guarantee to build trust.`
      );
      setIsGenerating(false);
    }, 800);
  };

  const handleSavePersona = async () => {
    setSaving(true);
    try {
      await saveSystemPrompt({
        systemPrompt: personaPrompt,
        businessName,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving persona to DB:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateWhatsAppTemplate = () => {
    setIsGeneratingWhatsApp(true);
    setTimeout(() => {
      setWhatsappPrompt(
        `আপনি "${businessName || "আমাদের শপ"}" এর একজন অত্যন্ত দক্ষ, বাস্তব সেলস এক্সপার্ট ও শপ ওনার।

কাস্টমার মাত্রই WhatsApp-এ সরাসরি যোগাযোগ করেছেন।
WhatsApp চ্যাট ও সেলস রুলস:
১. মানুষের মতো আন্তরিক ও সরাসরি ভাষায় কথা বলবেন।
২. প্রতিটি মেসেজের উত্তর হবে অত্যন্ত সংক্ষিপ্ত (সর্বোচ্চ ১-২ টি ছোট বাক্য)। কোনো বড় প্যারাগ্রাফ বা অপ্রয়োজনীয় ভূমিকা দেওয়া সম্পূর্ণ নিষেধ।
৩. কাস্টমার যা জানতে চেয়েছেন ঠিক সেইটুকুর সরাসরি উত্তর দিন।
৪. কাস্টমার প্রোডাক্ট নিতে আগ্রহী হলে বা সাইজ জানালে সরাসরি বলুন: "অর্ডারটি কি আপনার নামে কনফার্ম করে দেব? অনুগ্রহ করে আপনার নাম, ডেলিভারি ঠিকানা ও ফোন নাম্বার দিন।"
৫. দাম বা ডেলিভারি চার্জ জানতে চাইলে স্পষ্ট এক বাক্যে উত্তর দিন।`
      );
      setIsGeneratingWhatsApp(false);
      toast.success("Sales Masterclass Prompt Template Loaded!");
    }, 400);
  };

  const handleSaveWhatsAppPrompt = async () => {
    setIsSavingWhatsApp(true);
    try {
      const res = await saveWhatsAppPrompt(whatsappPrompt);
      if (res?.success) {
        setSavedWhatsAppSuccess(true);
        toast.success("Dedicated WhatsApp System Prompt saved successfully!");
        setTimeout(() => setSavedWhatsAppSuccess(false), 2500);
      } else {
        toast.error(res?.error || "Failed to save WhatsApp prompt.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save WhatsApp prompt.");
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion || !newAnswer) return;
    setSaving(true);
    try {
      const created = await createKnowledgeItem({
        title: newQuestion,
        category: "FAQ",
        content: newAnswer,
      });
      if (created) {
        setFaqs([...faqs, { id: created.id || Date.now().toString(), question: newQuestion, answer: newAnswer }]);
      } else {
        setFaqs([...faqs, { id: Date.now().toString(), question: newQuestion, answer: newAnswer }]);
      }
      setNewQuestion("");
      setNewAnswer("");
      setShowAddFaq(false);
    } catch (err) {
      console.error("Error creating FAQ:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    setFaqs(faqs.filter((f) => f.id !== id));
    await deleteKnowledgeItem(id);
  };

  const handleSaveDelivery = async () => {
    setSaving(true);
    try {
      await createKnowledgeItem({
        title: "Delivery Policy & Charges",
        category: "DELIVERY_POLICY",
        content: JSON.stringify(deliveryData),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving delivery:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReturnPolicy = async () => {
    setSaving(true);
    try {
      await createKnowledgeItem({
        title: "Return & Refund Policy",
        category: "RETURN_POLICY",
        content: returnPolicy,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving return policy:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      await saveWhatsAppProtocol({
        mode: "ON_DEMAND",
        number: contactData.whatsapp,
        hotline: contactData.phone,
        address: contactData.address,
        prefillText: "Hello! I want to order from your Facebook page.",
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving contact:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAbout = async () => {
    setSaving(true);
    try {
      await saveAboutInfo(aboutData);
      setBusinessName(aboutData.businessName);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving business about info:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveKyc = async () => {
    setSaving(true);
    try {
      await saveKycSettings({ fields: kycFields });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving KYC settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleKycRequired = (id: string) => {
    setKycFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, required: !f.required } : f))
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin" />
        <span className="text-xs font-semibold text-[#64748B]">Loading Knowledge Base...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 8 Sub Tabs Row with High Contrast */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {tabsList.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                active
                  ? tab.isWhatsApp
                    ? "bg-[#25D366] text-white shadow-sm"
                    : "bg-[#F59E0B] text-black shadow-sm"
                  : tab.isWhatsApp
                  ? "bg-white border border-[#BBF7D0] text-[#16A34A] hover:bg-[#F0FDF4]"
                  : "bg-white border border-[#E2E8F0] text-[#334155] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
              )}
            >
              {tab.isWhatsApp && <MessageCircle className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. AI PERSONA TAB */}
      {activeTab === "PERSONA" && (
        <div className="space-y-4">
          {/* Card 1: Title Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-1">
            <h2 className="text-sm font-bold text-[#0F172A]">AI Persona</h2>
            <p className="text-xs text-[#475569]">
              Define how your AI agent speaks and behaves. This is the first thing to set up.
            </p>
          </div>

          {/* Card 2: Tips Card */}
          <div className="bg-[#FFFDF5] rounded-2xl border border-[#FDE68A] p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-[#92400E]">Tips for a great AI Persona</h3>
            <ul className="text-xs text-[#78350F] space-y-1.5 list-disc pl-5 font-medium">
              <li>Use <strong>Generate with AI</strong> — it analyzes your products, services and knowledge base to write an expert sales persona that knows your shop</li>
              <li>Add your products and a few FAQ / delivery / return entries first for the best result</li>
              <li>Review the generated persona and edit anything you like</li>
              <li>Mention what the AI should and should not discuss</li>
            </ul>
          </div>

          {/* Card 3: Instructions Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0F172A]">
                Instructions for your AI
              </label>

              <button
                type="button"
                onClick={handleGenerateAiPersona}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FFFDF5] border border-[#FDE68A] text-[#92400E] text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                )}
                <span>Generate with AI</span>
              </button>
            </div>

            <textarea
              rows={11}
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              placeholder="Type or paste your AI System Prompt instructions here..."
              className="w-full p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-mono leading-relaxed focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#059669] font-bold">
                {savedSuccess && "✓ System Prompt saved to database successfully!"}
              </span>
              <button
                type="button"
                onClick={handleSavePersona}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving to DB..." : "Save Persona"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEDICATED WHATSAPP SYSTEM PROMPT TAB */}
      {activeTab === "WHATSAPP" && (
        <div className="space-y-4">
          {/* Card 1: Title Card with WhatsApp Green Branding */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center border border-[#BBF7D0] shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <span>Dedicated WhatsApp System Prompt</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                      Active on WhatsApp
                    </span>
                  </h2>
                  <p className="text-xs text-[#475569]">
                    Separate instructions specifically for WhatsApp. When a conversation is on WhatsApp, the AI automatically prioritizes this prompt.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Strategy Tips Card */}
          <div className="bg-[#F0FDF4] rounded-2xl border border-[#BBF7D0] p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>WhatsApp Sales Guidelines & Best Practices</span>
            </h3>
            <ul className="text-xs text-[#14532D] space-y-1.5 list-disc pl-5 font-medium">
              <li>
                <strong>ছোট ও প্রাকৃতিক উত্তর:</strong> WhatsApp-এ কাস্টমার লম্বা রোবটিক প্যারাগ্রাফ পছন্দ করে না। ১-২ বাক্যে সরাসরি মানুষের মতো উত্তর দিন।
              </li>
              <li>
                <strong>সেলস ক্লোজার স্টাইল:</strong> কাস্টমার সাইজ বা প্রোডাক্ট পছন্দ করলে সরাসরি নাম, ডেলিভারি ঠিকানা ও মোবাইল নাম্বার চেয়ে অর্ডার কনফার্ম করার দিকে নিয়ে যান।
              </li>
              <li>
                <strong>স্মার্ট প্রম্পট অগ্রাধিকার:</strong> এই প্রম্পটটি সেভ থাকলে WhatsApp চ্যানেলে এটি সাধারণ ফেসবুক মেসেঞ্জার প্রম্পটের চেয়ে স্বয়ংক্রিয়ভাবে অগ্রাধিকার পাবে।
              </li>
            </ul>
          </div>

          {/* Card 3: Instructions Editor Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                <span>WhatsApp System Prompt & Sales Persona</span>
              </label>

              <button
                type="button"
                onClick={handleGenerateWhatsAppTemplate}
                disabled={isGeneratingWhatsApp}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isGeneratingWhatsApp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
                )}
                <span>Load Sales Closer Template</span>
              </button>
            </div>

            <textarea
              rows={12}
              value={whatsappPrompt}
              onChange={(e) => setWhatsappPrompt(e.target.value)}
              placeholder="Write or paste your dedicated WhatsApp AI sales closer instructions here..."
              className="w-full p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-mono leading-relaxed focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#15803D] font-bold">
                {savedWhatsAppSuccess && "✓ Dedicated WhatsApp prompt saved to database & live!"}
              </span>
              <button
                type="button"
                onClick={handleSaveWhatsAppPrompt}
                disabled={isSavingWhatsApp}
                className="px-6 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5C] text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingWhatsApp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSavingWhatsApp ? "Saving..." : "Save WhatsApp Prompt"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. FAQ TAB */}
      {activeTab === "FAQ" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Frequently Asked Questions</h2>
              <p className="text-xs text-[#475569]">
                Common questions your customers ask, along with the answers your AI should provide.
              </p>
            </div>
            <button
              onClick={() => setShowAddFaq(true)}
              className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FAQ</span>
            </button>
          </div>

          {showAddFaq && (
            <form onSubmit={handleAddFaq} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 space-y-3 shadow-sm animate-in fade-in">
              <h3 className="text-xs font-bold text-[#0F172A]">Add New Question & Answer</h3>
              <input
                type="text"
                required
                placeholder="Question (e.g. ডেলিভারি চার্জ কত?)"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
              <textarea
                rows={3}
                required
                placeholder="Answer (e.g. ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৫০ টাকা।)"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFaq(false)}
                  className="px-3.5 py-1.5 rounded-lg border text-xs text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-[#F59E0B] text-black text-xs font-bold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add FAQ"}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm flex items-start justify-between gap-4 group">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFFBEB] text-[#92400E] font-bold text-[10px] flex items-center justify-center border border-[#FDE68A]">
                      Q
                    </span>
                    <span>{faq.question}</span>
                  </h4>
                  <p className="text-xs text-[#334155] pl-7 leading-relaxed font-medium">{faq.answer}</p>
                </div>
                <button
                  onClick={() => handleDeleteFaq(faq.id)}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DELIVERY TAB */}
      {activeTab === "DELIVERY" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Delivery Information</h2>
            <p className="text-xs text-[#475569]">
              Delivery charges, delivery timeframe, and courier information for your AI agent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Inside Dhaka Charge (৳)</label>
              <input
                type="text"
                value={deliveryData.insideDhaka}
                onChange={(e) => setDeliveryData({ ...deliveryData, insideDhaka: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Outside Dhaka Charge (৳)</label>
              <input
                type="text"
                value={deliveryData.outsideDhaka}
                onChange={(e) => setDeliveryData({ ...deliveryData, outsideDhaka: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Inside Dhaka Timeframe</label>
              <input
                type="text"
                value={deliveryData.timeDhaka}
                onChange={(e) => setDeliveryData({ ...deliveryData, timeDhaka: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Outside Dhaka Timeframe</label>
              <input
                type="text"
                value={deliveryData.timeOutside}
                onChange={(e) => setDeliveryData({ ...deliveryData, timeOutside: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#059669] font-bold">
              {savedSuccess && "✓ Delivery settings saved!"}
            </span>
            <button
              onClick={handleSaveDelivery}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Delivery Settings"}
            </button>
          </div>
        </div>
      )}

      {/* 4. RETURN & REFUND TAB */}
      {activeTab === "RETURN" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Return & Refund Policy</h2>
            <p className="text-xs text-[#475569]">
              Explain your conditions for returns, exchanges, and warranty.
            </p>
          </div>

          <textarea
            rows={7}
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] leading-relaxed focus:outline-none focus:border-[#F59E0B]"
          />

          <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#059669] font-bold">
              {savedSuccess && "✓ Return policy saved!"}
            </span>
            <button
              onClick={handleSaveReturnPolicy}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Return Policy"}
            </button>
          </div>
        </div>
      )}

      {/* 5. ABOUT TAB */}
      {activeTab === "ABOUT" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">About Your Business</h2>
            <p className="text-xs text-[#475569]">
              Company background and brand story so your AI can introduce your brand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Company / Brand Name</label>
              <input
                type="text"
                value={aboutData.businessName}
                onChange={(e) => setAboutData({ ...aboutData, businessName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Tagline</label>
              <input
                type="text"
                value={aboutData.tagline}
                onChange={(e) => setAboutData({ ...aboutData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">Brand Description</label>
            <textarea
              rows={4}
              value={aboutData.description}
              onChange={(e) => setAboutData({ ...aboutData, description: e.target.value })}
              className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#059669] font-bold">
              {savedSuccess && "✓ Business info saved to database!"}
            </span>
            <button
              onClick={handleSaveAbout}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Business Info"}
            </button>
          </div>
        </div>
      )}

      {/* 6. CONTACT TAB */}
      {activeTab === "CONTACT" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Contact Details</h2>
            <p className="text-xs text-[#475569]">Hotlines, WhatsApp number, and physical addresses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Hotline / Phone</label>
              <input
                type="text"
                value={contactData.phone}
                onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={contactData.whatsapp}
                onChange={(e) => setContactData({ ...contactData, whatsapp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Support Email</label>
              <input
                type="email"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1">Showroom / Store Address</label>
              <input
                type="text"
                value={contactData.address}
                onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#059669] font-bold">
              {savedSuccess && "✓ Contact & WhatsApp info saved!"}
            </span>
            <button
              onClick={handleSaveContact}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Contact Info"}
            </button>
          </div>
        </div>
      )}

      {/* 7. KYC FIELDS TAB */}
      {activeTab === "KYC" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Order Capture KYC Fields</h2>
            <p className="text-xs text-[#475569]">
              Fields your AI must collect from the customer when finalizing an order in chat.
            </p>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {kycFields.map((field) => (
              <div key={field.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">{field.label}</p>
                  <p className="text-[11px] text-[#475569]">{field.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleKycRequired(field.id)}
                  title="Click to toggle Mandatory / Optional"
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer",
                    field.required
                      ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] hover:bg-[#D1FAE5]"
                      : "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:bg-[#E2E8F0]"
                  )}
                >
                  {field.required ? "Mandatory (Click to change)" : "Optional (Click to change)"}
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
            <span className="text-xs text-[#059669] font-bold">
              {savedSuccess && "✓ Order Capture KYC settings saved to database!"}
            </span>
            <button
              onClick={handleSaveKyc}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save KYC Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
