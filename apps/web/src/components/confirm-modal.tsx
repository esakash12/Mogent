"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "success" | "warning" | "default";
  requiresInput?: boolean;
  inputPlaceholder?: string;
  defaultValue?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  requiresInput = false,
  inputPlaceholder = "Enter reason or notes...",
  defaultValue = "",
  isLoading = false,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState(defaultValue);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(requiresInput ? inputValue : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
              variant === "danger"
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : variant === "success"
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : variant === "warning"
                ? "bg-amber-50 text-amber-600 border-amber-200"
                : "bg-indigo-50 text-indigo-600 border-indigo-200"
            )}
          >
            {variant === "danger" || variant === "warning" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#0F172A]">{title}</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">{description}</p>
          </div>
        </div>

        {requiresInput && (
          <div>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-colors"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F1F5F9]">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs",
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : variant === "success"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-[#F59E0B] hover:bg-[#D97706] text-black"
            )}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
