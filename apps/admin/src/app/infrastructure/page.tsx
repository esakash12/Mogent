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
      uptime: "99.98%",
      latency: "24ms",
      load: "12%",
    },
    {
      name: "Core Ingestion Backend",
      port: 4000,
      protocol: "Express REST",
      status: "HEALTHY",
      uptime: "99.95%",
      latency: "18ms",
      load: "28%",
    },
    {
      name: "Upstash Redis (Cloud)",
      port: 6379,
      protocol: "TLS TCP",
      status: "HEALTHY",
      uptime: "100%",
      latency: "62ms",
      load: "4% Memory",
    },
    {
      name: "PostgreSQL Database Pool",
      port: 5432,
      protocol: "Prisma ORM",
      status: "HEALTHY",
      uptime: "99.99%",
      latency: "45ms",
      load: "8 Connections",
    },
  ];

  const queues = [
    {
      name: "incoming-messages",
      purpose: "Facebook Webhook payload ingestion & AI Generation",
      waiting: 0,
      active: 2,
      completed: 18450,
      failed: 3,
      concurrency: 10,
    },
    {
      name: "telegram-alerts",
      purpose: "Urgent human takeover & sentiment alerts",
      waiting: 0,
      active: 0,
      completed: 120,
      failed: 0,
      concurrency: 5,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Infrastructure & Health
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Real-time monitoring of microservices, database connection pools, and BullMQ task queues.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-medium text-[#EDEDED] flex items-center gap-2 transition-colors w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-amber-500")} />
          <span>Refresh Metrics</span>
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
                <span className="text-[#888]">Load</span>
                <p className="font-mono text-[#EDEDED] font-medium">{svc.load}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BullMQ Task Queues Section */}
      <div className="rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="p-5 border-b border-[#222] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-[#EDEDED]">BullMQ Background Workers</h3>
            <p className="text-xs text-[#888] mt-0.5">Redis-backed asynchronous job consumers.</p>
          </div>
          <span className="text-xs font-mono text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
            Workers Active: 2
          </span>
        </div>

        <div className="divide-y divide-[#222]">
          {queues.map((q) => (
            <div key={q.name} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-amber-500">{q.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222] text-[#888] border border-[#333]">
                      Concurrency: {q.concurrency}x
                    </span>
                  </div>
                  <p className="text-xs text-[#888] mt-1">{q.purpose}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#111] border border-[#222]">
                  <span className="text-[11px] text-[#888]">Waiting / Backlog</span>
                  <p className="text-lg font-bold font-mono text-[#EDEDED] mt-0.5">{q.waiting}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#111] border border-[#222]">
                  <span className="text-[11px] text-[#888]">Processing (Active)</span>
                  <p className="text-lg font-bold font-mono text-[#10B981] mt-0.5">{q.active}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#111] border border-[#222]">
                  <span className="text-[11px] text-[#888]">Completed (Lifetime)</span>
                  <p className="text-lg font-bold font-mono text-[#EDEDED] mt-0.5">{q.completed.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#111] border border-[#222]">
                  <span className="text-[11px] text-[#888]">Failed</span>
                  <p className="text-lg font-bold font-mono text-red-400 mt-0.5">{q.failed}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
