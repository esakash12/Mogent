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
import { fetchBillingStatus, submitPayment, fetchPaymentConfig, validateCouponCode } from "@/lib/api";

const PLANS = [
  {
    id: "STARTER",
    name: "Starter Plan",
    price: "৳৯৯৯",
    period: "/month",
    description: "Perfect for single Facebook page automation & growing online sellers.",
    features: [
      "1 Facebook Page Connection",
      "5,000 AI Automated Messages / mo",
      "Mogent Engine Ultra (v3.5)",
      "Advanced FAQ & Product Catalog",
      "Lead Capture (Name, Phone, Address)",
      "Standard Priority Support",
    ],
    highlight: false,
  },
  {
    id: "PRO",
    name: "Pro Growth Plan",
    price: "৳২,৪৯৯",
    period: "/month",
    description: "Most popular for active e-commerce brands & multi-page stores.",
    features: [
      "Up to 5 Facebook Pages",
      "25,000 AI Automated Messages / mo",
      "Both Main & Backup Models",
      "WhatsApp & Hotline On-Demand Sharing",
      "Live Human Agent Handoff & Takeover",
      "Instant Telegram Escalation Alerts",
      "Priority 24/7 Support",
    ],
    highlight: true,
    tag: "Most Popular",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise VIP",
    price: "৳৫,৯৯৯",
    period: "/month",
    description: "For established businesses needing high volume & custom personas.",
    features: [
      "Up to 20 Facebook Pages",
      "100,000+ AI Automated Messages / mo",
      "Custom Brand Persona Fine-Tuning",
      "Automated Order Confirmation & CRM",
      "Multi-agent Workspace Seats",
      "Dedicated Account Manager",
      "Custom SLA & VIP Onboarding",
    ],
    highlight: false,
  },
];

export default function BillingPage() {
  const [billingData, setBillingData] = useState<any>(null);
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
      const data = await fetchBillingStatus();
      if (data) setBillingData(data);
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#F59E0B]" />
            <span>Subscription & AI Credits</span>
          </h2>
          <p className="text-xs text-[#6B7280]">
            Manage your store&apos;s AI message quota, connected page limits, and payment subscriptions.
          </p>
        </div>

        <button
          onClick={loadBilling}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-semibold text-[#374151] shadow-sm transition-all cursor-pointer w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#F59E0B]")} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Current Active Plan Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-[#6B7280]">Current Subscription Plan</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
              {billingData?.currentPlan || "PRO GROWTH"} ACTIVE
            </span>
          </div>
          <h3 className="text-xl font-black text-[#111827]">
            {billingData?.currentPlanDetails?.name || "Pro Growth Plan (25,000 Messages)"}
          </h3>
          <p className="text-xs text-[#6B7280]">
            Remaining AI Conversations: <span className="text-[#111827] font-bold">98 / 100</span>
          </p>
        </div>

        <button
          onClick={() => handleOpenUpgrade("PRO")}
          className="px-5 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer w-fit"
        >
          <Zap className="w-4 h-4" />
          <span>Top-Up / Upgrade Plan</span>
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Available Plans</h3>
          <p className="text-xs text-[#6B7280]">Choose a plan that fits your business message volume</p>
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
                    : "border-[#E5E7EB] hover:border-[#D1D5DB]"
                )}
              >
                {p.tag && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B] text-black shadow-sm">
                    {p.tag}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#111827]">{p.name}</h4>
                    <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#111827]">{p.price}</span>
                    <span className="text-xs text-[#6B7280]">{p.period}</span>
                  </div>

                  <div className="w-full h-[1px] bg-[#F3F4F6] my-4" />

                  <ul className="space-y-2.5">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#374151]">
                        <Check className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-[#F3F4F6]">
                  <button
                    onClick={() => handleOpenUpgrade(p.id)}
                    className={cn(
                      "w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm",
                      p.highlight
                        ? "bg-[#F59E0B] hover:bg-[#D97706] text-black"
                        : "bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]"
                    )}
                  >
                    <span>Select {p.name}</span>
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
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-[#111827]">
              Subscribe to {selectedPlan} Plan
            </h3>

            <div className="p-3.5 rounded-xl bg-[#FFFDF5] border border-[#FEF3C7] space-y-1">
              <p className="text-xs font-bold text-[#92400E]">Send Money / Merchant Payment:</p>
              <p className="text-xs text-[#78350F]">
                bKash / Nagad Personal: <span className="font-mono font-bold">01700000000</span>
              </p>
            </div>

            <form onSubmit={handleSubmitTrx} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Sender Mobile Number *</label>
                <input
                  type="text"
                  required
                  placeholder="017xxxxxxxx"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Transaction ID (TrxID) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BL9A7K2M"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs font-mono uppercase focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              {feedback && (
                <div className={cn(
                  "p-3 rounded-xl text-xs font-medium",
                  feedback.type === "success" ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"
                )}>
                  {feedback.message}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-[#4B5563]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs disabled:opacity-50"
                >
                  {submitting ? "Verifying..." : "Submit Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
