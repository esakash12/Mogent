"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function KnowledgeBasePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/ai?tab=memories");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      <p className="text-sm font-medium text-muted-foreground">
        Redirecting to AI Co-Pilot Store Brain...
      </p>
    </div>
  );
}
