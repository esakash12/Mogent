"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  CreditCard,
  Users,
  ShieldAlert,
  Save,
  CheckCircle2,
  Lock,
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  Mail,
  Plus,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchCurrentUser,
  updateUserProfile,
  fetchBillingStatus,
  fetchTeamMembers,
  inviteTeamMember,
  deleteTeamMember
} from "@/lib/api";

export default function SettingsSectorPage() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "BILLING" | "TEAM" | "DANGER">("PROFILE");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("bn");
  const [timezone] = useState("Asia/Dhaka (GMT+6)");

  // Billing
  const [billingData, setBillingData] = useState<any>(null);

  // Team
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchCurrentUser(),
      fetchBillingStatus(),
      fetchTeamMembers()
    ]).then(([userData, billData, members]) => {
      if (userData?.user) {
        setName(userData.user.name || "");
        setEmail(userData.user.email || "");
      }
      if (billData) {
        setBillingData(billData);
      }
      if (Array.isArray(members)) {
        setTeamMembers(members);
      }
      setLoading(false);
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateUserProfile({ name, password: password || undefined });
    if (res.success) {
      setSaved(true);
      setPassword("");
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert("Failed to update profile: " + (res.error || "Unknown error"));
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    const res = await inviteTeamMember({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole
    });
    setIsInviting(false);

    if (res.success && res.data) {
      setTeamMembers((prev) => [...prev, res.data]);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
    } else {
      alert(res.error || "Failed to add team member");
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member from the workspace?")) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    await deleteTeamMember(id);
  };

  const handleExportData = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : null;
    const wsId = typeof window !== "undefined" ? localStorage.getItem("mogent_active_workspace") : null;
    const url = `/api/auth/export-data`;
    
    // Fetch directly and download
    fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(wsId ? { "x-workspace-id": wsId } : {}),
      }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `mogent_crm_export_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => alert("Export failed: " + err.message));
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs text-[#888]">Loading workspace settings...</span>
      </div>
    );
  }

  const activePlan = billingData?.subscription?.plan || "FREE";
  const messageUsage = billingData?.subscription?.usageCount || 0;
  const messageQuota = billingData?.subscription?.monthlyLimit || 500;
  const usagePercent = Math.min(100, Math.round((messageUsage / (messageQuota || 1)) * 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Sector Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Workspace Settings
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Manage your personal profile, subscription billing, team access, and data security.
          </p>
        </div>

        {/* The Sector Top Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
          <button
            onClick={() => setActiveTab("PROFILE")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "PROFILE"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveTab("BILLING")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "BILLING"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Billing & Plan</span>
          </button>

          <button
            onClick={() => setActiveTab("TEAM")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "TEAM"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team ({teamMembers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("DANGER")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
              activeTab === "DANGER"
                ? "bg-red-500 text-white shadow-sm font-bold"
                : "text-[#888] hover:text-red-400"
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Security & Data</span>
          </button>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center gap-2.5 text-xs text-[#10B981]">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile configuration saved successfully!</span>
        </div>
      )}

      {/* TAB 1: PROFILE */}
      {activeTab === "PROFILE" && (
        <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
            <h3 className="font-semibold text-sm text-[#EDEDED] border-b border-[#222] pb-3">Personal Details</h3>
            
            <div>
              <label className="block text-xs text-[#888] mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#888] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1.5">Change Password (leave blank to keep current)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Preferred Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none"
                >
                  <option value="bn">Bengali (বাংলা)</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  disabled
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#888] font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-[#EDEDED] transition-colors cursor-pointer"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: BILLING & PLAN */}
      {activeTab === "BILLING" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6 max-w-3xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                ACTIVE PLAN
              </span>
              <h3 className="text-xl font-bold text-[#EDEDED] mt-2">
                {activePlan === "FREE" ? "Free Trial Plan" : activePlan === "PRO" ? "Pro Plan (৳ 2,000 / mo)" : "Enterprise Tier"}
              </h3>
              <p className="text-xs text-[#888]">
                Status: {billingData?.subscription?.status || "Active"} • Reset Cycle: Monthly
              </p>
            </div>
            <a
              href="/dashboard/billing"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors cursor-pointer"
            >
              Upgrade Plan
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
              <span className="text-xs text-[#888]">AI Messages Quota</span>
              <p className="text-lg font-bold text-[#EDEDED] mt-1">
                {messageUsage.toLocaleString()} / {messageQuota.toLocaleString()}
              </p>
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${usagePercent}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
              <span className="text-xs text-[#888]">Connected Pages</span>
              <p className="text-lg font-bold text-[#EDEDED] mt-1">
                {billingData?.pagesCount ?? 0} Pages
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
              <span className="text-xs text-[#888]">AI Model</span>
              <p className="text-lg font-bold text-[#10B981] mt-1">Mogent Engine Ultra</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM MEMBERS */}
      {activeTab === "TEAM" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-5 max-w-3xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Workspace Members</h3>
              <p className="text-xs text-[#888]">Invite colleagues to manage chats and review CRM orders.</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-[#EDEDED] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-[#222]">
            {teamMembers.map((member) => (
              <div key={member.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white uppercase">
                    {member.name?.[0] || member.email[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-[#EDEDED]">{member.name}</p>
                    <p className="text-[11px] text-[#888] font-mono">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded border font-semibold",
                    member.role === "OWNER"
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : member.role === "ADMIN"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-[#222] text-[#888] border-[#333]"
                  )}>
                    {member.role}
                  </span>
                  {member.role !== "OWNER" && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-[#666] hover:text-red-400 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#111] border border-[#222] rounded-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#222] pb-3">
                  <h3 className="font-bold text-sm text-[#EDEDED]">Invite Team Member</h3>
                  <button onClick={() => setShowInviteModal(false)} className="text-[#888] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleInviteMember} className="space-y-3">
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Colleague Name</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="e.g. Rahim Ahmed"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#888] mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#888] mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#222] text-xs text-[#EDEDED] focus:outline-none"
                    >
                      <option value="AGENT">Support Agent (Can manage inbox and chats)</option>
                      <option value="ADMIN">Admin (Full workspace configuration)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[#222]">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2 rounded-lg bg-[#222] text-xs font-semibold text-[#888]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="px-5 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-[#EDEDED] disabled:opacity-50"
                    >
                      {isInviting ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DANGER ZONE & DATA */}
      {activeTab === "DANGER" && (
        <div className="p-6 rounded-2xl border border-red-500/30 bg-[#0A0A0A] space-y-6 max-w-3xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pb-3 border-b border-red-500/20 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-sm">Danger Zone & Privacy Controls</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div>
                <p className="font-semibold text-[#EDEDED]">Export All Workspace Data</p>
                <p className="text-[#888] mt-0.5">Download a complete CSV backup of all captured leads, orders, and chats.</p>
              </div>
              <button
                onClick={handleExportData}
                className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-[#EDEDED] font-semibold flex items-center gap-1.5 w-fit cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div>
                <p className="font-semibold text-red-400">Delete Workspace & Reset Data</p>
                <p className="text-[#888] mt-0.5">Permanently erase all AI training knowledge, customer contacts, and token keys.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm("Are you ABSOLUTELY sure? This action cannot be undone and will erase your workspace permanently.")) {
                    alert("Please contact enterprise support at support@mogent.tech to complete workspace deletion.");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 w-fit cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
