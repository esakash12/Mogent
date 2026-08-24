"use client";

import { useState, useEffect } from "react";
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
  Sparkles,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KeyStatus {
  id: string;
  rawKey?: string;
  maskedKey: string;
  model: string;
  rpmUsed: number;
  rpmLimit: number;
  totalCallsToday: number;
  status: "HEALTHY" | "COOLDOWN" | "ERROR_RATE_LIMIT" | "DISABLED";
  lastUsed: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setKeys(json.data);
      }
    } catch (err) {
      console.error("Failed to load admin keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
        body: JSON.stringify({ key: newKeyInput.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setKeys((prev) => [json.data, ...prev.filter((k) => k.maskedKey !== json.data.maskedKey)]);
        setNewKeyInput("");
      } else {
        alert("Error adding key: " + (json.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Failed to add key:", err);
      alert("Failed to connect to the backend server. Make sure it is running. Error: " + err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const removeKey = async (keyItem: KeyStatus) => {
    if (!confirm("Are you sure you want to remove this API key from rotation?")) return;
    setKeys((prev) => prev.filter((k) => k.id !== keyItem.id));

    try {
      await fetch(`${API_BASE}/api/admin/keys`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
        body: JSON.stringify({ key: keyItem.rawKey || keyItem.maskedKey }),
      });
    } catch (err) {
      console.error("Failed to delete key:", err);
    }
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
            Real-time Redis API key pool with automatic round-robin multiplexing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchKeys}
            className="px-3.5 py-2 rounded-xl bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Sync Live Matrix</span>
          </button>
        </div>
      </div>

      {/* Live Capacity Card */}
      <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-xs text-[#888] font-medium">Total Pool Capacity</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">
            {keys.length * 15} <span className="text-xs font-normal text-[#888]">RPM</span>
          </p>
          <span className="text-[11px] text-[#10B981] mt-1 block">15 RPM per Gemini Free Key</span>
        </div>

        <div>
          <span className="text-xs text-[#888] font-medium">Active Keys in Rotation</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">
            {keys.length} <span className="text-xs font-normal text-[#888]">Keys</span>
          </p>
          <span className="text-[11px] text-[#888] mt-1 block">Live in Redis Pool</span>
        </div>

        <div>
          <span className="text-xs text-[#888] font-medium">Load Balancer Strategy</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">Round-Robin</p>
          <span className="text-[11px] text-[#888] mt-1 block">Least-Recently-Used Failover</span>
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
          type="button"
          onClick={() => {
            if (!newKeyInput.trim()) {
              alert("Please enter a valid Gemini API Key first.");
              return;
            }
            handleAddKey({ preventDefault: () => {} } as any);
          }}
          disabled={isAdding}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold text-xs flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer shadow-lg shadow-amber-500/10"
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>Add Key to Pool</span>
        </button>
      </form>

      {/* Keys List */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h3 className="font-semibold text-sm text-[#EDEDED]">Active Key Matrix</h3>
          <span className="text-xs text-[#888] font-mono">Live Redis Set: mogent:gemini_keys_pool</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading rotation matrix...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center space-y-2 p-4">
            <Key className="w-8 h-8 text-[#555] mx-auto" />
            <p className="text-xs text-[#EDEDED] font-semibold">No Custom Gemini Keys in Pool</p>
            <p className="text-[11px] text-[#777] max-w-sm mx-auto">
              Add your Google AI Studio Gemini API keys above. They will be stored in Redis and automatically multiplexed for all merchants.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#222]">
            {keys.map((k, index) => (
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
                    <span className="text-xs text-[#888] mt-0.5 block">{k.lastUsed}</span>
                  </div>
                </div>

                {/* Status badge */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                    Active in Pool
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => removeKey(k)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove key from rotation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
