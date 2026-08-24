import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Mogent.ai",
  description: "Mogent Platform Terms of Service and Merchant Agreement.",
};

export default function TermsOfServicePage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5" />
            <span>Merchant Agreement</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#EDEDED]">Terms of Service</h1>
          <p className="text-xs text-[#888]">Last Updated: August 24, 2026</p>
        </div>

        <div className="space-y-6 text-xs text-[#AAA] leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">1. Acceptance of Terms</h2>
            <p>
              By accessing or creating an account on Mogent.ai, you agree to comply with these Terms of Service, all applicable laws and regulations, and Meta's Platform Terms and Commercial Terms. If you do not agree with any of these terms, you are prohibited from using the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">2. Service Description & AI Operation</h2>
            <p>
              Mogent provides autonomous AI conversational agents for Facebook Messenger and e-commerce stores. While our AI models (Gemini 2.0) are highly accurate and fine-tuned on your knowledge base, merchants remain responsible for monitoring AI interactions, verifying pricing, and fulfilling accepted customer orders.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">3. Meta Platform & Facebook Page Permissions</h2>
            <p>
              You represent and warrant that you own or have authorized management access to all Facebook Pages connected to your Mogent workspace. You agree not to use the platform to send unsolicited spam, illegal goods, or violate Meta's Community Standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">4. Subscriptions & Billing</h2>
            <p>
              Mogent offers monthly and annual subscription tiers (Starter, Pro, Enterprise). Payments submitted via bKash, Nagad, or Rocket are verified by Super Admin before plan activation. Subscriptions are billed per 30-day billing cycle.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#EDEDED]">5. Termination</h2>
            <p>
              You may terminate your workspace and disconnect your Facebook Pages at any time from your settings panel. Mogent reserves the right to suspend or terminate accounts violating spam or abusive messaging policies.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
