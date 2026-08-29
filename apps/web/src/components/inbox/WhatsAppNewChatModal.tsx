"use client";

import { Loader2, Phone, X } from "lucide-react";

interface WhatsAppNewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: { phone: string; name: string; initialMessage: string };
  onChange: (form: { phone: string; name: string; initialMessage: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function WhatsAppNewChatModal({
  isOpen,
  onClose,
  form,
  onChange,
  onSubmit,
  isSubmitting,
}: WhatsAppNewChatModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-5 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#166534] flex items-center justify-center font-bold">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">নতুন হোয়াটসঅ্যাপ চ্যাট শুরু করুন</h3>
              <p className="text-[10px] text-[#64748B]">কাস্টমারের ফোন নম্বরে সরাসরি মেসেজ পাঠান</p>
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
              কাস্টমারের ফোন নম্বর (Phone Number) *
            </label>
            <input
              type="text"
              required
              placeholder="01XXXXXXXXX বা +8801XXXXXXXXX"
              value={form.phone}
              onChange={(e) => onChange({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] font-mono focus:outline-none focus:border-[#25D366]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              কাস্টমারের নাম (Optional Name)
            </label>
            <input
              type="text"
              placeholder="যেমনঃ মোঃ রাশেদ"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#25D366]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#334155] mb-1">
              প্রাথমিক মেসেজ (Initial Message)
            </label>
            <textarea
              rows={3}
              placeholder="হ্যালো! Mogent থেকে আপনাকে স্বাগতম..."
              value={form.initialMessage}
              onChange={(e) => onChange({ ...form, initialMessage: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#25D366]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Phone className="w-3.5 h-3.5" />
              )}
              <span>{isSubmitting ? "শুরু হচ্ছে..." : "চ্যাট শুরু করুন"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
