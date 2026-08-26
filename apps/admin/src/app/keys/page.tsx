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
  Loader2,
  Edit3,
  Sliders,
  Power,
  Layers,
  ArrowRightLeft,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/confirm-modal";

interface ManagedApiKey {
  id: string;
  key?: string;
  maskedKey: string;
  name: string;
  role: "PRIMARY" | "SECONDARY" | "BACKUP";
  model: string;
  rpmUsed: number;
  rpmLimit: number;
  tpmUsed: number;
  tpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  status: "HEALTHY" | "COOLDOWN" | "DAILY_EXHAUSTED" | "DISABLED";
  isEnabled: boolean;
  cooldownUntil?: number | null;
  lastUsed?: string;
}

interface ModelSummary {
  modelKey: string;
  name: string;
  category: string;
  rpmUsed: number;
  rpmLimit: number;
  tpmUsed: number;
  tpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  activeKeysCount: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ManagedApiKey[]>([]);
  const [modelsSummary, setModelsSummary] = useState<ModelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRole, setNewKeyRole] = useState<"PRIMARY" | "SECONDARY" | "BACKUP">("PRIMARY");
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash-lite");
  const [isAdding, setIsAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit Modal State
  const [editingKey, setEditingKey] = useState<ManagedApiKey | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "PRIMARY" as "PRIMARY" | "SECONDARY" | "BACKUP",
    model: "gemini-3.5-flash-lite",
    rpmUsed: 0,
    rpmLimit: 15,
    tpmUsed: 0,
    tpmLimit: 250000,
    rpdUsed: 0,
    rpdLimit: 500,
    isEnabled: true,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteKeyItem, setDeleteKeyItem] = useState<ManagedApiKey | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.data)) setKeys(json.data);
        if (Array.isArray(json.modelsSummary)) setModelsSummary(json.modelsSummary);
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
        body: JSON.stringify({
          key: newKeyInput.trim(),
          name: newKeyName.trim() || undefined,
          role: newKeyRole,
          model: selectedModel,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Key added successfully!");
        setNewKeyInput("");
        setNewKeyName("");
        fetchKeys();
      } else {
        showToast(json.error || "Failed to add key", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to connect to backend server", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSwitchRole = async (keyId: string, role: "PRIMARY" | "SECONDARY" | "BACKUP") => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys/${keyId}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Switched role to ${role}!`);
        setKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, role } : k))
        );
      }
    } catch (err: any) {
      showToast(err.message || "Failed to switch role", "error");
    }
  };

  const openEditModal = (k: ManagedApiKey) => {
    setEditingKey(k);
    setEditForm({
      name: k.name || "",
      role: k.role,
      model: k.model,
      rpmUsed: k.rpmUsed || 0,
      rpmLimit: k.rpmLimit || 15,
      tpmUsed: k.tpmUsed || 0,
      tpmLimit: k.tpmLimit || 250000,
      rpdUsed: k.rpdUsed || 0,
      rpdLimit: k.rpdLimit || 500,
      isEnabled: k.isEnabled !== false,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys/${editingKey.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Key configuration & limits updated successfully!");
        setEditingKey(null);
        fetchKeys();
      } else {
        showToast(json.error || "Failed to update key", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error saving changes", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmRemoveKey = async () => {
    if (!deleteKeyItem) return;
    const keyId = deleteKeyItem.id;
    setKeys((prev) => prev.filter((k) => k.id !== keyId));

    try {
      await fetch(`${API_BASE}/api/admin/keys/${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
        },
      });
      showToast("Key removed from rotation pool.");
    } catch (err) {
      console.error("Failed to delete key:", err);
    } finally {
      setDeleteKeyItem(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 2) + "K";
    }
    return num.toString();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 backdrop-blur-xl",
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
              : "bg-rose-950/90 border-rose-500/40 text-rose-100"
          )}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED] flex items-center gap-3">
            <Key className="w-7 h-7 text-amber-500" />
            <span>Mogent AI API Keys & Model Quotas</span>
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Primary, Secondary & Backup Key Failover Gateway with live RPM, TPM, and RPD Quota Matrix.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchKeys}
            className="px-4 py-2.5 rounded-xl bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh Quotas</span>
          </button>
        </div>
      </div>

      {/* Model Quota Matrix Cards (Gemini 3.5 Flash Lite, Gemini 3.1 Flash Lite, Gemma 4 31B) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Gemini 3.5 Flash Lite */}
        <div className="p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-950/20 to-[#0A0A0A] relative overflow-hidden shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              Text-out models
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          </div>
          <h3 className="text-base font-bold text-[#EDEDED] mt-3">Gemini 3.5 Flash Lite</h3>
          <p className="text-[11px] text-[#888] mt-0.5">Primary high-speed sales moderator</p>

          <div className="mt-4 pt-4 border-t border-[#222] space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">RPM Limit:</span>
              <span className="font-bold text-blue-400">
                {modelsSummary.find((m) => m.modelKey === "gemini-3.5-flash-lite")?.rpmUsed ?? 6} / 15
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">TPM Limit:</span>
              <span className="font-bold text-[#EDEDED]">
                {formatNumber(modelsSummary.find((m) => m.modelKey === "gemini-3.5-flash-lite")?.tpmUsed ?? 33460)} / 250K
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">RPD (Daily):</span>
              <span className="font-bold text-emerald-400">
                {modelsSummary.find((m) => m.modelKey === "gemini-3.5-flash-lite")?.rpdUsed ?? 162} / 500
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Gemini 3.1 Flash Lite */}
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-950/20 to-[#0A0A0A] relative overflow-hidden shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              Text-out models
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          </div>
          <h3 className="text-base font-bold text-[#EDEDED] mt-3">Gemini 3.1 Flash Lite</h3>
          <p className="text-[11px] text-[#888] mt-0.5">Secondary 1-2 min cooldown fallback</p>

          <div className="mt-4 pt-4 border-t border-[#222] space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">RPM Limit:</span>
              <span className="font-bold text-amber-400">
                {modelsSummary.find((m) => m.modelKey === "gemini-3.1-flash-lite")?.rpmUsed ?? 5} / 15
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">TPM Limit:</span>
              <span className="font-bold text-[#EDEDED]">
                {formatNumber(modelsSummary.find((m) => m.modelKey === "gemini-3.1-flash-lite")?.tpmUsed ?? 29530)} / 250K
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">RPD (Daily):</span>
              <span className="font-bold text-emerald-400">
                {modelsSummary.find((m) => m.modelKey === "gemini-3.1-flash-lite")?.rpdUsed ?? 46} / 500
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Gemma 4 31B */}
        <div className="p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-[#0A0A0A] relative overflow-hidden shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
              Other models
            </span>
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          </div>
          <h3 className="text-base font-bold text-[#EDEDED] mt-3">Gemma 4 31B</h3>
          <p className="text-[11px] text-[#888] mt-0.5">High-capacity emergency backup tier</p>

          <div className="mt-4 pt-4 border-t border-[#222] space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[#888]">RPM Limit:</span>
              <span className="font-bold text-purple-400">
                {modelsSummary.find((m) => m.modelKey === "gemma-4-31b")?.rpmUsed ?? 1} / 30
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">TPM Limit:</span>
              <span className="font-bold text-[#EDEDED]">
                {formatNumber(modelsSummary.find((m) => m.modelKey === "gemma-4-31b")?.tpmUsed ?? 4)} / 16K
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#888]">RPD (Daily):</span>
              <span className="font-bold text-purple-400">
                {formatNumber(modelsSummary.find((m) => m.modelKey === "gemma-4-31b")?.rpdUsed ?? 1)} / 14.4K
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Key Form */}
      <form
        onSubmit={handleAddKey}
        className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#EDEDED] flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Add API Key to Failover Rotation</span>
          </h3>
          <span className="text-xs text-[#888] font-mono">Primary → Secondary (2-Min Auto-Switch) → Backup</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key Label (e.g. AI Studio 1)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="sm:col-span-4 relative">
            <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value)}
              placeholder="API Key string (AIzaSy...)"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={newKeyRole}
              onChange={(e) => setNewKeyRole(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="PRIMARY">PRIMARY (1st)</option>
              <option value="SECONDARY">SECONDARY (2nd)</option>
              <option value="BACKUP">BACKUP (3rd)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
            >
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
              <option value="gemma-4-31b">Gemma 4 31B</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              disabled={isAdding || !newKeyInput.trim()}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add</span>
            </button>
          </div>
        </div>
      </form>

      {/* Managed Keys Table */}
      <div className="rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]/30">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-[#EDEDED]">Configured Keys & Failover Hierarchy</h3>
          </div>
          <span className="text-xs text-[#888] font-mono">Total Active: {keys.filter((k) => k.isEnabled).length} Keys</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Synchronizing live key metrics...</span>
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center space-y-2 p-4">
            <Key className="w-8 h-8 text-[#555] mx-auto" />
            <p className="text-xs text-[#EDEDED] font-semibold">No API Keys Configured</p>
            <p className="text-[11px] text-[#777] max-w-sm mx-auto">
              Add your Google AI Studio keys above. Primary keys will serve requests, auto-switching to Secondary on 1-2 min rate limits, and turning off on daily limits.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#222]">
            {keys.map((k, index) => (
              <div
                key={k.id}
                className="p-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#111]/40 transition-colors group"
              >
                {/* 1. Key Info & Tier Badge */}
                <div className="flex items-center gap-3.5 min-w-[280px]">
                  <div
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0",
                      k.role === "PRIMARY"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        : k.role === "SECONDARY"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    )}
                  >
                    {k.role}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[#EDEDED]">{k.maskedKey}</span>
                      <span className="text-[11px] text-[#888] font-medium font-sans">({k.name})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-[#888]">{k.model}</span>
                      <span className="text-[#444]">•</span>
                      <span className="text-[10px] text-[#666]">{k.lastUsed || "Active"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Live RPM / TPM / RPD Metrics */}
                <div className="grid grid-cols-3 gap-4 px-4 py-2 rounded-xl bg-[#111]/60 border border-[#222] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#888] block">RPM Used</span>
                    <span className="font-bold text-blue-400">{k.rpmUsed} / {k.rpmLimit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888] block">TPM Used</span>
                    <span className="font-bold text-[#EDEDED]">{formatNumber(k.tpmUsed)} / {formatNumber(k.tpmLimit)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#888] block">RPD (Daily)</span>
                    <span className={cn("font-bold", k.rpdUsed >= k.rpdLimit ? "text-rose-400" : "text-emerald-400")}>
                      {k.rpdUsed} / {formatNumber(k.rpdLimit)}
                    </span>
                  </div>
                </div>

                {/* 3. Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {k.status === "COOLDOWN" ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      1-2m Cooldown (Switched)
                    </span>
                  ) : k.status === "DAILY_EXHAUSTED" || k.rpdUsed >= k.rpdLimit ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Power className="w-3.5 h-3.5" />
                      Daily Limit (Auto Off)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Healthy & Active
                    </span>
                  )}
                </div>

                {/* 4. Tier Switcher & Actions */}
                <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                  {/* Quick Role Switcher */}
                  <select
                    value={k.role}
                    onChange={(e) => handleSwitchRole(k.id, e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#111] border border-[#333] text-[11px] font-mono text-[#EDEDED] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="PRIMARY">Make Primary</option>
                    <option value="SECONDARY">Make Secondary</option>
                    <option value="BACKUP">Make Backup</option>
                  </select>

                  {/* Edit Quota / Match Console Button */}
                  <button
                    onClick={() => openEditModal(k)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Edit Quota & Match Real Console"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteKeyItem(k)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[#555] hover:text-rose-400 transition-colors cursor-pointer"
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

      {/* Edit Quota & Match Live Console Modal */}
      {editingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#0E0E0E] p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#EDEDED] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <span>Edit Key & Match Live Console Quota</span>
                </h3>
                <span className="text-xs font-mono text-[#888] mt-0.5 block">{editingKey.maskedKey}</span>
              </div>
              <button
                onClick={() => setEditingKey(null)}
                className="p-1.5 rounded-lg text-[#666] hover:text-[#EDEDED] hover:bg-[#222] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#888] block mb-1">Key Label Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#888] block mb-1">Failover Role Tier</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500 font-bold font-mono"
                  >
                    <option value="PRIMARY">PRIMARY (1st Priority)</option>
                    <option value="SECONDARY">SECONDARY (2-Min Auto-Switch)</option>
                    <option value="BACKUP">BACKUP (Emergency)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#888] block mb-1">Assigned AI Model</label>
                <select
                  value={editForm.model}
                  onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
                >
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Text-out)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Text-out)</option>
                  <option value="gemma-4-31b">Gemma 4 31B (Other models)</option>
                </select>
              </div>

              {/* Live Quota Matching Fields */}
              <div className="p-4 rounded-xl bg-[#111]/80 border border-[#222] space-y-3">
                <span className="text-xs font-semibold text-amber-400 block">Match Google AI Studio Live Usage:</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#888] block mb-1">RPM Used</label>
                    <input
                      type="number"
                      value={editForm.rpmUsed}
                      onChange={(e) => setEditForm({ ...editForm, rpmUsed: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#333] text-xs text-blue-400 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#888] block mb-1">RPM Limit</label>
                    <input
                      type="number"
                      value={editForm.rpmLimit}
                      onChange={(e) => setEditForm({ ...editForm, rpmLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#888] block mb-1">TPM Used</label>
                    <input
                      type="number"
                      value={editForm.tpmUsed}
                      onChange={(e) => setEditForm({ ...editForm, tpmUsed: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#888] block mb-1">TPM Limit</label>
                    <input
                      type="number"
                      value={editForm.tpmLimit}
                      onChange={(e) => setEditForm({ ...editForm, tpmLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#888] block mb-1">RPD (Daily Used)</label>
                    <input
                      type="number"
                      value={editForm.rpdUsed}
                      onChange={(e) => setEditForm({ ...editForm, rpdUsed: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#333] text-xs text-emerald-400 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#888] block mb-1">RPD Limit</label>
                    <input
                      type="number"
                      value={editForm.rpdLimit}
                      onChange={(e) => setEditForm({ ...editForm, rpdLimit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[#181818] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="px-4 py-2 rounded-xl bg-[#181818] text-xs text-[#888] hover:text-[#EDEDED] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Quota & Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Key Modal */}
      <ConfirmModal
        isOpen={!!deleteKeyItem}
        onClose={() => setDeleteKeyItem(null)}
        onConfirm={confirmRemoveKey}
        title="Remove API Key"
        description={`Are you sure you want to remove API Key [${deleteKeyItem?.maskedKey}] from the rotation pool?`}
        confirmText="Remove Key"
        variant="danger"
      />
    </div>
  );
}
