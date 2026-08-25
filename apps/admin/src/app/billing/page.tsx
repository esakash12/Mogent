"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Filter,
  DollarSign,
  Building2,
  User,
  Phone,
  Hash,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  Tag,
  Plus,
  Trash2,
  Power,
  Calendar,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface PaymentTx {
  id: string;
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
  ownerName: string;
  plan: string;
  amount: number;
  currency: string;
  method: string;
  senderNumber: string;
  trxId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  couponCode?: string;
  discountAmount?: number;
  notes?: string;
  adminNote?: string;
  createdAt: string;
  approvedAt?: string;
}

interface CouponItem {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  maxDiscount?: number | null;
  minOrderAmount?: number | null;
  applicablePlan?: string | null;
  usageLimit?: number | null;
  usedCount: number;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState<"PAYMENTS" | "COUPONS">("PAYMENTS");

  // Payments State
  const [payments, setPayments] = useState<PaymentTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [approveModalTx, setApproveModalTx] = useState<PaymentTx | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<PaymentTx | null>(null);

  // Coupons State
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCreateCouponModal, setShowCreateCouponModal] = useState(false);
  const [deleteCouponItem, setDeleteCouponItem] = useState<CouponItem | null>(null);

  // Create Coupon Form
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [newValue, setNewValue] = useState("");
  const [newMaxDiscount, setNewMaxDiscount] = useState("");
  const [newMinOrder, setNewMinOrder] = useState("");
  const [newPlan, setNewPlan] = useState("ALL");
  const [newLimit, setNewLimit] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPayments(json.data);
      }
    } catch (err) {
      console.error("Failed to load admin payments:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCoupons(json.data);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchCoupons();
  }, []);

  const confirmApprove = async () => {
    if (!approveModalTx) return;
    const id = approveModalTx.id;
    setActionLoading(id);
    setMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments/${id}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: json.message || "Payment approved and plan activated!" });
        fetchPayments();
      } else {
        setMsg({ type: "error", text: json.error || "Approval failed" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Approval failed" });
    } finally {
      setActionLoading(null);
      setApproveModalTx(null);
    }
  };

  const confirmReject = async (reason?: string) => {
    if (!rejectModalTx) return;
    const id = rejectModalTx.id;
    setActionLoading(id);
    setMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Invalid Transaction ID" }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Transaction rejected." });
        fetchPayments();
      } else {
        setMsg({ type: "error", text: json.error || "Rejection failed" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Rejection failed" });
    } finally {
      setActionLoading(null);
      setRejectModalTx(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newValue) return;
    setIsSubmittingCoupon(true);
    setMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          discountType: newType,
          discountValue: parseFloat(newValue),
          maxDiscount: newMaxDiscount ? parseFloat(newMaxDiscount) : null,
          minOrderAmount: newMinOrder ? parseFloat(newMinOrder) : 0,
          applicablePlan: newPlan,
          usageLimit: newLimit ? parseInt(newLimit) : null,
          expiresAt: newExpiry || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: json.message || "Coupon created successfully!" });
        setShowCreateCouponModal(false);
        setNewCode("");
        setNewValue("");
        setNewMaxDiscount("");
        setNewMinOrder("");
        setNewLimit("");
        setNewExpiry("");
        fetchCoupons();
      } else {
        setMsg({ type: "error", text: json.error || "Failed to create coupon" });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Network error creating coupon" });
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons/${id}/toggle`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (json.success) {
        fetchCoupons();
      }
    } catch (err) {
      console.error("Toggle coupon error:", err);
    }
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteCouponItem) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons/${deleteCouponItem.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Coupon code deleted." });
        fetchCoupons();
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setDeleteCouponItem(null);
    }
  };

  const filtered = payments.filter((p) => {
    const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
    const matchSearch =
      p.workspaceName.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
      p.trxId.toLowerCase().includes(search.toLowerCase()) ||
      p.senderNumber.includes(search);
    return matchStatus && matchSearch;
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const approvedTotal = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Subscription & Revenue Control
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Review Bangladeshi manual payments (bKash, Nagad, Rocket), manage promo coupons, and approve subscriptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "COUPONS" && (
            <button
              onClick={() => setShowCreateCouponModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Promo Coupon</span>
            </button>
          )}

          <button
            onClick={() => (activeTab === "PAYMENTS" ? fetchPayments() : fetchCoupons())}
            className="px-3.5 py-2 rounded-xl bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer w-fit"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (loading || couponsLoading) && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#222] pb-3">
        <button
          onClick={() => setActiveTab("PAYMENTS")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "PAYMENTS"
              ? "bg-amber-500 text-black font-bold"
              : "bg-[#111] text-[#888] hover:text-[#EDEDED] border border-[#222]"
          )}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Verifications ({pendingCount} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab("COUPONS")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer",
            activeTab === "COUPONS"
              ? "bg-amber-500 text-black font-bold"
              : "bg-[#111] text-[#888] hover:text-[#EDEDED] border border-[#222]"
          )}
        >
          <Tag className="w-4 h-4" />
          <span>Coupon Codes & Discounts ({coupons.length})</span>
        </button>
      </div>

      {msg && (
        <div
          className={cn(
            "p-4 rounded-xl text-xs flex items-center justify-between border",
            msg.type === "success"
              ? "bg-[#10B981]/10 border-[#10B981]/20 text-[#10B981]"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs underline font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* ===================== TAB 1: PAYMENTS ===================== */}
      {activeTab === "PAYMENTS" && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
              <span className="text-xs text-[#888] font-medium">Pending Approvals</span>
              <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
              <span className="text-[11px] text-[#888] block">Awaiting TrxID check</span>
            </div>

            <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
              <span className="text-xs text-[#888] font-medium">Total Verified Revenue</span>
              <p className="text-2xl font-bold text-[#10B981]">৳{approvedTotal.toLocaleString()}</p>
              <span className="text-[11px] text-[#10B981] block">Approved BDT subscriptions</span>
            </div>

            <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-1">
              <span className="text-xs text-[#888] font-medium">Total Submissions</span>
              <p className="text-2xl font-bold text-[#EDEDED]">{payments.length}</p>
              <span className="text-[11px] text-[#888] block">All-time transactions</span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search Workspace, Email, TrxID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                    filterStatus === st
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-[#111] text-[#888] hover:text-[#EDEDED] border border-[#222]"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-xs text-[#888]">Loading payment submissions...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#777]">
                No payment records found matching current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111] text-[#888] border-b border-[#222]">
                    <tr>
                      <th className="p-3.5 font-medium">Workspace & Client</th>
                      <th className="p-3.5 font-medium">Plan</th>
                      <th className="p-3.5 font-medium">Amount</th>
                      <th className="p-3.5 font-medium">Method</th>
                      <th className="p-3.5 font-medium">Sender No.</th>
                      <th className="p-3.5 font-medium">TrxID</th>
                      <th className="p-3.5 font-medium">Coupon</th>
                      <th className="p-3.5 font-medium">Status</th>
                      <th className="p-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {filtered.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#111]/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-semibold text-[#EDEDED] flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-500" />
                            <span>{tx.workspaceName}</span>
                          </div>
                          <span className="text-[11px] text-[#777] block mt-0.5">{tx.ownerEmail}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-[#222] text-[#EDEDED] border border-[#333]">
                            {tx.plan}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-[#EDEDED]">
                          ৳{tx.amount.toLocaleString()}
                        </td>

                        <td className="p-3.5 font-semibold text-[#AAA]">{tx.method}</td>

                        <td className="p-3.5 font-mono text-[#888]">{tx.senderNumber}</td>

                        <td className="p-3.5 font-mono font-bold text-amber-500 tracking-wider">
                          {tx.trxId}
                        </td>

                        <td className="p-3.5">
                          {tx.couponCode ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {tx.couponCode} (-৳{tx.discountAmount})
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#555]">—</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {tx.status === "APPROVED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                              Active & Approved
                            </span>
                          )}
                          {tx.status === "PENDING" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                              Pending Review
                            </span>
                          )}
                          {tx.status === "REJECTED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          {tx.status === "PENDING" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setApproveModalTx(tx)}
                                disabled={actionLoading === tx.id}
                                className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => setRejectModalTx(tx)}
                                disabled={actionLoading === tx.id}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-xs transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#666] font-mono">
                              {tx.approvedAt ? `Approved ${new Date(tx.approvedAt).toLocaleDateString()}` : "Completed"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================== TAB 2: COUPONS ===================== */}
      {activeTab === "COUPONS" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
            {couponsLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span className="text-xs text-[#888]">Loading coupons...</span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#777] space-y-2">
                <p>No coupon codes created yet.</p>
                <button
                  onClick={() => setShowCreateCouponModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Coupon</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111] text-[#888] border-b border-[#222]">
                    <tr>
                      <th className="p-3.5 font-medium">Coupon Code</th>
                      <th className="p-3.5 font-medium">Discount</th>
                      <th className="p-3.5 font-medium">Target Plan</th>
                      <th className="p-3.5 font-medium">Usage Count</th>
                      <th className="p-3.5 font-medium">Expiration</th>
                      <th className="p-3.5 font-medium">Status</th>
                      <th className="p-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-[#111]/40 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
                              {c.code}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 font-medium text-[#EDEDED]">
                          {c.discountType === "PERCENTAGE" ? (
                            <span>
                              {c.discountValue}% OFF
                              {c.maxDiscount ? ` (Cap: ৳${c.maxDiscount})` : ""}
                            </span>
                          ) : (
                            <span>৳{c.discountValue} FLAT OFF</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#222] text-[#AAA] border border-[#333]">
                            {c.applicablePlan || "ALL"}
                          </span>
                        </td>

                        <td className="p-3.5 font-mono text-[#888]">
                          {c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : "times"}
                        </td>

                        <td className="p-3.5 font-mono text-[#888]">
                          {c.expiresAt ? (
                            new Date(c.expiresAt).toLocaleDateString()
                          ) : (
                            <span className="text-[#555]">Never</span>
                          )}
                        </td>

                        <td className="p-3.5">
                          {c.isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#555]/10 text-[#777] border border-[#555]/20">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleCoupon(c.id)}
                              title={c.isActive ? "Deactivate Coupon" : "Activate Coupon"}
                              className="p-1.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] transition-colors cursor-pointer"
                            >
                              <Power className={cn("w-3.5 h-3.5", c.isActive ? "text-[#10B981]" : "text-[#666]")} />
                            </button>

                            <button
                              onClick={() => setDeleteCouponItem(c)}
                              title="Delete Coupon"
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCreateCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-[#262626] rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-[#EDEDED]">Create Promo Coupon Code</h3>
              </div>
              <button
                onClick={() => setShowCreateCouponModal(false)}
                className="text-[#888] hover:text-[#EDEDED] text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Coupon Code (e.g. MOGENT50)</label>
                <input
                  type="text"
                  required
                  placeholder="MOGENT50"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">Discount Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (BDT)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">
                    {newType === "PERCENTAGE" ? "Percentage (e.g. 50)" : "Amount in BDT (e.g. 500)"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={newType === "PERCENTAGE" ? "100" : undefined}
                    placeholder={newType === "PERCENTAGE" ? "50" : "500"}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {newType === "PERCENTAGE" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">Max Discount Cap (Optional BDT)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={newMaxDiscount}
                    onChange={(e) => setNewMaxDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">Applicable Plan</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">All Plans</option>
                    <option value="STARTER">Starter Plan Only</option>
                    <option value="PRO">Pro Plan Only</option>
                    <option value="ENTERPRISE">Enterprise Plan Only</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">Usage Limit (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#111] border border-[#333] text-[#EDEDED] font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCouponModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] text-[#888] text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCoupon}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Coupon</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Coupon Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCouponItem}
        onClose={() => setDeleteCouponItem(null)}
        onConfirm={confirmDeleteCoupon}
        title="Delete Coupon Code"
        description={`Are you sure you want to permanently delete coupon [${deleteCouponItem?.code}]?`}
        confirmText="Delete Coupon"
        variant="danger"
      />

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={!!approveModalTx}
        onClose={() => setApproveModalTx(null)}
        onConfirm={confirmApprove}
        title="Approve Subscription Payment"
        description={`Are you sure you want to verify TrxID [${approveModalTx?.trxId}] (৳${approveModalTx?.amount}) and activate the ${approveModalTx?.plan} plan for "${approveModalTx?.workspaceName}"?`}
        confirmText="Approve & Activate"
        variant="success"
        isLoading={!!actionLoading}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={!!rejectModalTx}
        onClose={() => setRejectModalTx(null)}
        onConfirm={confirmReject}
        title="Reject Transaction"
        description={`Reject payment submission for TrxID [${rejectModalTx?.trxId}]. You can provide a reason for the merchant.`}
        confirmText="Reject Transaction"
        variant="danger"
        requiresInput={true}
        inputPlaceholder="e.g. Invalid TrxID / Payment not received in bKash account"
        defaultValue="Invalid Transaction ID"
        isLoading={!!actionLoading}
      />
    </div>
  );
}
