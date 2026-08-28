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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchKnowledgeAndWhatsApp } from "@/lib/api";

type KnowledgeTab =
  | "PERSONA"
  | "FAQ"
  | "DELIVERY"
  | "RETURN"
  | "ABOUT"
  | "CONTACT"
  | "KYC";

const tabsList: { id: KnowledgeTab; label: string }[] = [
  { id: "PERSONA", label: "AI Persona" },
  { id: "FAQ", label: "FAQ" },
  { id: "DELIVERY", label: "Delivery" },
  { id: "RETURN", label: "Return & Refund" },
  { id: "ABOUT", label: "About" },
  { id: "CONTACT", label: "Contact" },
  { id: "KYC", label: "KYC Fields" },
];

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("PERSONA");
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Persona
  const [personaPrompt, setPersonaPrompt] = useState(
    `Example:
You are a helpful sales assistant for MD Shohag's Business.
Always reply in friendly Bengali (বাংলা / বাংলিশ).
Be polite, concise, and help customers complete their orders quickly.
Do not discuss competitor products or unrelated topics.`
  );

  // FAQ
  const [faqs, setFaqs] = useState<{ id: string; question: string; answer: string }[]>([
    {
      id: "1",
      question: "ডেলিভারি চার্জ কত?",
      answer: "ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৫০ টাকা।",
    },
    {
      id: "2",
      question: "ক্যাশ অন ডেলিভারি কি আছে?",
      answer: "হ্যাঁ, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।",
    },
    {
      id: "3",
      question: "প্রোডাক্টে সমস্যা হলে কি রিটার্ন করা যাবে?",
      answer: "অবশ্যই! ডেলিভারি পাওয়ার পর কোনো ত্রুটি থাকলে ৩ দিনের মধ্যে ফ্রি এক্সচেঞ্জ বা রিটার্ন করতে পারবেন।",
    },
  ]);
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
    businessName: "MD Shohag's Business",
    tagline: "Quality Products with Fast Nationwide Delivery",
    description: "We are a trusted Bangladeshi e-commerce brand offering genuine premium apparel and accessories.",
  });

  // Contact
  const [contactData, setContactData] = useState({
    phone: "+880 1700-000000",
    whatsapp: "+880 1700-000000",
    email: "support@mogent.com",
    address: "House 12, Road 4, Banani, Dhaka - 1213",
  });

  // KYC Fields
  const [kycFields, setKycFields] = useState([
    { id: "name", label: "Customer Full Name", description: "Mandatory for shipping label", required: true },
    { id: "phone", label: "Mobile Phone Number", description: "Required for courier OTP and call", required: true },
    { id: "address", label: "Full Delivery Address", description: "House, Road, Area details", required: true },
    { id: "city", label: "District / City", description: "Inside or Outside Dhaka detection", required: true },
    { id: "note", label: "Special Delivery Instructions", description: "Optional customer note", required: false },
  ]);

  const handleGenerateAiPersona = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPersonaPrompt(
        `You are Mogent AI, an expert, polite, and persuasive sales consultant for MD Shohag's Business.

Key Guidelines:
1. Always communicate in warm, natural Bengali or Banglish.
2. Pitch products based on our live catalog with exact prices and features.
3. Clearly state delivery charges (Inside Dhaka 80 BDT, Outside Dhaka 150 BDT).
4. Promptly capture customer name, phone number, and delivery address to finalize orders.
5. Provide a 3-day easy return and exchange guarantee to build trust.`
      );
      setIsGenerating(false);
    }, 1000);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }, 500);
  };

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion || !newAnswer) return;
    setFaqs([...faqs, { id: Date.now().toString(), question: newQuestion, answer: newAnswer }]);
    setNewQuestion("");
    setNewAnswer("");
    setShowAddFaq(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 7 Sub Tabs Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {tabsList.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                active
                  ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                  : "bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. AI PERSONA TAB */}
      {activeTab === "PERSONA" && (
        <div className="space-y-4">
          {/* Card 1: Title Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-1">
            <h2 className="text-sm font-bold text-[#111827]">AI Persona</h2>
            <p className="text-xs text-[#6B7280]">
              Define how your AI agent speaks and behaves. This is the first thing to set up.
            </p>
          </div>

          {/* Card 2: Tips Card */}
          <div className="bg-[#FFFDF5] rounded-2xl border border-[#FEF3C7] p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-[#92400E]">Tips for a great AI Persona</h3>
            <ul className="text-xs text-[#78350F] space-y-1.5 list-disc pl-5">
              <li>Use <strong>Generate with AI</strong> — it analyzes your products, services and knowledge base to write an expert sales persona that knows your shop</li>
              <li>Add your products and a few FAQ / delivery / return entries first for the best result</li>
              <li>Review the generated persona and edit anything you like</li>
              <li>Mention what the AI should and should not discuss</li>
            </ul>
          </div>

          {/* Card 3: Instructions Card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#111827]">
                Instructions for your AI
              </label>

              <button
                type="button"
                onClick={handleGenerateAiPersona}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#FFFDF5] border border-[#FDE68A] text-[#D97706] text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
              rows={9}
              value={personaPrompt}
              onChange={(e) => setPersonaPrompt(e.target.value)}
              className="w-full p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E7EB] text-xs text-[#111827] font-mono leading-relaxed focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#059669] font-semibold">
                {savedSuccess && "✓ Changes saved successfully!"}
              </span>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Persona"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FAQ TAB */}
      {activeTab === "FAQ" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">Frequently Asked Questions</h2>
              <p className="text-xs text-[#6B7280]">
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
            <form onSubmit={handleAddFaq} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-3 shadow-sm animate-in fade-in">
              <h3 className="text-xs font-bold text-[#111827]">Add New Question & Answer</h3>
              <input
                type="text"
                required
                placeholder="Question (e.g. ডেলিভারি চার্জ কত?)"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
              <textarea
                rows={3}
                required
                placeholder="Answer (e.g. ঢাকার ভেতরে ৮০ টাকা এবং ঢাকার বাইরে ১৫০ টাকা।)"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFaq(false)}
                  className="px-3.5 py-1.5 rounded-lg border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#F59E0B] text-black text-xs font-bold"
                >
                  Add FAQ
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm flex items-start justify-between gap-4 group">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#111827] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFFBEB] text-[#D97706] font-bold text-[10px] flex items-center justify-center border border-[#FDE68A]">
                      Q
                    </span>
                    <span>{faq.question}</span>
                  </h4>
                  <p className="text-xs text-[#4B5563] pl-7 leading-relaxed">{faq.answer}</p>
                </div>
                <button
                  onClick={() => setFaqs(faqs.filter((f) => f.id !== faq.id))}
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
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
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Delivery Information</h2>
            <p className="text-xs text-[#6B7280]">
              Delivery charges, delivery timeframe, and courier information for your AI agent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Inside Dhaka Charge (৳)</label>
              <input
                type="text"
                value={deliveryData.insideDhaka}
                onChange={(e) => setDeliveryData({ ...deliveryData, insideDhaka: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Outside Dhaka Charge (৳)</label>
              <input
                type="text"
                value={deliveryData.outsideDhaka}
                onChange={(e) => setDeliveryData({ ...deliveryData, outsideDhaka: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Inside Dhaka Timeframe</label>
              <input
                type="text"
                value={deliveryData.timeDhaka}
                onChange={(e) => setDeliveryData({ ...deliveryData, timeDhaka: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Outside Dhaka Timeframe</label>
              <input
                type="text"
                value={deliveryData.timeOutside}
                onChange={(e) => setDeliveryData({ ...deliveryData, timeOutside: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#F3F4F6]">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs shadow-sm"
            >
              Save Delivery Settings
            </button>
          </div>
        </div>
      )}

      {/* 4. RETURN & REFUND TAB */}
      {activeTab === "RETURN" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Return & Refund Policy</h2>
            <p className="text-xs text-[#6B7280]">
              Explain your conditions for returns, exchanges, and warranty.
            </p>
          </div>

          <textarea
            rows={7}
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            className="w-full p-3.5 rounded-xl border border-[#E5E7EB] text-xs leading-relaxed focus:outline-none focus:border-[#F59E0B]"
          />

          <div className="flex justify-end pt-2 border-t border-[#F3F4F6]">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs shadow-sm"
            >
              Save Return Policy
            </button>
          </div>
        </div>
      )}

      {/* 5. ABOUT TAB */}
      {activeTab === "ABOUT" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">About Your Business</h2>
            <p className="text-xs text-[#6B7280]">
              Company background and brand story so your AI can introduce your brand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Company / Brand Name</label>
              <input
                type="text"
                value={aboutData.businessName}
                onChange={(e) => setAboutData({ ...aboutData, businessName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Tagline</label>
              <input
                type="text"
                value={aboutData.tagline}
                onChange={(e) => setAboutData({ ...aboutData, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Brand Description</label>
            <textarea
              rows={4}
              value={aboutData.description}
              onChange={(e) => setAboutData({ ...aboutData, description: e.target.value })}
              className="w-full p-3 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-[#F3F4F6]">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs shadow-sm"
            >
              Save Business Info
            </button>
          </div>
        </div>
      )}

      {/* 6. CONTACT TAB */}
      {activeTab === "CONTACT" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Contact Details</h2>
            <p className="text-xs text-[#6B7280]">Hotlines, WhatsApp number, and physical addresses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Hotline / Phone</label>
              <input
                type="text"
                value={contactData.phone}
                onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={contactData.whatsapp}
                onChange={(e) => setContactData({ ...contactData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Support Email</label>
              <input
                type="email"
                value={contactData.email}
                onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Showroom / Store Address</label>
              <input
                type="text"
                value={contactData.address}
                onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[#F3F4F6]">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs shadow-sm"
            >
              Save Contact Info
            </button>
          </div>
        </div>
      )}

      {/* 7. KYC FIELDS TAB */}
      {activeTab === "KYC" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Order Capture KYC Fields</h2>
            <p className="text-xs text-[#6B7280]">
              Fields your AI must collect from the customer when finalizing an order in chat.
            </p>
          </div>

          <div className="divide-y divide-[#F3F4F6]">
            {kycFields.map((field) => (
              <div key={field.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111827]">{field.label}</p>
                  <p className="text-[11px] text-[#6B7280]">{field.description}</p>
                </div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold",
                  field.required ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#F3F4F6] text-[#6B7280]"
                )}>
                  {field.required ? "Mandatory" : "Optional"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3 border-t border-[#F3F4F6]">
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs shadow-sm"
            >
              Save KYC Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
