"use client";

import { useState } from "react";
import {
  Key,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Copy,
  Check,
  Shield,
  Zap,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyStatus {
  id: string;
  maskedKey: string;
  model: string;
  rpmUsed: number;
  rpmLimit: number;
  totalCallsToday: number;
  status: "HEALTHY" | "COOLDOWN" | "ERROR_RATE_LIMIT" | "DISABLED";
  cooldownSecondsRemaining?: number;
  lastUsed: string;
}

const mockKeys: KeyStatus[] = [
  {
    id: "k-1",
    maskedKey: "AIzaSy...4x9K2",
    model: "gemini-2.0-flash",
    rpmUsed: 4,
    rpmLimit: 15,
    totalCallsToday: 1840,
    status: "HEALTHY",
    lastUsed: "2s ago",
  },
  {
    id: "k-2",
    maskedKey: "AIzaSy...8mN7L",
    model: "gemini-2.0-flash",
    rpmUsed: 2,
    rpmLimit: 15,
    totalCallsToday: 1920,
    status: "HEALTHY",
    lastUsed: "12s ago",
  },
  {
    id: "k-3",
    maskedKey: "AIzaSy...2pQ1Z",
    model: "gemini-2.0-flash",
    rpmUsed: 15,
    rpmLimit: 15,
    totalCallsToday: 2450,
    status: "COOLDOWN",
    cooldownSecondsRemaining: 34,
    lastUsed: "45s ago",
  },
  {
    id: "k-4",
    maskedKey: "AIzaSy...9wR4X",
    model: "gemini-2.0-flash",
    rpmUsed: 0,
    rpmLimit: 15,
    totalCallsToday: 1100,
    status: "HEALTHY",
    lastUsed: "1m ago",
  },
  {
    id: "k-5",
    maskedKey: "AIzaSy...7bV3C",
    model: "gemini-2.0-flash",
    rpmUsed: 6,
    rpmLimit: 15,
    totalCallsToday: 1680,
    status: "HEALTHY",
    lastUsed: "18s ago",
  },
  {
    id: "k-6",
    maskedKey: "AIzaSy...1kL9O",
    model: "gemini-2.0-flash",
    rpmUsed: 1,
    rpmLimit: 15,
    totalCallsToday: 1540,
    status: "HEALTHY",
    lastUsed: "30s ago",
  },
  {
    id: "k-7",
    maskedKey: "AIzaSy...5tY8U",
    model: "gemini-2.0-flash",
    rpmUsed: 0,
    rpmLimit: 15,
    totalCallsToday: 890,
    status: "HEALTHY",
    lastUsed: "3m ago",
  },
  {
    id: "k-8",
    maskedKey: "AIzaSy...3jH2M",
    model: "gemini-2.0-flash",
    rpmUsed: 0,
    rpmLimit: 15,
    totalCallsToday: 950,
    status: "HEALTHY",
    lastUsed: "2m ago",
  },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<KeyStatus[]>(mockKeys);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    const newKey: KeyStatus = {
      id: `k-${Date.now()}`,
      maskedKey: `${newKeyInput.substring(0, 6)}...${newKeyInput.substring(newKeyInput.length - 5)}`,
      model: "gemini-2.0-flash",
      rpmUsed: 0,
      rpmLimit: 15,
      totalCallsToday: 0,
      status: "HEALTHY",
      lastUsed: "Just added",
    };

    setKeys([newKey, ...keys]);
    setNewKeyInput("");
  };

  const toggleDisableKey = (id: string) => {
    setKeys((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              status: k.status === "DISABLED" ? "HEALTHY" : "DISABLED",
            }
          : k
      )
    );
  };

  const removeKey = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Gemini Key Rotator & Gateway
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Real-time RPM/TPM load balancing, cooldown tracking, and automatic failover across 8+ keys.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#111] border border-[#222] text-xs font-mono text-[#888] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Redis State: Sync Active</span>
          </div>
        </div>
      </div>

      {/* Live Capacity Card */}
      <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="text-xs text-[#888] font-medium">Total Pool Capacity</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">
            {keys.length * 15} <span className="text-xs font-normal text-[#888]">RPM</span>
          </p>
          <span className="text-[11px] text-[#10B981] mt-1 block">Free Tier Multiplexed</span>
        </div>

        <div>
          <span className="text-xs text-[#888] font-medium">Active Keys in Rotation</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">
            {keys.filter((k) => k.status === "HEALTHY").length} / {keys.length}
          </p>
          <span className="text-[11px] text-[#888] mt-1 block">Automatic Round-Robin</span>
        </div>

        <div>
          <span className="text-xs text-[#888] font-medium">Total API Invocations Today</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">
            {keys.reduce((acc, k) => acc + k.totalCallsToday, 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-amber-500 mt-1 block">Avg latency: 480ms</span>
        </div>

        <div>
          <span className="text-xs text-[#888] font-medium">Failover Rate</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">0.02%</p>
          <span className="text-[11px] text-[#10B981] mt-1 block">Zero customer drops</span>
        </div>
      </div>

      {/* Add New Key Bar */}
      <form onSubmit={handleAddKey} className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={newKeyInput}
            onChange={(e) => setNewKeyInput(e.target.value)}
            placeholder="Add new Gemini API Key (e.g. AIzaSy...)"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#111] border border-[#333] text-[13px] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors placeholder:text-[#555] font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={!newKeyInput.trim()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Key to Pool</span>
        </button>
      </form>

      {/* Keys List */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[#EDEDED]">Active Key Matrix</h3>
          <span className="text-xs text-[#888] font-mono">Strategy: LEAST_RECENTLY_USED</span>
        </div>

        <div className="divide-y divide-[#222]">
          {keys.map((k, index) => {
            const usagePercent = Math.round((k.rpmUsed / k.rpmLimit) * 100);

            return (
              <div
                key={k.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#111]/40 transition-colors group"
              >
                {/* Left: Key info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#111] border border-[#222] flex items-center justify-center text-xs font-mono text-[#888]">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-[#EDEDED]">{k.maskedKey}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222] text-[#888] border border-[#333]">
                        {k.model}
                      </span>
                    </div>
                    <span className="text-xs text-[#888] mt-0.5 block">Last invoked {k.lastUsed}</span>
                  </div>
                </div>

                {/* Middle: RPM gauge */}
                <div className="w-full md:w-56 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#888]">RPM Load</span>
                    <span className="font-mono text-[#EDEDED]">
                      {k.rpmUsed} / {k.rpmLimit} req/min
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#222] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        usagePercent >= 90
                          ? "bg-red-500"
                          : usagePercent >= 50
                          ? "bg-amber-500"
                          : "bg-[#10B981]"
                      )}
                      style={{ width: `${Math.max(usagePercent, 5)}%` }}
                    />
                  </div>
                </div>

                {/* Status badge */}
                <div>
                  {k.status === "HEALTHY" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                      Active & Healthy
                    </span>
                  )}
                  {k.status === "COOLDOWN" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Clock className="w-3 h-3 animate-spin" />
                      Cooldown ({k.cooldownSecondsRemaining}s)
                    </span>
                  )}
                  {k.status === "DISABLED" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#222] text-[#888] border border-[#333]">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => toggleDisableKey(k.id)}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-[#111] hover:bg-[#222] text-[#888] hover:text-[#EDEDED] border border-[#222] transition-colors"
                  >
                    {k.status === "DISABLED" ? "Enable" : "Disable"}
                  </button>
                  <button
                    onClick={() => removeKey(k.id)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
