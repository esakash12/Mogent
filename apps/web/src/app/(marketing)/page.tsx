"use client";

import Link from "next/link";
import { ArrowRight, Bot, Zap, MessageSquare, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] flex flex-col selection:bg-white/20 font-sans">
      {/* Navbar */}
      <header className="h-16 border-b border-[#222] bg-[#0A0A0A]/90 backdrop-blur-md px-4 md:px-10 flex items-center justify-between z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Mogent</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#888]">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="#docs" className="hover:text-white transition-colors">Documentation</Link>
        </nav>
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/login" className="hidden sm:block text-[13px] font-medium text-[#888] hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/register" className="px-3 md:px-4 py-2 rounded-md bg-white text-black text-[12px] md:text-[13px] font-medium hover:bg-[#EDEDED] transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-start text-center px-4 pt-16 md:pt-32 pb-16 md:pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111] border border-[#333] text-[11px] md:text-[12px] font-medium text-[#888] mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 hover:border-[#555] transition-colors cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Mogent v2.0 is now live
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-[80px] font-bold tracking-tighter max-w-5xl leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          Automate your customer support with superhuman AI.
        </h1>
        
        <p className="text-[#888] text-base md:text-xl max-w-2xl mb-8 md:mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          Connect your Facebook pages and let Mogent AI Engine handle 95% of your customer inquiries instantly. Zero wait times. Perfect responses.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto justify-center px-8 py-3.5 rounded-lg bg-white text-black font-semibold text-[15px] hover:bg-[#EDEDED] transition-colors flex items-center gap-2">
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto justify-center px-8 py-3.5 rounded-lg bg-[#111] text-[#EDEDED] border border-[#333] font-semibold text-[15px] hover:bg-[#222] transition-colors flex items-center">
            Sign In
          </Link>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-16 md:mt-20 w-full max-w-[1000px] rounded-xl md:rounded-2xl border border-[#333] bg-[#0A0A0A] p-1.5 md:p-2 shadow-2xl relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 hidden sm:block">
          <div className="rounded-lg md:rounded-xl overflow-hidden border border-[#222] bg-[#050505] relative flex h-[350px] md:h-[500px] shadow-2xl">
            {/* Sidebar */}
            <div className="hidden md:flex w-[240px] border-r border-[#222] flex-col p-4 bg-[#0A0A0A] shrink-0">
              <div className="flex items-center gap-2 mb-8 px-2 mt-2">
                 <div className="w-6 h-6 rounded bg-[#EDEDED] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-black" />
                 </div>
                 <div className="h-4 w-24 bg-[#333] rounded-sm" />
              </div>
              <div className="space-y-1">
                 <div className="h-9 w-full bg-[#222] rounded-md px-3 flex items-center gap-3">
                   <div className="w-4 h-4 rounded-sm bg-[#555]" />
                   <div className="h-3 w-16 bg-[#555] rounded-sm" />
                 </div>
                 <div className="h-9 w-full rounded-md px-3 flex items-center gap-3 opacity-50">
                   <div className="w-4 h-4 rounded-sm bg-[#555]" />
                   <div className="h-3 w-20 bg-[#555] rounded-sm" />
                 </div>
                 <div className="h-9 w-full rounded-md px-3 flex items-center gap-3 opacity-50">
                   <div className="w-4 h-4 rounded-sm bg-[#555]" />
                   <div className="h-3 w-24 bg-[#555] rounded-sm" />
                 </div>
              </div>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-[#050505] p-8">
              {/* Top Bar Mockup */}
              <div className="flex justify-between items-center mb-8">
                <div className="h-6 w-48 bg-[#222] rounded-sm" />
                <div className="h-8 w-24 bg-[#222] rounded-md" />
              </div>
              
              {/* 4 Metrics Mockup */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 bg-[#111] rounded-xl border border-[#222] p-4 flex flex-col justify-between">
                    <div className="flex justify-between">
                       <div className="h-3 w-16 bg-[#333] rounded-sm" />
                       <div className="w-4 h-4 rounded-sm bg-[#333]" />
                    </div>
                    <div className="h-6 w-12 bg-[#EDEDED] rounded-sm" />
                  </div>
                ))}
              </div>

              {/* Chart/Table Mockup */}
              <div className="flex-1 bg-[#111] rounded-xl border border-[#222] p-6 flex flex-col">
                 <div className="h-4 w-32 bg-[#333] rounded-sm mb-6" />
                 <div className="flex-1 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 w-full bg-[#1A1A1A] rounded-lg border border-[#222] flex items-center px-4 gap-4">
                        <div className="w-6 h-6 rounded-full bg-[#333]" />
                        <div className="h-3 w-24 bg-[#444] rounded-sm" />
                        <div className="h-3 w-32 bg-[#333] rounded-sm ml-auto" />
                        <div className="h-5 w-16 bg-[#222] rounded-md" />
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* Fading overlay at the bottom so it blends into the landing page */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 md:px-10 border-t border-[#222] bg-[#0A0A0A] relative overflow-hidden">
        {/* Glow behind features */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-[#EDEDED]">Everything you need to scale</h2>
            <p className="text-[#888] text-lg max-w-2xl mx-auto">
              Built for businesses that want to provide instant, accurate, and human-like customer support 24/7.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-[#222] hover:border-[#444] transition-colors shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center mb-6 border border-amber-500/20">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#EDEDED]">Contextual AI Chat</h3>
              <p className="text-[#888] leading-relaxed">
                Mogent AI Engine understands context across multiple messages, providing accurate and natural responses in Bengali or English.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#111] border border-[#222]">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Lead Capture</h3>
              <p className="text-[#888] leading-relaxed">
                Automatically extracts phone numbers, addresses, and order details from chats and organizes them in your CRM.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#111] border border-[#222]">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Human Takeover</h3>
              <p className="text-[#888] leading-relaxed">
                Detects negative sentiment or complex queries and seamlessly pauses the AI to let your human agents take over.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 md:px-10 border-t border-[#222] bg-[#0A0A0A]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-[#888] text-lg max-w-2xl mx-auto">
              Start for free, upgrade when you need more power.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {/* Free Tier */}
            <div className="p-8 rounded-3xl bg-[#111] border border-[#222] flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Starter</h3>
              <p className="text-[#888] text-sm mb-6">Perfect for small businesses getting started with AI.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">Free</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-[#EDEDED]">
                  <CheckCircle2 className="w-4 h-4 text-[#888]" />
                  Up to 1,000 messages/month
                </li>
                <li className="flex items-center gap-3 text-sm text-[#EDEDED]">
                  <CheckCircle2 className="w-4 h-4 text-[#888]" />
                  1 Facebook Page
                </li>
                <li className="flex items-center gap-3 text-sm text-[#EDEDED]">
                  <CheckCircle2 className="w-4 h-4 text-[#888]" />
                  Basic Knowledge Base
                </li>
              </ul>
              <Link href="/dashboard" className="w-full py-3 rounded-lg bg-[#222] hover:bg-[#333] text-white text-center font-medium transition-colors">
                Get Started
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-3xl bg-white text-black border border-white flex flex-col relative">
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="bg-[#111] text-white text-xs font-semibold px-3 py-1 rounded-full border border-[#333]">Most Popular</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Professional</h3>
              <p className="text-[#555] text-sm mb-6">For growing businesses with high message volume.</p>
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold">৳ 2,000</span>
                <span className="text-[#555]">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Unlimited Messages
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Unlimited Facebook Pages
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Advanced CRM & Analytics
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Telegram Escalation Alerts
                </li>
              </ul>
              <Link href="/dashboard" className="w-full py-3 rounded-lg bg-black hover:bg-[#222] text-white text-center font-medium transition-colors">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-[#222] bg-[#0A0A0A] text-center">
        <p className="text-[#555] text-sm">
          &copy; {new Date().getFullYear()} Mogent Inc. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
