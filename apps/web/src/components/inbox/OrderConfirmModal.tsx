"use client";

import { Loader2, ShoppingBag, X } from "lucide-react";
import { Conversation } from "@/hooks/useInbox";

interface OrderConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConv: Conversation | undefined;
  form: {
    productName: string;
    totalAmount: string;
    deliveryAddress: string;
    customerPhone: string;
    paymentMethod: string;
  };
  onChange: (form: {
    productName: string;
    totalAmount: string;
    deliveryAddress: string;
    customerPhone: string;
    paymentMethod: string;
  }) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function OrderConfirmModal({
  isOpen,
  onClose,
  activeConv,
  form,
  onChange,
  onSubmit,
  isSubmitting,
}: OrderConfirmModalProps) {
  if (!isOpen || !activeConv) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">Confirm Customer Order</h3>
              <p className="text-[10px] text-[#64748B]">For {activeConv.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Product Name / Ordered Items *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Premium Cotton Shirt (L)"
              value={form.productName}
              onChange={(e) => onChange({ ...form, productName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#334155] mb-1">
                Total Amount (৳ BDT) *
              </label>
              <input
                type="number"
                required
                placeholder="e.g., 1250"
                value={form.totalAmount}
                onChange={(e) => onChange({ ...form, totalAmount: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#334155] mb-1">
                Payment Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => onChange({ ...form, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-semibold focus:outline-none focus:border-[#F59E0B]"
              >
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Customer Phone Number *
            </label>
            <input
              type="text"
              required
              placeholder="01XXXXXXXXX"
              value={form.customerPhone}
              onChange={(e) => onChange({ ...form, customerPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              Delivery Address
            </label>
            <textarea
              rows={2}
              placeholder="House, Road, Area, City..."
              value={form.deliveryAddress}
              onChange={(e) => onChange({ ...form, deliveryAddress: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5" />
              )}
              <span>{isSubmitting ? "Confirming..." : "Confirm & Save Order"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
