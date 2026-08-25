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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0D0D0D] border border-[#262626] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-[#888] hover:text-[#EDEDED] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              variant === "danger"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : variant === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : variant === "warning"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            )}
          >
            {variant === "danger" || variant === "warning" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold text-base text-[#EDEDED]">{title}</h3>
            <p className="text-xs text-[#888] leading-relaxed">{description}</p>
          </div>
        </div>

        {requiresInput && (
          <div>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder}
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A] text-xs text-[#EDEDED] focus:outline-none focus:border-white transition-colors"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1C1C1C]">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#888] hover:text-[#EDEDED] hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm",
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : variant === "success"
                ? "bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                : "bg-white hover:bg-[#EDEDED] text-black font-semibold"
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
