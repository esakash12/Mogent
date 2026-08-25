"use client";

import { useState, useEffect } from "react";
import { Users, Key, Server, Activity, ArrowUpRight, TrendingUp, AlertTriangle, Loader2, Facebook } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/overview`, {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStats(json.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
        <span className="text-xs text-[#888]">Loading live database metrics...</span>
      </div>
    );
  }

  const totalClients = stats?.totalClients || 0;
  const activeKeysCount = stats?.activeKeysCount || 0;
  const totalMessages = stats?.totalMessages || 0;
  const totalPages = stats?.totalPages || 0;
  const recentClients = stats?.recentClients || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#EDEDED] mb-1">Live System Overview</h1>
          <p className="text-[#888] text-sm">Real-time database statistics and AI key rotation health.</p>
        </div>
      </div>

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#888]">Total Workspaces</span>
            <div className="p-2 rounded-lg bg-[#222] text-[#EDEDED]">
              <Users className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{totalClients}</span>
            <span className="text-xs font-medium text-[#10B981]">Real PostgreSQL Count</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#888]">Active API Keys</span>
            <div className="p-2 rounded-lg bg-[#222] text-[#EDEDED]">
              <Key className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{activeKeysCount}</span>
            <span className="text-xs font-medium text-amber-500">Capacity: {activeKeysCount * 15} RPM</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#888]">Connected FB Pages</span>
            <div className="p-2 rounded-lg bg-[#222] text-[#EDEDED]">
              <Facebook className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{totalPages}</span>
            <span className="text-xs font-medium text-blue-400">Webhook Subscribed</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[#888]">Messages Processed</span>
            <div className="p-2 rounded-lg bg-[#222] text-[#EDEDED]">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{totalMessages.toLocaleString()}</span>
            <span className="text-xs font-medium text-[#10B981]">Total Invocations</span>
          </div>
        </div>
      </div>

      {/* Active Clients & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg text-[#EDEDED]">Recent Client Workspaces</h3>
            <Link href="/clients" className="text-sm text-[#888] hover:text-[#EDEDED] flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {recentClients.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#777]">
              No client workspaces registered in the database yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentClients.map((client: any) => (
                <div key={client.id} className="flex items-center justify-between p-4 rounded-xl bg-[#111] border border-[#222]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#222] flex items-center justify-center font-bold text-xs text-amber-500">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[#EDEDED] text-sm">{client.name}</p>
                      <p className="text-xs text-[#888] font-mono mt-0.5">{client.ownerEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-[#EDEDED]">{client.messagesCount} msgs</p>
                    <p className="text-xs text-[#10B981] mt-0.5">{client.pagesCount} Pages</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6">
          <h3 className="font-semibold text-lg text-[#EDEDED]">Key Pool Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 text-xs">
                <span className="text-[#888]">Redis Pool Rotation</span>
                <span className="text-[#10B981] font-semibold">Active & Live</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#222] overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full transition-all"
                  style={{ width: `${Math.min(activeKeysCount * 25, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111] border border-[#222] space-y-1">
              <span className="text-xs font-semibold text-[#EDEDED] block">Multiplexing Status</span>
              <p className="text-xs text-[#888] leading-relaxed">
                {activeKeysCount > 0
                  ? `${activeKeysCount} API keys actively rotating with automatic rate limit failover.`
                  : "No API keys in pool. Add keys in the Key Rotator tab."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
