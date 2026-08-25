"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Phone,
  ArrowRight,
  Loader2,
  Sparkles,
  RefreshCw,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBillingStatus, submitPayment, fetchPaymentConfig, validateCouponCode } from "@/lib/api";

const PLANS = [
  {
    id: "FREE",
    name: "Free Forever",
    price: "৳০",
    period: "/month",
    description: "Start exploring AI automation without any upfront cost.",
    features: [
      "1 Facebook Page Connection",
      "100 AI Automated Messages / mo",
      "Mogent Engine Turbo (v3.1)",
      "Basic FAQ Knowledge Base",
      "Standard Community Support",
    ],
    highlight: false,
  },
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
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dynamic Payment Gateway Config from Super Admin
  const [paymentConfig, setPaymentConfig] = useState<{
    bkashNumber: string;
    bkashType: string;
    nagadNumber: string;
    nagadType: string;
    rocketNumber: string;
    rocketType: string;
    instructions: string;
  }>({
    bkashNumber: "01711998877",
    bkashType: "Personal (Send Money)",
    nagadNumber: "01711998877",
    nagadType: "Personal (Send Money)",
    rocketNumber: "01711998877-0",
    rocketType: "Personal (Send Money)",
    instructions: "Send the exact plan amount to any number above, then enter your mobile number and Transaction ID (TrxID) below for instant admin verification.",
  });

  // Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
    originalPrice: number;
    finalAmount: number;
  } | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadBilling = async () => {
    setLoading(true);
    const [data, payConfigRes] = await Promise.all([
      fetchBillingStatus(),
      fetchPaymentConfig(),
    ]);
    setBillingData(data);
    if (payConfigRes?.success && payConfigRes?.data) {
      setPaymentConfig(payConfigRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleOpenUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setFeedback(null);
    setCouponMsg(null);
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setSenderNumber("");
    setTrxId("");
    setShowModal(true);
  };

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsValidatingCoupon(true);
    setCouponMsg(null);

    const res = await validateCouponCode(couponCodeInput.trim(), selectedPlan);
    if (res.success && res.data) {
      setAppliedCoupon(res.data);
      setCouponMsg({ type: "success", text: res.message || "Coupon applied successfully!" });
    } else {
      setAppliedCoupon(null);
      setCouponMsg({ type: "error", text: res.error || "Invalid coupon code." });
    }
    setIsValidatingCoupon(false);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    setCouponMsg(null);
  };

  const getPlanPrice = () => {
    if (selectedPlan === "STARTER") return 999;
    if (selectedPlan === "PRO") return 2499;
    if (selectedPlan === "ENTERPRISE") return 5999;
    return 0;
  };

  const calculateFinalPrice = () => {
    const base = getPlanPrice();
    if (!appliedCoupon) return base;
    return Math.max(0, base - appliedCoupon.discountAmount);
  };

  const handleSubmitTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderNumber || !trxId) {
      setFeedback({ type: "error", message: "Please provide both Sender Number and Transaction ID (TrxID)." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const res = await submitPayment({
      plan: selectedPlan,
      method: paymentMethod,
      senderNumber,
      trxId,
      couponCode: appliedCoupon?.code,
      notes,
    });

    if (res.success) {
      setFeedback({
        type: "success",
        message: "Payment submitted successfully! Admin will verify TrxID and activate your plan within 15-30 minutes.",
      });
      loadBilling();
      setTimeout(() => {
        setShowModal(false);
      }, 2500);
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to submit transaction." });
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Subscription & Billing
          </h1>
          <p className="text-[14px] text-[#888] mt-1">
            Manage your store's AI message quota, connected pages limits, and payment subscriptions.
          </p>
        </div>

        <button
          onClick={loadBilling}
          className="px-3.5 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span>Refresh Plan Status</span>
        </button>
      </div>

      {/* Current Active Plan Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#111] to-[#0A0A0A] border border-[#333] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-[#888]">Current Subscription Plan</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-black">
              {billingData?.currentPlan || "STARTER"} ACTIVE
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#EDEDED]">
            {billingData?.currentPlanDetails?.name || "Starter Plan"}
          </h2>
          <p className="text-xs text-[#888]">
            Connected Facebook Pages: <span className="text-[#EDEDED] font-semibold">{billingData?.connectedPagesCount || 0}</span> / {billingData?.pageLimit || 1} Allowed
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={() => handleOpenUpgrade("PRO")}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
          >
            <Zap className="w-4 h-4" />
            <span>Upgrade to Pro / Enterprise</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="space-y-4">
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-bold text-[#EDEDED]">Available Subscription Plans</h3>
          <p className="text-xs text-[#888]">Choose a plan that fits your business message volume</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p) => {
            const isCurrent = billingData?.currentPlan === p.id;

            return (
              <div
                key={p.id}
                className={cn(
                  "p-6 rounded-2xl border flex flex-col justify-between transition-all relative",
                  p.highlight
                    ? "bg-[#0F0F0F] border-amber-500/50 shadow-2xl shadow-amber-500/5"
                    : "bg-[#0A0A0A] border-[#222] hover:border-[#333]"
                )}
              >
                {p.tag && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black shadow-md">
                    {p.tag}
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-base text-[#EDEDED]">{p.name}</h4>
                    <p className="text-xs text-[#888] mt-1 leading-relaxed">{p.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#EDEDED]">{p.price}</span>
                    <span className="text-xs text-[#888]">{p.period}</span>
                  </div>

                  <div className="w-full h-[1px] bg-[#222] my-4" />

                  <ul className="space-y-2.5">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[#AAA]">
                        <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-[#1C1C1C]">
                  <button
                    onClick={() => handleOpenUpgrade(p.id)}
                    className={cn(
                      "w-full py-2.5 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer",
                      isCurrent
                        ? "bg-[#222] text-[#EDEDED] hover:bg-[#333]"
                        : p.highlight
                        ? "bg-amber-500 hover:bg-amber-400 text-black"
                        : "bg-white hover:bg-[#EDEDED] text-black"
                    )}
                  >
                    <span>{isCurrent ? "Renew Current Plan" : "Select " + p.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="space-y-4 pt-6 border-t border-[#222]">
        <div>
          <h3 className="text-lg font-bold text-[#EDEDED]">Payment & Verification History</h3>
          <p className="text-xs text-[#888]">Recent subscription payments and admin approvals</p>
        </div>

        {billingData?.paymentHistory?.length === 0 ? (
          <div className="p-8 rounded-xl border border-[#222] bg-[#0A0A0A] text-center text-xs text-[#777]">
            No payment history yet. Upgrading will display your transaction status here.
          </div>
        ) : (
          <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111] text-[#888] border-b border-[#222]">
                  <tr>
                    <th className="p-3.5 font-medium">Date</th>
                    <th className="p-3.5 font-medium">Plan</th>
                    <th className="p-3.5 font-medium">Amount</th>
                    <th className="p-3.5 font-medium">Method</th>
                    <th className="p-3.5 font-medium">Sender No.</th>
                    <th className="p-3.5 font-medium">TrxID</th>
                    <th className="p-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {billingData?.paymentHistory?.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-[#111]/40 transition-colors">
                      <td className="p-3.5 text-[#888] font-mono">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 font-semibold text-[#EDEDED]">{tx.plan}</td>
                      <td className="p-3.5 font-mono text-[#EDEDED]">৳{tx.amount}</td>
                      <td className="p-3.5 font-medium text-[#AAA]">{tx.method}</td>
                      <td className="p-3.5 font-mono text-[#888]">{tx.senderNumber}</td>
                      <td className="p-3.5 font-mono text-amber-500 font-semibold">{tx.trxId}</td>
                      <td className="p-3.5">
                        {tx.status === "APPROVED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                            Approved
                          </span>
                        )}
                        {tx.status === "PENDING" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Pending Verification
                          </span>
                        )}
                        {tx.status === "REJECTED" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade & Bangladeshi Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <h3 className="font-bold text-base text-[#EDEDED]">
                  Upgrade to {selectedPlan} Plan
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#888]">Payable Amount:</span>
                  {appliedCoupon ? (
                    <div className="flex items-center gap-1.5 font-bold text-xs font-mono">
                      <span className="text-[#666] line-through">৳{getPlanPrice().toLocaleString()}</span>
                      <span className="text-emerald-400 text-sm">৳{calculateFinalPrice().toLocaleString()} BDT</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {appliedCoupon.code} (-৳{appliedCoupon.discountAmount})
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-500 font-bold font-mono text-sm">
                      ৳{getPlanPrice().toLocaleString()} BDT / month
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Promo Coupon Code Section */}
            <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#888] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>Have a Promo Coupon Code?</span>
                </label>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[11px] text-red-400 hover:underline cursor-pointer"
                  >
                    Remove Coupon
                  </button>
                )}
              </div>

              {!appliedCoupon ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. MOGENT50"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCodeInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isValidatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </button>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                  <span>🎉 Coupon applied: You saved ৳{appliedCoupon.discountAmount.toLocaleString()}!</span>
                  <span className="font-mono font-bold">{appliedCoupon.code}</span>
                </div>
              )}

              {couponMsg && !appliedCoupon && (
                <p
                  className={cn(
                    "text-[11px]",
                    couponMsg.type === "success" ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {couponMsg.text}
                </p>
              )}
            </div>

            {/* Bangladeshi Payment Instructions (Admin Configured) */}
            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-3">
              <span className="text-xs font-semibold text-[#EDEDED] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                <span>Payment Accounts (Bangladesh):</span>
              </span>

              <div className="space-y-1.5 text-xs text-[#AAA] font-mono">
                <div className="p-2 rounded bg-[#111] flex justify-between items-center">
                  <span>bKash ({paymentConfig.bkashType || "Send Money"}):</span>
                  <span className="font-bold text-pink-500">{paymentConfig.bkashNumber}</span>
                </div>
                <div className="p-2 rounded bg-[#111] flex justify-between items-center">
                  <span>Nagad ({paymentConfig.nagadType || "Send Money"}):</span>
                  <span className="font-bold text-orange-500">{paymentConfig.nagadNumber}</span>
                </div>
                <div className="p-2 rounded bg-[#111] flex justify-between items-center">
                  <span>Rocket ({paymentConfig.rocketType || "Send Money"}):</span>
                  <span className="font-bold text-purple-400">{paymentConfig.rocketNumber}</span>
                </div>
              </div>
              <p className="text-[11px] text-[#777] leading-relaxed">
                {paymentConfig.instructions ||
                  "Send the exact plan amount to any number above, then enter your mobile number and Transaction ID (TrxID) below for instant admin verification."}
              </p>
            </div>

            {feedback && (
              <div
                className={cn(
                  "p-3 rounded-lg text-xs flex items-center gap-2",
                  feedback.type === "success"
                    ? "bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981]"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                )}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTrx} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {["BKASH", "NAGAD", "ROCKET"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        "py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer",
                        paymentMethod === m
                          ? "bg-amber-500 text-black border-amber-500 font-bold"
                          : "bg-[#0A0A0A] text-[#888] border-[#222] hover:text-[#EDEDED]"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Sender Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="017XXXXXXXX"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Transaction ID (TrxID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BL92KJX87M"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Any additional notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-[#EDEDED] hover:bg-[#222] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit TrxID for Approval</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
