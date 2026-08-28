"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  ArrowRight,
  Loader2,
  Sparkles,
  RefreshCw,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBillingStatus, fetchAnalytics, submitPayment, fetchPaymentConfig, validateCouponCode } from "@/lib/api";

const PLANS = [
  {
    id: "STARTER",
    name: "Starter Plan",
    price: "৳৯৯৯",
    period: "/মাস",
    description: "একটি ফেসবুক পেজ ও সাধারণ অনলাইন শপের জন্য সেরা সমাধান।",
    features: [
      "১টি ফেসবুক পেজ কানেকশন",
      "৫,০০০ এআই মেসেজ কোটা / মাস",
      "Mogent Engine Ultra (v3.5)",
      "প্রোডাক্ট ক্যাটালগ ও FAQ নলেজ বেইস",
      "কাস্টমার লিড (নাম, ফোন, ঠিকানা) ক্যাপচার",
      "স্ট্যান্ডার্ড প্রায়োরিটি সাপোর্ট",
    ],
    highlight: false,
  },
  {
    id: "PRO",
    name: "Pro Growth Plan",
    price: "৳২,৪৯৯",
    period: "/মাস",
    description: "গ্রোথ ব্র্যান্ড ও মাল্টি-পেজ ই-কমার্স শপের জন্য সর্বাধিক জনপ্রিয়।",
    features: [
      "সর্বোচ্চ ৫টি ফেসবুক পেজ কানেকশন",
      "২৫,০০০ এআই মেসেজ কোটা / মাস",
      "মেইন ও ব্যাকআপ মডেল রোটেটর",
      "WhatsApp ও হটলাইন শেয়ারিং প্রটোকল",
      "লাইভ হিউম্যান এজেন্ট হ্যান্ডঅফ ও টেকওভার",
      "টেলিগ্রাম ইনস্ট্যান্ট ১-ক্লিক অ্যালার্ট",
      "২৪/৭ প্রায়োরিটি সাপোর্ট",
    ],
    highlight: true,
    tag: "সর্বাধিক জনপ্রিয়",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise VIP",
    price: "৳৫,৯৯৯",
    period: "/মাস",
    description: "বড় ব্র্যান্ড ও হাই-ভলিউম বিজনেসের জন্য কাস্টম পারসোনা সল্যুশন।",
    features: [
      "সর্বোচ্চ ২০টি ফেসবুক পেজ",
      "১,০০,০০০+ এআই মেসেজ কোটা / মাস",
      "কাস্টম ব্র্যান্ড পারসোনা ফাইন-টিউনিং",
      "স্বয়ংক্রিয় অর্ডার কনফার্মেশন ও CRM",
      "মাল্টি-এজেন্ট টিম অপারেটর সিট",
      "ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার",
      "কাস্টম SLA ও ভিআইপি অনবোর্ডিং",
    ],
    highlight: false,
  },
];

export default function BillingPage() {
  const [billingData, setBillingData] = useState<any>(null);
  const [totalUsedMessages, setTotalUsedMessages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("PRO");
  const [paymentMethod, setPaymentMethod] = useState<string>("BKASH");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const [bData, aData] = await Promise.all([fetchBillingStatus(), fetchAnalytics()]);
      if (bData) setBillingData(bData);
      if (aData?.totalConversations) setTotalUsedMessages(aData.totalConversations);
    } catch (err) {
      console.error("Failed to load billing:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleOpenUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setFeedback(null);
    setSenderNumber("");
    setTrxId("");
    setShowModal(true);
  };

  const handleSubmitTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderNumber || !trxId) {
      setFeedback({ type: "error", message: "Please provide both Sender Number and Transaction ID (TrxID)." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await submitPayment({
        plan: selectedPlan,
        method: paymentMethod,
        senderNumber,
        trxId,
      });

      if (res?.success) {
        setFeedback({
          type: "success",
          message: "Payment submitted! Admin will verify TrxID and activate your plan shortly.",
        });
        loadBilling();
        setTimeout(() => setShowModal(false), 2500);
      } else {
        setFeedback({ type: "error", message: res?.error || "Failed to submit transaction." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Network error submitting payment." });
    } finally {
      setSubmitting(false);
    }
  };

  const msgLimit = billingData?.currentPlanDetails?.msgLimit || 5000;
  const remainingCredits = Math.max(0, msgLimit - totalUsedMessages);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#F59E0B]" />
            <span>সাবস্ক্রিপশন ও এআই ক্রেডিট (Billing & Credits)</span>
          </h2>
          <p className="text-xs text-[#475569]">
            আপনার স্টোরের এআই মেসেজ কোটা, কানেক্টেড পেজ লিমিট এবং পেমেন্ট সাবস্ক্রিপশন ম্যানেজ করুন।
          </p>
        </div>

        <button
          onClick={loadBilling}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] shadow-xs transition-all cursor-pointer w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#F59E0B]")} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Current Active Plan Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-[#64748B]">বর্তমান সক্রিয় প্যাকেজ:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
              {billingData?.currentPlan || "PRO GROWTH"} ACTIVE
            </span>
          </div>
          <h3 className="text-xl font-black text-[#0F172A]">
            {billingData?.currentPlanDetails?.name || "Pro Growth Plan (25,000 Messages)"}
          </h3>
          <div className="flex items-center gap-4 text-xs font-bold text-[#475569] pt-1">
            <span>
              অবশিষ্ট এআই মেসেজ কোটা: <strong className="text-[#059669] font-black">{remainingCredits.toLocaleString()}</strong> / {msgLimit.toLocaleString()}
            </span>
            <span>•</span>
            <span>
              কানেক্টেড পেজ: <strong className="text-[#0F172A]">{billingData?.connectedPagesCount || 1}</strong> / {billingData?.pageLimit || 5}
            </span>
          </div>
        </div>

        <button
          onClick={() => handleOpenUpgrade("PRO")}
          className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
        >
          <Zap className="w-4 h-4" />
          <span>রিনিউ / আপগ্রেড প্যাকেজ</span>
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#0F172A]">সকল প্যাকেজ সমূহ</h3>
          <p className="text-xs text-[#64748B]">আপনার মেসেজ ভলিউমের ওপর ভিত্তি করে প্ল্যান সিলেক্ট করুন</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
            return (
              <div
                key={p.id}
                className={cn(
                  "p-6 rounded-2xl border flex flex-col justify-between transition-all relative bg-white",
                  p.highlight
                    ? "border-[#F59E0B] shadow-md shadow-[#F59E0B]/10 ring-1 ring-[#F59E0B]"
                    : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                )}
              >
                {p.tag && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-black bg-[#F59E0B] text-black shadow-xs">
                    {p.tag}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A]">{p.name}</h4>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#0F172A]">{p.price}</span>
                    <span className="text-xs text-[#64748B]">{p.period}</span>
                  </div>

                  <div className="w-full h-[1px] bg-[#F1F5F9] my-4" />

                  <ul className="space-y-2.5">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#334155]">
                        <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-[#F1F5F9]">
                  <button
                    onClick={() => handleOpenUpgrade(p.id)}
                    className={cn(
                      "w-full py-2.5 rounded-xl font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs",
                      p.highlight
                        ? "bg-[#F59E0B] hover:bg-[#D97706] text-black"
                        : "bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A]"
                    )}
                  >
                    <span>{p.name} সিলেক্ট করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-[#0F172A]">
              {selectedPlan} প্ল্যানে সাবস্ক্রাইব করুন
            </h3>

            <div className="p-3.5 rounded-xl bg-[#FFFDF5] border border-[#FDE68A] space-y-1">
              <p className="text-xs font-bold text-[#92400E]">Send Money / Merchant Payment:</p>
              <p className="text-xs text-[#78350F]">
                bKash / Nagad Personal: <span className="font-mono font-bold">01711998877</span>
              </p>
            </div>

            <form onSubmit={handleSubmitTrx} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">প্রেরক মোবাইল নম্বর (Sender Mobile) *</label>
                <input
                  type="text"
                  required
                  placeholder="017xxxxxxxx"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BL9A7K2M"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs font-mono uppercase text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {feedback && (
                <div className={cn(
                  "p-3 rounded-xl text-xs font-bold",
                  feedback.type === "success" ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"
                )}>
                  {feedback.message}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-extrabold text-xs disabled:opacity-50"
                >
                  {submitting ? "Verifying..." : "পেমেন্ট নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
