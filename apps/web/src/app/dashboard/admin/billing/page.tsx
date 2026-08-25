"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  Loader2,
  DollarSign,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";

interface PaymentTransaction {
  id: string;
  workspaceId: string;
  workspaceName: string;
  plan: string;
  amount: number;
  paymentMethod: "BKASH" | "NAGAD" | "ROCKET";
  transactionId: string;
  senderPhone: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminBillingApprovalsPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments`, {
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPayments(json.data);
      }
    } catch (err) {
      console.error("Error loading payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const [approveModalTx, setApproveModalTx] = useState<PaymentTransaction | null>(null);
  const [rejectModalTx, setRejectModalTx] = useState<PaymentTransaction | null>(null);

  const confirmApprove = async () => {
    if (!approveModalTx) return;
    const id = approveModalTx.id;
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments/${id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "APPROVED" } : p))
        );
      }
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionLoadingId(null);
      setApproveModalTx(null);
    }
  };

  const confirmReject = async (reason?: string) => {
    if (!rejectModalTx) return;
    const id = rejectModalTx.id;
    setActionLoadingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        },
        body: JSON.stringify({ reason: reason || "Invalid Transaction ID" }),
      });
      const json = await res.json();
      if (json.success) {
        setPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "REJECTED" } : p))
        );
      }
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionLoadingId(null);
      setRejectModalTx(null);
    }
  };

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.senderPhone.includes(searchQuery) ||
      p.workspaceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const approvedSum = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin Billing Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Payment & Subscription Approvals
          </h1>
          <p className="text-[#888] text-xs mt-1">
            Review bKash, Nagad, and Rocket transaction IDs submitted by merchants to activate Pro / Enterprise access.
          </p>
        </div>

        <button
          onClick={loadPayments}
          className="px-3.5 py-2 rounded-xl bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Pending Verifications</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Revenue Approved</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">৳ {approvedSum.toLocaleString()}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Transactions</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{payments.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Search TrxID, mobile, workspace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222] text-xs">
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING", label: `Pending (${pendingCount})` },
            { id: "APPROVED", label: "Approved" },
            { id: "REJECTED", label: "Rejected" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as any)}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                filterStatus === f.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading payment queue...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-[#555] mx-auto" />
            <p className="text-xs text-[#888]">No payment transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222] text-[#888] font-semibold">
                <tr>
                  <th className="p-4">Merchant Workspace</th>
                  <th className="p-4">Plan & Amount</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">TrxID & Sender Phone</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#111]/40 transition-colors">
                    <td className="p-4 font-semibold text-[#EDEDED]">
                      {item.workspaceName || "Merchant Workspace"}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-amber-500">{item.plan}</span>
                      <span className="text-[#888] block text-[11px]">৳ {item.amount.toLocaleString()}</span>
                    </td>

                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-[#222] text-[#EDEDED] border border-[#333]">
                        {item.paymentMethod}
                      </span>
                    </td>

                    <td className="p-4 font-mono">
                      <p className="font-bold text-[#EDEDED] select-all">{item.transactionId}</p>
                      <p className="text-[11px] text-[#888]">{item.senderPhone}</p>
                    </td>

                    <td className="p-4">
                      {item.status === "PENDING" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Pending Approval
                        </span>
                      )}
                      {item.status === "APPROVED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                          Approved (+30 Days)
                        </span>
                      )}
                      {item.status === "REJECTED" && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Rejected
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {item.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setApproveModalTx(item)}
                            disabled={actionLoadingId === item.id}
                            className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => setRejectModalTx(item)}
                            disabled={actionLoadingId === item.id}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#666]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={!!approveModalTx}
        onClose={() => setApproveModalTx(null)}
        onConfirm={confirmApprove}
        title="Approve Subscription Payment"
        description={`Are you sure you want to verify TrxID [${approveModalTx?.transactionId}] (৳${approveModalTx?.amount}) and activate the ${approveModalTx?.plan} plan for "${approveModalTx?.workspaceName}"?`}
        confirmText="Approve & Activate"
        variant="success"
        isLoading={!!actionLoadingId}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={!!rejectModalTx}
        onClose={() => setRejectModalTx(null)}
        onConfirm={confirmReject}
        title="Reject Transaction"
        description={`Reject payment submission for TrxID [${rejectModalTx?.transactionId}]. You can provide a reason for the merchant.`}
        confirmText="Reject Transaction"
        variant="danger"
        requiresInput={true}
        inputPlaceholder="e.g. Invalid TrxID / Payment not received"
        defaultValue="Invalid Transaction ID"
        isLoading={!!actionLoadingId}
      />
    </div>
  );
}
