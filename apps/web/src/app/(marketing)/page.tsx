"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Zap,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Package,
  BookOpen,
  Globe,
  Sparkles,
  Smartphone,
  Facebook,
  Check,
  ChevronRight,
  ShoppingCart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#F59E0B]/20">
      {/* Navbar */}
      <header className="h-16 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md px-6 md:px-12 flex items-center justify-between z-50 sticky top-0 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-[#EAB308] flex items-center gap-1 font-serif italic">
              Mogent
              <span className="text-xs not-italic font-bold px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                AI
              </span>
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-[#475569]">
          <Link href="#features" className="hover:text-[#0F172A] transition-colors">ফিচারসমূহ</Link>
          <Link href="#how-it-works" className="hover:text-[#0F172A] transition-colors">কীভাবে কাজ করে</Link>
          <Link href="#pricing" className="hover:text-[#0F172A] transition-colors">প্রাইসিং</Link>
          <Link href="/dashboard" className="hover:text-[#0F172A] transition-colors">ড্যাশবোর্ড</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-bold text-[#475569] hover:text-[#0F172A] transition-colors px-3 py-2"
          >
            লগইন
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>ফ্রি শুরু করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-start text-center px-4 pt-16 md:pt-24 pb-16 max-w-5xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFDF5] border border-[#FDE68A] text-xs font-bold text-[#92400E] shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Mogent AI 3.5 — সম্পূর্ণ স্বয়ংক্রিয় কাস্টমার ও সেলস এজেন্ট</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#0F172A] leading-[1.15] max-w-4xl">
          আপনার ফেসবুক পেইজে সেলস ও সাপোর্ট দিন <span className="text-[#D97706]">স্বয়ংক্রিয় এআই</span> দিয়ে
        </h1>

        <p className="text-base md:text-lg text-[#475569] max-w-2xl leading-relaxed font-medium">
          Mogent AI আপনার প্রোডাক্ট ক্যাটালগ ও নিয়মাবলী শিখে কাস্টমারদের প্রশ্নের তাত্ক্ষণিক উত্তর দেয়, ডেলিভারি তথ্য কালেকশন করে এবং অর্ডার কনফার্ম করে।
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>আজই ফ্রি ট্রায়াল শুরু করুন</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/playground"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>লাইভ ডেমো দেখুন</span>
          </Link>
        </div>

        {/* Dashboard Preview UI Mockup */}
        <div className="w-full mt-10 rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-xl overflow-hidden">
          <div className="rounded-xl border border-[#F1F5F9] bg-[#F8FAFC] p-6 space-y-6">
            {/* Top Cards in Mockup */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-left">
                <p className="text-[10px] font-bold text-[#64748B]">মোট কথোপকথন</p>
                <p className="text-xl font-black text-[#0F172A] mt-1">146</p>
                <span className="text-[9px] text-[#059669] font-bold">⚡ লাইভ সিঙ্ক</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-left">
                <p className="text-[10px] font-bold text-[#64748B]">এআই উত্তর দিয়েছে</p>
                <p className="text-xl font-black text-[#0F172A] mt-1">142</p>
                <span className="text-[9px] text-[#059669] font-bold">✓ 98.4% সাকসেস</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-left">
                <p className="text-[10px] font-bold text-[#64748B]">ক্যাপচারড লিডস</p>
                <p className="text-xl font-black text-[#0F172A] mt-1">146</p>
                <span className="text-[9px] text-[#2563EB] font-bold">✓ ফোন ও ঠিকানা</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-left">
                <p className="text-[10px] font-bold text-[#64748B]">গড় রেসপন্স স্পিড</p>
                <p className="text-xl font-black text-[#0F172A] mt-1">1.2s</p>
                <span className="text-[9px] text-[#7C3AED] font-bold">তাত্ক্ষণিক উত্তর</span>
              </div>
            </div>

            {/* Simulated Chat Bubble */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 text-left space-y-3 max-w-xl mx-auto shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#E2E8F0] text-[#0F172A] font-bold text-xs flex items-center justify-center shrink-0">
                  C
                </div>
                <div className="bg-[#F1F5F9] p-3 rounded-xl text-xs text-[#0F172A] font-medium">
                  এই পোলো শার্টটার দাম কত আর ডেলিভারি চার্জ কত ঢাকার ভেতরে?
                </div>
              </div>
              <div className="flex items-start gap-2.5 justify-end">
                <div className="bg-[#F59E0B] p-3 rounded-xl text-xs text-black font-bold max-w-md shadow-xs">
                  পোলো শার্টটির প্রাইস ৫৫০ টাকা। ঢাকার ভেতরে ডেলিভারি চার্জ ৮০ টাকা (১-২ দিনে পৌঁছে যাবে)। অর্ডার কনফার্ম করতে আপনার সাইজ, নাম ও ঠিকানা পাঠিয়ে দিন 😊
                </div>
                <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 border border-[#FDE68A]">
                  AI
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-16 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              আপনার ব্যবসার প্রতিটি ধাপ স্বয়ংক্রিয় করার পূর্ণাঙ্গ টুলস
            </h2>
            <p className="text-xs sm:text-sm text-[#475569]">
              শুধু চ্যাটবট নয়, এটি একটি অটোনোমাস সেলস ও অপারেশন ম্যানেজার
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
                <Package className="w-5 h-5 text-[#D97706]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">প্রোডাক্ট ক্যাটালগ ও লাইভ স্টক</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                ছবি, প্রাইস এবং স্টক দিয়ে প্রোডাক্ট ক্যাটালগ সেট করুন। এআই স্বয়ংক্রিয়ভাবে স্টক চেক করে কাস্টমারকে ছবি ও বিবরণসহ উত্তর দেবে।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
                <BookOpen className="w-5 h-5 text-[#D97706]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">৭-ট্যাব নলেজ বেইস ও AI প্রম্পট</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                ডেলিভারি চার্জ, রিটার্ন পলিসি, সাধারণ প্রশ্নোত্তর এবং কাস্টম সেলস পারসোনা প্রম্পট যুক্ত করে আপনার এআই-কে ট্রেইন করুন।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
                <Facebook className="w-5 h-5 text-[#1877F2]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">ফেসবুক ৩-টগল অটোনোমাস পাওয়ার</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                এআই চ্যাট রিপ্লাই, কমেন্ট রিপ্লাই এবং প্রাইভেট ইনবক্স রিপ্লাই টগল সুইচের মাধ্যমে মুহূর্তেই লাইভ সক্রিয় করুন।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
                <Globe className="w-5 h-5 text-[#059669]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">ওয়েবসাইট ও সাইটম্যাপ ক্রলার</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                আপনার ওয়েবসাইট বা সাইটম্যাপ URL দিয়ে দিন, এআই সমস্ত পেজ পড়ে নিজে থেকেই তথ্য শিখে নেবে।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
                <Smartphone className="w-5 h-5 text-[#2563EB]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">টেলিগ্রাম ১-ক্লিক মোবাইল টেকওভার</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                কাস্টমার রাগ করলে বা জটিল প্রশ্ন থাকলে আপনার টেলিগ্রামে অ্যালার্ট আসবে এবং মোবাইল থেকেই সরাসরি রিপ্লাই দিতে পারবেন।
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center border border-[#FDE68A]">
                <Users className="w-5 h-5 text-[#7C3AED]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">স্বয়ংক্রিয় কাস্টমার CRM ও অর্ডার লগ</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                চ্যাটে কাস্টমারের দেওয়া মোবাইল নাম্বার ও ঠিকানা স্বয়ংক্রিয়ভাবে লিডস এবং অর্ডারস টেবিলে সেভ হয়।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Exact Matching Packages) */}
      <section id="pricing" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A]">
              সহজ ও সাশ্রয়ী প্যাকেজ
            </h2>
            <p className="text-xs sm:text-sm text-[#475569]">
              আপনার ব্যবসার পরিধির সাথে মানানসই প্ল্যান বেছে নিন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between space-y-6 shadow-sm hover:border-[#CBD5E1] transition-all">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Starter Plan</h3>
                  <p className="text-xs text-[#64748B] mt-1">একটি ফেসবুক পেজ ও অনলাইন শপের জন্য</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#0F172A]">৳৯৯৯</span>
                  <span className="text-xs text-[#64748B]">/মাস</span>
                </div>
                <div className="w-full h-px bg-[#F1F5F9]" />
                <ul className="space-y-2.5 text-xs text-[#334155]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>১টি ফেসবুক পেজ কানেকশন</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>৫,০০০ স্বয়ংক্রিয় এআই মেসেজ / মাস</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>ফুল প্রোডাক্ট ক্যাটালগ ও FAQ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>কাস্টমার লিড ও ফোন নম্বর ক্যাপচার</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] font-bold text-xs text-center transition-all cursor-pointer"
              >
                স্টার্টার প্ল্যান নিন
              </Link>
            </div>

            {/* Pro Growth Plan */}
            <div className="bg-white rounded-2xl border-2 border-[#F59E0B] p-6 flex flex-col justify-between space-y-6 shadow-lg shadow-[#F59E0B]/10 relative">
              <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-black bg-[#F59E0B] text-black shadow-xs">
                সর্বাধিক জনপ্রিয়
              </span>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Pro Growth Plan</h3>
                  <p className="text-xs text-[#64748B] mt-1">গ্রোথ ব্র্যান্ড ও মাল্টি-পেজ ব্যবসার জন্য</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#0F172A]">৳২,৪৯৯</span>
                  <span className="text-xs text-[#64748B]">/মাস</span>
                </div>
                <div className="w-full h-px bg-[#F1F5F9]" />
                <ul className="space-y-2.5 text-xs text-[#334155]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>সর্বোচ্চ ৫টি ফেসবুক পেজ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>২৫,০০০ স্বয়ংক্রিয় এআই মেসেজ / মাস</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>WhatsApp ও হটলাইন শেয়ারিং প্রটোকল</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>টেলিগ্রাম ইনস্ট্যান্ট টেকওভার অ্যালার্ট</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>২৪/৭ প্রায়োরিটি সাপোর্ট</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs text-center transition-all cursor-pointer shadow-sm"
              >
                প্রো গ্রোথ শুরু করুন
              </Link>
            </div>

            {/* Enterprise VIP Plan */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between space-y-6 shadow-sm hover:border-[#CBD5E1] transition-all">
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-base text-[#0F172A]">Enterprise VIP</h3>
                  <p className="text-xs text-[#64748B] mt-1">হাই-ভলিউম ব্র্যান্ড ও কর্পোরেট শপের জন্য</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#0F172A]">৳৫,৯৯৯</span>
                  <span className="text-xs text-[#64748B]">/মাস</span>
                </div>
                <div className="w-full h-px bg-[#F1F5F9]" />
                <ul className="space-y-2.5 text-xs text-[#334155]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>সর্বোচ্চ ২০টি ফেসবুক পেজ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>১,০০,০০০+ এআই মেসেজ কোটা</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>কাস্টম ব্র্যান্ড পারসোনা ফাইন-টিউনিং</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#059669] shrink-0" />
                    <span>ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] font-bold text-xs text-center transition-all cursor-pointer"
              >
                এন্টারপ্রাইজ যোগাযোগ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-[#E2E8F0] px-6 text-center text-xs text-[#64748B]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Mogent AI. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex items-center gap-6 font-bold text-[#475569]">
            <Link href="/terms" className="hover:text-[#0F172A]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy Policy</Link>
            <Link href="/data-deletion" className="hover:text-[#0F172A]">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
