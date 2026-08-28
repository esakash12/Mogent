"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Users,
  ShieldAlert,
  Save,
  CheckCircle2,
  Lock,
  Trash2,
  Loader2,
  Mail,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchCurrentUser,
  updateUserProfile,
  fetchTeamMembers,
  inviteTeamMember,
  deleteTeamMember,
} from "@/lib/api";
import { ConfirmModal } from "@/components/confirm-modal";

export default function SettingsSectorPage() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "TEAM" | "DANGER">("PROFILE");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Team
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [isInviting, setIsInviting] = useState(false);

  // Delete State
  const [deleteMemberItem, setDeleteMemberItem] = useState<any | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchCurrentUser(), fetchTeamMembers()]).then(([userData, members]) => {
      if (userData?.user) {
        setName(userData.user.name || "");
        setEmail(userData.user.email || "");
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
    if (res?.success) {
      setSaved(true);
      setPassword("");
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    const res = await inviteTeamMember({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
    });
    setIsInviting(false);

    if (res?.success && res.data) {
      setTeamMembers((prev) => [...prev, res.data]);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
    }
  };

  const confirmDeleteMember = async () => {
    if (!deleteMemberItem) return;
    await deleteTeamMember(deleteMemberItem.id);
    setTeamMembers(teamMembers.filter((m) => m.id !== deleteMemberItem.id));
    setDeleteMemberItem(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Description */}
      <div className="space-y-1">
        <h2 className="text-base font-bold text-[#111827]">Account & Workspace Settings</h2>
        <p className="text-xs text-[#6B7280]">
          Manage your personal profile, operator seats, and security credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm w-fit">
        {[
          { id: "PROFILE", label: "Profile", icon: User },
          { id: "TEAM", label: "Team Members", icon: Users },
          { id: "DANGER", label: "Danger Zone", icon: ShieldAlert },
        ].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                active
                  ? "bg-[#F59E0B] text-black font-bold shadow-sm"
                  : "text-[#6B7280] hover:text-[#111827]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PROFILE TAB */}
      {activeTab === "PROFILE" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-[#111827]">User Profile</h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-[#6B7280] bg-[#F9FAFB] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">New Password (optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep existing password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Save Profile
              </button>
              {saved && (
                <span className="text-xs text-[#059669] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Changes saved!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 2. TEAM MEMBERS TAB */}
      {activeTab === "TEAM" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Team Operators & Seats</h3>
              <p className="text-xs text-[#6B7280]">Invite support staff to respond when human takeover is triggered.</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="divide-y divide-[#F3F4F6]">
            {teamMembers.map((m) => (
              <div key={m.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111827]">{m.user?.name || m.name || "Operator"}</p>
                  <p className="text-[11px] text-[#6B7280]">{m.user?.email || m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#374151] font-semibold text-[10px]">
                    {m.role || "AGENT"}
                  </span>
                  <button
                    onClick={() => setDeleteMemberItem(m)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DANGER ZONE */}
      {activeTab === "DANGER" && (
        <div className="bg-white rounded-2xl border border-[#FECACA] p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#DC2626]">Danger Zone</h3>
          <p className="text-xs text-[#6B7280]">
            Permanently delete your workspace data, chat transcripts, and catalog indexes.
          </p>
          <button
            onClick={() => setShowDeleteAccountModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] font-bold text-xs transition-all cursor-pointer"
          >
            Delete Workspace Data
          </button>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-[#111827]">Invite Team Operator</h3>
            <form onSubmit={handleInviteMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arif Rahman"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="operator@mybrand.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-[#4B5563]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] text-black font-bold text-xs disabled:opacity-50"
                >
                  {isInviting ? "Inviting..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteMemberItem)}
        onClose={() => setDeleteMemberItem(null)}
        onConfirm={confirmDeleteMember}
        title="Remove Team Member"
        description={`Are you sure you want to remove "${deleteMemberItem?.user?.name || deleteMemberItem?.name || deleteMemberItem?.email}"?`}
        confirmText="Remove Member"
        variant="danger"
      />

      {/* Delete Workspace Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={() => setShowDeleteAccountModal(false)}
        title="Delete Workspace Account"
        description="Are you ABSOLUTELY sure? This action cannot be undone. Please contact support@mogent.ai to complete deletion."
        confirmText="Confirm"
        variant="danger"
      />
    </div>
  );
}
