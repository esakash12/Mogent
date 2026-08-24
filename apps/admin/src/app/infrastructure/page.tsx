"use client";

import { useState } from "react";
import {
  Server,
  Database,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function InfrastructurePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const services = [
    {
      name: "AI Proxy Gateway",
      port: 5000,
      protocol: "HTTP (Hono)",
      status: "HEALTHY",
      uptime: "99.99%",
      latency: "< 20ms",
      load: "Optimal",
    },
    {
      name: "Core Ingestion Backend",
      port: 4000,
      protocol: "Hono REST",
      status: "HEALTHY",
      uptime: "99.99%",
      latency: "< 15ms",
      load: "Optimal",
    },
    {
      name: "Redis Cache & Key Pool",
      port: 6379,
      protocol: "TLS TCP",
      status: "HEALTHY",
      uptime: "100%",
      latency: "< 10ms",
      load: "Connected",
    },
    {
      name: "PostgreSQL Database",
      port: 5432,
      protocol: "Prisma ORM",
      status: "HEALTHY",
      uptime: "100%",
      latency: "< 25ms",
      load: "Connected",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            System Infrastructure & Services
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Live status of Core API, Gemini AI Proxy, PostgreSQL, and Redis memory pool.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-medium text-[#EDEDED] flex items-center gap-2 transition-colors w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-amber-500")} />
          <span>Refresh Services</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => (
          <div key={svc.name} className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center text-[#EDEDED]">
                <Server className="w-4 h-4 text-amber-500" />
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                {svc.status}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">{svc.name}</h3>
              <p className="text-xs text-[#888] font-mono mt-0.5">
                Port {svc.port} • {svc.protocol}
              </p>
            </div>

            <div className="pt-3 border-t border-[#222] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#888]">Latency</span>
                <p className="font-mono text-[#EDEDED] font-medium">{svc.latency}</p>
              </div>
              <div>
                <span className="text-[#888]">Status</span>
                <p className="font-mono text-[#10B981] font-medium">{svc.load}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
