"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { toast, ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((updated) => {
      setToasts(updated);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";
        const isInfo = t.type === "info";

        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-white border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
              isSuccess && "border-emerald-200 text-[#0F172A]",
              isError && "border-rose-200 text-[#0F172A]",
              isWarning && "border-amber-200 text-[#0F172A]",
              isInfo && "border-blue-200 text-[#0F172A]"
            )}
          >
            {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {isError && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            {isInfo && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-bold leading-tight">{t.title}</p>
              {t.description && (
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{t.description}</p>
              )}
            </div>

            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
