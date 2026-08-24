"use client";

import { useState } from "react";
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
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsSectorPage() {
  const [activeTab, setActiveTab] = useState<"PROFILE" | "BILLING" | "TEAM" | "DANGER">("PROFILE");
  const [saved, setSaved] = useState(false);

  // Profile Form
  const [firstName, setFirstName] = useState("Shohag");
  const [lastName, setLastName] = useState("Admin");
  const [email, setEmail] = useState("shohag.tech@gmail.com");
  const [language, setLanguage] = useState("bn");
  const [timezone, setTimezone] = useState("Asia/Dhaka (GMT+6)");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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

        {/* The Sector Top Navigation Tabs (No Scrollbar, perfect fit) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
          <button
            onClick={() => setActiveTab("PROFILE")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
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
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
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
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "TEAM"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team (1/5)</span>
          </button>

          <button
            onClick={() => setActiveTab("DANGER")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
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
        <form onSubmit={handleSave} className="space-y-5 animate-in fade-in duration-200">
          <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-4">
            <h3 className="font-semibold text-sm text-[#EDEDED] border-b border-[#222] pb-3">Personal Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#888] mb-1.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#111] border border-[#222] text-xs text-[#EDEDED] focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#888] mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-[#EDEDED] transition-colors"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: BILLING & PLAN */}
      {activeTab === "BILLING" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                ACTIVE PLAN
              </span>
              <h3 className="text-xl font-bold text-[#EDEDED] mt-2">Professional SaaS Tier</h3>
              <p className="text-xs text-[#888]">৳ 2,000 / month • Auto-renews on 1st of next month</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-semibold text-[#EDEDED]">
              Manage Invoices
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
              <span className="text-xs text-[#888]">Messages Quota</span>
              <p className="text-lg font-bold text-[#EDEDED] mt-1">18,420 / 50,000</p>
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-500 w-[36%] rounded-full" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
              <span className="text-xs text-[#888]">Connected Pages</span>
              <p className="text-lg font-bold text-[#EDEDED] mt-1">3 / Unlimited</p>
            </div>

            <div className="p-4 rounded-xl bg-[#111] border border-[#222]">
              <span className="text-xs text-[#888]">Support SLA</span>
              <p className="text-lg font-bold text-[#10B981] mt-1">24/7 Priority</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM MEMBERS */}
      {activeTab === "TEAM" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <div>
              <h3 className="font-semibold text-sm text-[#EDEDED]">Workspace Members</h3>
              <p className="text-xs text-[#888]">Invite colleagues to manage chats and review CRM orders.</p>
            </div>
            <button className="px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-[#EDEDED]">
              + Invite Member
            </button>
          </div>

          <div className="divide-y divide-[#222]">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                  SH
                </div>
                <div>
                  <p className="font-semibold text-xs text-[#EDEDED]">Shohag (You)</p>
                  <p className="text-[11px] text-[#888] font-mono">shohag.tech@gmail.com</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222] text-[#888] border border-[#333]">
                Owner
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DANGER ZONE & DATA */}
      {activeTab === "DANGER" && (
        <div className="p-6 rounded-2xl border border-red-500/30 bg-[#0A0A0A] space-y-6 animate-in fade-in duration-200">
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
              <button className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-[#EDEDED] font-semibold flex items-center gap-1.5 w-fit">
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div>
                <p className="font-semibold text-red-400">Delete Workspace & Reset Data</p>
                <p className="text-[#888] mt-0.5">Permanently erase all AI training knowledge, customer contacts, and token keys.</p>
              </div>
              <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 w-fit">
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
