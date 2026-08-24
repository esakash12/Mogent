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
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  notes?: string;
  adminNote?: string;
  createdAt: string;
  approvedAt?: string;
}

export default function AdminBillingPage() {
  const [payments, setPayments] = useState<PaymentTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to verify this TrxID and ACTIVATE the subscription plan?")) return;
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
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason (e.g. Invalid TrxID / Payment not received):", "Invalid Transaction ID");
    if (reason === null) return;

    setActionLoading(id);
    setMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/billing/admin/payments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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
            Subscription & Payment Verification
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Review Bangladeshi manual payments (bKash, Nagad, Rocket), verify TrxIDs, and approve SaaS subscriptions.
          </p>
        </div>

        <button
          onClick={fetchPayments}
          className="px-3.5 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span>Refresh Transactions</span>
        </button>
      </div>

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
          <button onClick={() => setMsg(null)} className="text-xs underline font-medium">
            Dismiss
          </button>
        </div>
      )}

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
                  <th className="p-3.5 font-medium">Requested Plan</th>
                  <th className="p-3.5 font-medium">Amount</th>
                  <th className="p-3.5 font-medium">Payment Method</th>
                  <th className="p-3.5 font-medium">Sender No.</th>
                  <th className="p-3.5 font-medium">TrxID</th>
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
                            onClick={() => handleApprove(tx.id)}
                            disabled={actionLoading === tx.id}
                            className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(tx.id)}
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
    </div>
  );
}
