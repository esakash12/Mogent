"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Users,
  FileText,
  Ban,
  Send,
  Loader2,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  FlaskConical,
  Search,
  User,
  Phone,
  MessageSquare,
  Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchFollowupConfig,
  saveFollowupConfig,
  triggerFollowupScan,
  fetchContacts,
  fetchConversations,
  sendTestFollowup,
} from "@/lib/api";
import { toast } from "@/lib/toast";

type MainTab = "CAMPAIGNS" | "TEST" | "CUSTOMERS" | "TEMPLATES";
type FilterStatus = "ALL" | "DRAFT" | "SENDING" | "COMPLETED";

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("CAMPAIGNS");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [contacts, setContacts] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Follow-up Config State
  const [isEnabled, setIsEnabled] = useState(true);
  const [delayHours, setDelayHours] = useState(2);
  const [messageText, setMessageText] = useState(
    "ভাইয়া, আপনার পছন্দের প্রোডাক্টটির বিষয়ে কোনো কিছু জানার ছিল কি? অর্ডারটি কনফার্ম করতে চাইলে আমাদের জানাতে পারেন 😊"
  );
  const [sentCount, setSentCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Test Follow-up Utility State
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [testCustomMessage, setTestCustomMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, contactsData, convData] = await Promise.all([
        fetchFollowupConfig(),
        fetchContacts(),
        fetchConversations(),
      ]);

      if (configData) {
        setIsEnabled(configData.isEnabled !== false);
        setDelayHours(configData.delayHours || 2);
        if (configData.messageText) setMessageText(configData.messageText);
        setSentCount(configData.sentCount || 0);
      }

      if (contactsData) {
        setContacts(Array.isArray(contactsData) ? contactsData : (contactsData?.data || []));
      }

      if (Array.isArray(convData)) {
        setConversations(convData);
        if (convData.length > 0 && !selectedConversationId) {
          setSelectedConversationId(convData[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load campaigns data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await saveFollowupConfig({
        isEnabled,
        delayHours,
        messageText,
      });

      if (res?.success) {
        toast.success("Follow-up Rules Saved! ⚙️", {
          description: `Configured to auto-remind idle customers after ${delayHours} hours.`,
        });
      } else {
        toast.error("Failed to save follow-up configuration", {
          description: res?.error || "Please try again.",
        });
      }
    } catch (err: any) {
      toast.error("Network error while saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerFollowup = async () => {
    setIsTriggering(true);
    try {
      const res = await triggerFollowupScan();
      if (res?.success) {
        toast.success("Follow-up Scan Completed! 🚀", {
          description: `Dispatched follow-up reminders to ${res.sentCount || 0} idle customer conversations.`,
        });
        loadData();
      } else {
        toast.error("Follow-up scan failed", {
          description: res?.error || "Please check Facebook page connections.",
        });
      }
    } catch (err: any) {
      toast.error("Network error during follow-up scan");
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSendTestFollowup = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetConv = conversations.find((c) => c.id === selectedConversationId);
    const targetName = targetConv?.customerName || "Test Lead";

    setIsSendingTest(true);
    try {
      const res = await sendTestFollowup({
        conversationId: selectedConversationId || "DEFAULT_TEST_USER",
        customerId: targetConv?.customerId,
        customerPhone: targetConv?.phone,
        messageText: testCustomMessage.trim() || messageText,
      });

      if (res?.success) {
        toast.success("Test Follow-up Delivered! ✉️", {
          description: `Direct test message logged and sent to ${targetName}.`,
        });
      } else {
        toast.error("Test delivery notice", {
          description: res?.error || "Unable to send message to selected user.",
        });
      }
    } catch (err: any) {
      console.error("Test followup error:", err);
      toast.error("Network error during test delivery");
    } finally {
      setIsSendingTest(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = testSearchQuery.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.psid?.toLowerCase().includes(q)
    );
  });

  const activeSelectedConv = conversations.find((c) => c.id === selectedConversationId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Description & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#F59E0B]" />
            <span>ক্যাম্পেইন ও অটোমেটেড ফলো-আপ (Broadcasts & Follow-ups)</span>
          </h2>
          <p className="text-xs text-[#475569]">
            মেসেঞ্জার ও হোয়াটসঅ্যাপে ড্রপ-অফ কাস্টমারদের স্বয়ংক্রিয় অফার ও রিমাইন্ডার পাঠান।
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab("TEST")}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            <FlaskConical className="w-4 h-4 text-[#F59E0B]" />
            <span>টেস্ট ফলো-আপ টুল (Test Utility)</span>
          </button>

          <button
            onClick={handleTriggerFollowup}
            disabled={isTriggering}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs transition-all shadow-sm cursor-pointer w-fit disabled:opacity-50"
          >
            {isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
            <span>{isTriggering ? "Scanning..." : "রান ফলো-আপ স্ক্যান"}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm w-fit overflow-x-auto scrollbar-none">
        {[
          { id: "CAMPAIGNS", label: "অটো ফলো-আপ রুলস" },
          { id: "TEST", label: "🧪 টেস্ট ফলো-আপ টুল (Test User)" },
          { id: "CUSTOMERS", label: `কাস্টমার অডিয়েন্স (${contacts.length})` },
          { id: "TEMPLATES", label: "মেসেজ টেমপ্লেট" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={cn(
                "px-4 md:px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                active
                  ? "bg-[#F59E0B] text-black shadow-xs font-black"
                  : "text-[#64748B] hover:text-[#0F172A]"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Automated Follow-up Configuration */}
      {activeTab === "CAMPAIGNS" && (
        <div className="space-y-6">
          {/* Main Automation Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">অটোনোমাস কাস্টমার রি-এনগেজমেন্ট রুল</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  যেসব কাস্টমার চ্যাটে দাম জানার পর অর্ডার না দিয়ে নিষ্ক্রিয় হয়ে যান, এআই নির্দিষ্ট সময় পর তাদেরকে এই মেসেজটি পাঠাবে।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#475569]">{isEnabled ? "সক্রিয় (Active)" : "নিষ্ক্রিয়"}</span>
                <button
                  onClick={() => setIsEnabled(!isEnabled)}
                  className={cn(
                    "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                    isEnabled ? "bg-[#F59E0B]" : "bg-[#CBD5E1]"
                  )}
                >
                  <div
                    className={cn(
                      "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  কত ঘণ্টা পর ফলো-আপ পাঠানো হবে? (Delay Hours)
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 4, 12, 24].map((hours) => (
                    <button
                      type="button"
                      key={hours}
                      onClick={() => setDelayHours(hours)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                        delayHours === hours
                          ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] shadow-xs"
                          : "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-white"
                      )}
                    >
                      {hours} ঘণ্টা পর
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  স্বয়ংক্রিয় ফলো-আপ মেসেজ (Message Template) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] leading-relaxed font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                <div className="text-xs text-[#64748B] font-bold">
                  মোট ডেলিভারকৃত ফলো-আপ: <strong className="text-[#059669]">{sentCount} টি</strong>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isSaving ? "Saving Settings..." : "Save Follow-up Rule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Test Follow-up Tool */}
      {activeTab === "TEST" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
              <FlaskConical className="w-5 h-5 text-[#F59E0B]" />
              <span>নির্দিষ্ট কাস্টমারকে টেস্ট ফলো-আপ পাঠান (Instant Test Utility)</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              সাধারণ ক্রন-জব বা ঘন্টার পর ঘন্টা অপেক্ষা না করে, ডাটাবেসের যেকোনো নির্দিষ্ট কাস্টমার সিলেক্ট করে তাৎক্ষণিক টেস্ট ফলো-আপ পাঠান।
            </p>
          </div>

          <form onSubmit={handleSendTestFollowup} className="space-y-5">
            {/* Step 1: Customer Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#334155]">
                ১. কাস্টমার / চ্যাট কনভারসেশন সিলেক্ট করুন *
              </label>

              {/* Search Bar for Selector */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="কাস্টমারের নাম বা ফোন নাম্বার দিয়ে সার্চ করুন..."
                  value={testSearchQuery}
                  onChange={(e) => setTestSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {/* Scrollable Customer List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl bg-white scrollbar-thin">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => {
                    const isSelected = conv.id === selectedConversationId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversationId(conv.id)}
                        className={cn(
                          "p-3 flex items-center justify-between gap-3 cursor-pointer transition-all text-xs",
                          isSelected
                            ? "bg-[#FEF3C7]/40 border-l-4 border-[#F59E0B]"
                            : "hover:bg-[#F8FAFC]"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center border border-[#FDE68A] shrink-0">
                            {conv.customerName?.[0] || "C"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] truncate">{conv.customerName}</p>
                            <p className="text-[10px] text-[#64748B] font-mono truncate">
                              {conv.phone || "Messenger Customer"} • {conv.pageName || "Store Page"}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-black shrink-0">
                            Selected
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div
                    onClick={() => setSelectedConversationId("DEFAULT_TEST_USER")}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer bg-[#FFFDF5] border-l-4 border-[#F59E0B] text-xs hover:bg-[#FEF3C7]/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center border border-[#FDE68A] shrink-0">
                        T
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#0F172A]">ডিফল্ট টেস্ট লিড / Demo Customer</p>
                        <p className="text-[10px] text-[#64748B]">সরাসরি টেস্টের জন্য স্বয়ংক্রিয় সিলেক্টেড</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-black shrink-0">
                      Ready for Test
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Message Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#334155]">
                  ২. টেস্ট ফলো-আপ মেসেজ (Custom Test Message)
                </label>
                <button
                  type="button"
                  onClick={() => setTestCustomMessage(messageText)}
                  className="text-[10px] font-bold text-[#D97706] hover:underline cursor-pointer"
                >
                  ডিফল্ট টেমপ্লেট ব্যবহার করুন
                </button>
              </div>
              <textarea
                rows={3}
                placeholder={messageText}
                value={testCustomMessage}
                onChange={(e) => setTestCustomMessage(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] leading-relaxed font-medium"
              />
            </div>

            {/* Step 3: Selected Target Summary & Send Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#F1F5F9]">
              <div className="text-xs text-[#64748B]">
                {activeSelectedConv ? (
                  <span>
                    প্রাপক: <strong className="text-[#0F172A]">{activeSelectedConv.customerName}</strong>
                    {activeSelectedConv.phone && <span className="font-mono text-[#059669] ml-1">({activeSelectedConv.phone})</span>}
                  </span>
                ) : (
                  <span>
                    প্রাপক: <strong className="text-[#0F172A]">ডিফল্ট টেস্ট লিড / Demo Customer</strong>
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSendingTest}
                className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isSendingTest ? "Sending Test Follow-up..." : "Send Test Now (তাৎক্ষণিক পাঠান)"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Customers Audience */}
      {activeTab === "CUSTOMERS" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#475569]">
            Audience List ({contacts.length} Customers)
          </div>

          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
              <span className="text-xs font-bold text-[#64748B]">Loading audience...</span>
            </div>
          ) : contacts.length > 0 ? (
            <div className="divide-y divide-[#F1F5F9]">
              {contacts.map((c, i) => (
                <div key={c.id || i} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC]">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A]">{c.firstName} {c.lastName || ""}</h4>
                    <p className="text-[11px] text-[#64748B] font-mono">{c.phoneNumber || "Messenger User"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-[10px] font-bold">
                    Eligible for Broadcast
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center space-y-2">
              <Users className="w-8 h-8 text-[#CBD5E1] mx-auto" />
              <p className="text-xs font-bold text-[#0F172A]">No audience contacts yet</p>
              <p className="text-[11px] text-[#64748B]">Contacts will automatically populate as customers interact with your Facebook Page.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Templates */}
      {activeTab === "TEMPLATES" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-[#0F172A]">Pre-built Promotional Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => {
                setMessageText("ভাইয়া, আমাদের নতুন স্টক চলে এসেছে! সাথে থাকছে ফ্রি ডেলিভারি অফার। অর্ডার করতে রিপ্লাই দিন 😊");
                setActiveTab("CAMPAIGNS");
              }}
              className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#F59E0B] hover:bg-[#FFFDF5] cursor-pointer transition-all space-y-1.5"
            >
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E]">Free Delivery Offer</span>
              <p className="text-xs text-[#334155] leading-relaxed">
                ভাইয়া, আমাদের নতুন স্টক চলে এসেছে! সাথে থাকছে ফ্রি ডেলিভারি অফার। অর্ডার করতে রিপ্লাই দিন 😊
              </p>
            </div>

            <div
              onClick={() => {
                setMessageText("প্রিয় কাস্টমার, আপনার পছন্দের প্রোডাক্টটির স্টক প্রায় শেষের দিকে। অর্ডারটি বুক করে রাখতে চান কি?");
                setActiveTab("CAMPAIGNS");
              }}
              className="p-4 rounded-xl border border-[#E2E8F0] hover:border-[#F59E0B] hover:bg-[#FFFDF5] cursor-pointer transition-all space-y-1.5"
            >
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669]">Stock Urgency Reminder</span>
              <p className="text-xs text-[#334155] leading-relaxed">
                প্রিয় কাস্টমার, আপনার পছন্দের প্রোডাক্টটির স্টক প্রায় শেষের দিকে। অর্ডারটি বুক করে রাখতে চান কি?
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

