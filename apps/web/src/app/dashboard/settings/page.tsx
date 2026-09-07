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
  MessageCircle,
  Check,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchCurrentUser,
  updateUserProfile,
  fetchTeamMembers,
  inviteTeamMember,
  deleteTeamMember,
  fetchWhatsAppConfig,
  saveWhatsAppConfig,
  testWhatsAppConnection,
} from "@/lib/api";
import { toast } from "@/lib/toast";
import { ConfirmModal } from "@/components/confirm-modal";

export default function SettingsSectorPage() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "TEAM" | "WHATSAPP" | "DANGER">("PROFILE");
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

  // WhatsApp Form State
  const [whatsAppConfig, setWhatsAppConfig] = useState({
    phoneNumber: "",
    phoneNumberId: "",
    wabaId: "",
    accessToken: "",
    autoReplyEnabled: true,
  });
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [testPhoneInput, setTestPhoneInput] = useState("");
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Delete State
  const [deleteMemberItem, setDeleteMemberItem] = useState<any | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchCurrentUser(),
      fetchTeamMembers(),
      fetchWhatsAppConfig(),
    ]).then(([userData, members, waData]) => {
      if (userData?.user) {
        setName(userData.user.name || "");
        setEmail(userData.user.email || "");
      }
      if (Array.isArray(members)) {
        setTeamMembers(members);
      }
      if (waData?.success && waData.data) {
        setWhatsAppConfig({
          phoneNumber: waData.data.phoneNumber || "",
          phoneNumberId: waData.data.phoneNumberId || "",
          wabaId: waData.data.wabaId || "",
          accessToken: waData.data.accessToken || "",
          autoReplyEnabled: waData.data.autoReplyEnabled ?? true,
        });
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

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    try {
      const res = await saveWhatsAppConfig(whatsAppConfig);
      if (res?.success) {
        toast.success("WhatsApp কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে! 🎉");
      } else {
        toast.error("সংরক্ষণ করা যায়নি", { description: res?.error || "আবার চেষ্টা করুন।" });
      }
    } catch {
      toast.error("সংরক্ষণ করতে সমস্যা হয়েছে");
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhoneInput.trim()) {
      toast.error("টেস্ট ফোন নম্বর আবশ্যক");
      return;
    }
    setIsTestingWhatsApp(true);
    try {
      const res = await testWhatsAppConnection({ testPhone: testPhoneInput.trim() });
      if (res?.success) {
        toast.success("টেস্ট মেসেজ সফলভাবে পাঠানো হয়েছে! 💬", { description: res.message });
      } else {
        toast.error("টেস্ট মেসেজ পাঠানো যায়নি", { description: res?.error || "ক্রেডেনশিয়াল চেক করুন।" });
      }
    } catch {
      toast.error("টেস্ট রিকোয়েস্টে সমস্যা হয়েছে");
    } finally {
      setIsTestingWhatsApp(false);
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
        <h2 className="text-base font-bold text-[#111827]">Account & Integration Settings</h2>
        <p className="text-xs text-[#6B7280]">
          Manage your personal profile, WhatsApp Cloud API credentials, and operator seats.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm w-fit flex-wrap">
        {[
          { id: "PROFILE", label: "Profile", icon: User },
          { id: "WHATSAPP", label: "WhatsApp API", icon: MessageCircle },
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
                  ? tab.id === "WHATSAPP"
                    ? "bg-[#25D366] text-white font-bold shadow-sm"
                    : "bg-[#F59E0B] text-black font-bold shadow-sm"
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

      {/* 2. WHATSAPP API TAB */}
      {activeTab === "WHATSAPP" && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center font-bold shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">WhatsApp Cloud API Credentials</h3>
                <p className="text-xs text-[#6B7280]">আপনার Meta WhatsApp Business অ্যাকাউন্ট Mogent-এ যুক্ত করুন।</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                {whatsAppConfig.phoneNumberId ? "সক্রিয় (Active)" : "নট কনফিগার্ড"}
              </span>
            </div>
          </div>

          {/* Webhook Quick Info Banner */}
          <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2">
            <h4 className="text-xs font-bold text-[#111827]">Meta Developer Webhook Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-[#6B7280]">Callback URL</label>
                <div className="flex items-center gap-1.5 bg-white border border-[#CBD5E1] rounded-lg p-1.5 mt-0.5">
                  <input
                    type="text"
                    readOnly
                    value="https://api.mogent.tech/api/webhook/whatsapp"
                    className="bg-transparent text-xs text-[#111827] font-mono flex-1 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("https://api.mogent.tech/api/webhook/whatsapp");
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="p-1 hover:bg-[#F3F4F6] text-[#6B7280] rounded cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#6B7280]">Verify Token</label>
                <div className="flex items-center gap-1.5 bg-white border border-[#CBD5E1] rounded-lg p-1.5 mt-0.5">
                  <input
                    type="text"
                    readOnly
                    value="mogent_fb_verify_token_secure"
                    className="bg-transparent text-xs text-[#111827] font-mono flex-1 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("mogent_fb_verify_token_secure");
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="p-1 hover:bg-[#F3F4F6] text-[#6B7280] rounded cursor-pointer"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Credentials Form */}
          <form onSubmit={handleSaveWhatsApp} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-[#374151] mb-1">
                WhatsApp Business ফোন নম্বর *
              </label>
              <input
                type="text"
                placeholder="017XXXXXXXX বা 88017XXXXXXXX"
                value={whatsAppConfig.phoneNumber}
                onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, phoneNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#111827] focus:outline-none focus:border-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#374151] mb-1">
                Phone Number ID (Meta Developer Dashboard থেকে) *
              </label>
              <input
                type="text"
                placeholder="যেমনঃ 103948572019485"
                value={whatsAppConfig.phoneNumberId}
                onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, phoneNumberId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#374151] mb-1">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                placeholder="যেমনঃ 984729104820194"
                value={whatsAppConfig.wabaId}
                onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, wabaId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#374151] mb-1">
                Permanent Access Token / System User Token *
              </label>
              <textarea
                rows={3}
                placeholder="EAAB..."
                value={whatsAppConfig.accessToken}
                onChange={(e) => setWhatsAppConfig({ ...whatsAppConfig, accessToken: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#111827] font-mono focus:outline-none focus:border-[#25D366]"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
              <div>
                <p className="text-xs font-bold text-[#111827]">WhatsApp এআই অটো-রিপ্লাই</p>
                <p className="text-[10px] text-[#6B7280]">মেসেজ আসলে AI স্বয়ংক্রিয়ভাবে উত্তর দেবে।</p>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppConfig({ ...whatsAppConfig, autoReplyEnabled: !whatsAppConfig.autoReplyEnabled })}
                className={cn(
                  "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                  whatsAppConfig.autoReplyEnabled ? "bg-[#25D366]" : "bg-[#D1D5DB]"
                )}
              >
                <div
                  className={cn(
                    "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                    whatsAppConfig.autoReplyEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingWhatsApp}
                className="px-6 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingWhatsApp ? "সংরক্ষণ হচ্ছে..." : "WhatsApp ক্রেডেনশিয়াল সংরক্ষণ করুন"}</span>
              </button>
            </div>
          </form>

          {/* Test WhatsApp Message Box */}
          <div className="p-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] space-y-3 max-w-xl">
            <h4 className="text-xs font-bold text-[#166534]">টেস্ট মেসেজ পাঠান (Test Connection)</h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="01XXXXXXXXX বা 8801XXXXXXXXX"
                value={testPhoneInput}
                onChange={(e) => setTestPhoneInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#CBD5E1] text-xs font-mono text-[#111827] focus:outline-none focus:border-[#25D366]"
              />
              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={isTestingWhatsApp}
                className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#1F2937] text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isTestingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />}
                <span>টেস্ট পাঠান</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEAM MEMBERS TAB */}
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
