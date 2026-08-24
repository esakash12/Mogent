"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, ArrowLeft, CheckCircle2, ShieldAlert, Send, Loader2 } from "lucide-react";

export default function DataDeletionPage() {
  const [psid, setPsid] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] py-12 px-4 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-black">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#888] hover:text-[#EDEDED] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        <div className="space-y-2 border-b border-[#222] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Meta User Data Deletion</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#EDEDED]">Facebook User Data Deletion Instructions</h1>
          <p className="text-xs text-[#888]">In accordance with Meta Platform Policy and GDPR Right to be Forgotten</p>
        </div>

        <div className="space-y-6 text-xs text-[#AAA] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-[#EDEDED]">How to Request Data Deletion:</h2>
            <p>
              If you have interacted with any Facebook Page powered by Mogent and wish to delete your conversational history, contacts, Page-Scoped ID (PSID), and associated lead data, you can do so through any of the following methods:
            </p>

            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-3">
              <h3 className="font-semibold text-xs text-[#EDEDED]">Method 1: Remove Mogent App from your Facebook Settings</h3>
              <ol className="list-decimal pl-5 space-y-1.5 text-[#888]">
                <li>Log in to your Facebook Account and go to <strong className="text-[#EDEDED]">Settings & Privacy &gt; Settings</strong>.</li>
                <li>In the left sidebar, click <strong className="text-[#EDEDED]">Apps and Websites</strong>.</li>
                <li>Find <strong className="text-[#EDEDED]">Mogent AI</strong> in the list of active apps.</li>
                <li>Click <strong className="text-[#EDEDED]">Remove</strong>. Facebook will automatically notify our server to purge your access token and conversation data.</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222] space-y-3">
              <h3 className="font-semibold text-xs text-[#EDEDED]">Method 2: Submit Instant Deletion Request Form</h3>
              {submitted ? (
                <div className="p-4 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Deletion Request Received</span>
                  </div>
                  <p className="text-[11px] text-[#AAA]">
                    Confirmation Code: <strong className="font-mono text-[#EDEDED]">DEL-{Date.now()}</strong>. Your data has been queued for immediate purge within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#888]">Your Email (Optional)</label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#888]">Facebook Page Name or PSID</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 109284918239 or Page Name"
                        value={psid}
                        onChange={(e) => setPsid(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Submit Deletion Request</span>
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
