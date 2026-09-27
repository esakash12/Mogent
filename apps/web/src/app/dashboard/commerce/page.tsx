"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CommerceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/products");
  }, [router]);

  return (
    <div className="py-24 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
      <span className="text-xs font-semibold text-[#64748B]">Redirecting to Products & Catalog...</span>
    </div>
  );
}
