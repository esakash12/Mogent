"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        {/* Left Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r border-[#E2E8F0] bg-white p-4 space-y-6 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] animate-pulse" />
            <div className="h-5 w-24 bg-[#E2E8F0] rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-full bg-[#F1F5F9] rounded-xl animate-pulse" />
          <div className="space-y-2.5 flex-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#F8FAFC]">
                <div className="w-4 h-4 rounded bg-[#E2E8F0] animate-pulse" />
                <div className="h-3.5 bg-[#E2E8F0] rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
              </div>
            ))}
          </div>
          <div className="h-12 w-full bg-[#F1F5F9] rounded-xl animate-pulse" />
        </div>

        {/* Main Canvas Skeleton */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
          {/* Header Skeleton */}
          <div className="h-16 border-b border-[#E2E8F0] bg-white px-8 flex items-center justify-between">
            <div className="h-5 w-36 bg-[#E2E8F0] rounded-lg animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-9 w-48 bg-[#F1F5F9] rounded-xl animate-pulse hidden sm:block" />
              <div className="w-9 h-9 rounded-xl bg-[#F1F5F9] animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-[#FEF3C7] animate-pulse" />
            </div>
          </div>

          {/* Body Skeleton */}
          <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1400px] w-full mx-auto overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-7 w-48 bg-[#E2E8F0] rounded-lg animate-pulse" />
                <div className="h-4 w-72 bg-[#F1F5F9] rounded-md animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-[#FEF3C7] rounded-xl animate-pulse" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white border border-[#E2E8F0] space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-20 bg-[#E2E8F0] rounded animate-pulse" />
                    <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] animate-pulse" />
                  </div>
                  <div className="h-7 w-28 bg-[#E2E8F0] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>

            <div className="h-72 rounded-2xl bg-white border border-[#E2E8F0] p-6 space-y-4 shadow-xs">
              <div className="h-5 w-40 bg-[#E2E8F0] rounded animate-pulse" />
              <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 w-full bg-[#F8FAFC] rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Navigation Sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
