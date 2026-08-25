import Link from "next/link";
import { Shield, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Mogent.ai",
  description: "Mogent AI Customer Engine Privacy Policy, Meta Data Handling & Security Guidelines.",
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>Meta & GDPR Compliant</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#EDEDED]">Privacy Policy</h1>
          <p className="text-xs text-[#888]">Last Updated: August 24, 2026</p>
        </div>

        <div className="space-y-6 text-xs text-[#AAA] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">1. Overview & Purpose</h2>
            <p>
              Mogent.ai ("Mogent", "we", "our", or "us") provides an autonomous AI customer support and sales automation engine for merchants and businesses. This Privacy Policy explains how we collect, use, process, encrypt, and safeguard information when you connect your Facebook Pages, Messenger accounts, and store catalogs to our platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">2. Information We Collect from Meta (Facebook)</h2>
            <p>When you authorize Mogent via Facebook OAuth or manual token connection, we may access:</p>
            <ul className="list-disc pl-5 space-y-1 text-[#888]">
              <li><strong className="text-[#EDEDED]">Page Metadata:</strong> Page Name, Page ID, Category, and Page Access Tokens.</li>
              <li><strong className="text-[#EDEDED]">Messenger Webhooks:</strong> Incoming customer messages, message timestamps, sender PSIDs (Page-Scoped IDs), and customer inquiries.</li>
              <li><strong className="text-[#EDEDED]">Customer Leads:</strong> Customer name, delivery address, and verified phone numbers provided willingly by customers inside chat conversations to complete orders.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">3. AES-256 Data Encryption & Storage</h2>
            <p>
              All Facebook Page Access Tokens and sensitive credentials are encrypted at rest using industry-standard <strong className="text-amber-500">AES-256-GCM encryption</strong>. Customer data and order histories are stored in dedicated, isolated multi-tenant databases and are never shared or sold to third-party advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">4. Mogent AI Engine Usage</h2>
            <p>
              Customer queries are processed in real-time through Mogent's secure AI architecture exclusively to generate context-aware replies and catalog recommendations for your business. Chat data is processed in stateless memory and is not used to train public AI models without merchant consent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">5. Data Deletion & User Rights</h2>
            <p>
              Under Meta Platform Terms and GDPR, you or your customers have the right to request deletion of all captured conversation history, contacts, and page tokens at any time. To request data deletion, please visit our <Link href="/data-deletion" className="text-amber-500 underline hover:text-amber-400">Data Deletion Instructions</Link> or email us directly at <strong className="text-[#EDEDED]">support@mogent.tech</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">6. Contact Us</h2>
            <p>
              For security inquiries, enterprise data privacy questions, or data protection officer contact:
            </p>
            <div className="p-4 rounded-xl bg-[#111] border border-[#222] font-mono text-[11px] text-[#EDEDED]">
              Mogent Platform Security & Data Governance<br />
              Email: support@mogent.tech | privacy@mogent.tech<br />
              Web: https://mogent.tech
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
