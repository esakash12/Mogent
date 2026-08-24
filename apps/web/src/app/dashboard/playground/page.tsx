"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PlayCircle,
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Sliders,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimulatorMessage {
  role: "user" | "model";
  content: string;
  thinking?: string;
  latency?: string;
}

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<SimulatorMessage[]>([
    {
      role: "model",
      content: "আসসালামু আলাইকুম! আমি আপনার AI সহকারী। প্রোডাক্ট অর্ডার বা যেকোনো তথ্যের জন্য আমাকে মেসেজ দিন।",
      thinking: "Initialized persona with friendly Bangladeshi e-commerce tone.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [persona, setPersona] = useState("Friendly & Helpful");
  const [language, setLanguage] = useState("Bangla (Natural)");
  const [temperature, setTemperature] = useState(0.4);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage("");

    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setIsTyping(true);

    // Simulate AI thinking and response
    setTimeout(() => {
      let reply = "";
      let think = "";

      if (userText.includes("দাম") || userText.includes("price")) {
        reply = "আমাদের স্মার্টওয়াচ প্রো এর বর্তমান অফার প্রাইস ২৪৫০ টাকা। আপনি ক্যাশ অন ডেলিভারিতে অর্ডার করতে চাইলে আপনার নাম ও ঠিকানা পাঠান।";
        think = "Matched Knowledge Base -> 'Smartwatch Pro' (2450 BDT). Generated friendly sales response.";
      } else if (userText.includes("অর্ডার") || userText.includes("order")) {
        reply = "অর্ডার করতে আপনার নাম, ডেলিভারি ঠিকানা ও সচল মোবাইল নাম্বারটি লিখে পাঠিয়ে দিন। ঢাকার ভেতরে ১ দিনে এবং ঢাকার বাইরে ২-৩ দিনে ডেলিভারি পেয়ে যাবেন।";
        think = "Detected ORDER_INTENT. Prompted user for delivery address & phone number.";
      } else {
        reply = "ধন্যবাদ মেসেজ দেওয়ার জন্য! জি, আপনার এই বিষয়ে বিস্তারিত জানতে আমরা আনন্দের সাথে সাহায্য করব। আপনি কি নির্দিষ্ট কোনো মডেল বা সাইজ খুঁজছেন?";
        think = "General inquiry fallback using Gemini 2.0 with temperature " + temperature;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: reply,
          thinking: think,
          latency: "420ms",
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleReset = () => {
    setMessages([
      {
        role: "model",
        content: "আসসালামু আলাইকুম! আমি আপনার AI সহকারী। প্রোডাক্ট অর্ডার বা যেকোনো তথ্যের জন্য আমাকে মেসেজ দিন।",
        thinking: "Session reset.",
      },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sector Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#222] pb-3 text-xs">
        <Link
          href="/dashboard/knowledge"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Knowledge Base</span>
        </Link>
        <Link
          href="/dashboard/automation"
          className="px-3 py-1.5 rounded-lg text-[#888] hover:text-[#EDEDED] hover:bg-[#111] transition-colors flex items-center gap-2"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Rules & Triggers</span>
        </Link>
        <Link
          href="/dashboard/playground"
          className="px-3 py-1.5 rounded-lg bg-[#222] text-[#EDEDED] font-semibold flex items-center gap-2"
        >
          <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Playground</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            AI Test Playground & Simulator
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Test and fine-tune your Facebook bot's personality and responses before deploying to live customers.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-3.5 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#333] text-xs font-medium text-[#EDEDED] flex items-center gap-2 transition-colors w-fit"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Session</span>
        </button>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-230px)] min-h-[500px]">
        {/* Left 2 Cols: Chat Simulator */}
        <div className="lg:col-span-2 rounded-2xl border border-[#222] bg-[#0A0A0A] flex flex-col overflow-hidden">
          {/* Simulator Bar */}
          <div className="h-12 px-4 border-b border-[#222] flex items-center justify-between bg-[#111]/50 text-xs">
            <div className="flex items-center gap-2 text-[#888]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>Facebook Messenger Sandbox</span>
            </div>
            <span className="font-mono text-[#555]">Gemini 2.0 Flash</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col max-w-[85%]",
                  m.role === "user" ? "self-end items-end ml-auto" : "self-start items-start"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#888]">
                  {m.role === "user" ? (
                    <span>You (Customer)</span>
                  ) : (
                    <span className="flex items-center gap-1 text-indigo-400 font-medium">
                      <Bot className="w-3 h-3" /> Page AI Bot
                    </span>
                  )}
                  {m.latency && <span>• {m.latency}</span>}
                </div>

                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "bg-white text-black rounded-tr-sm"
                      : "bg-[#181818] border border-[#262626] text-[#EDEDED] rounded-tl-sm"
                  )}
                >
                  <p>{m.content}</p>
                </div>

                {m.thinking && (
                  <div className="mt-1.5 p-2 rounded bg-[#111] border border-[#222] text-[10px] font-mono text-[#888] max-w-full">
                    <span className="text-amber-500 font-semibold">Brain: </span>
                    {m.thinking}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#181818] border border-[#262626] w-fit text-xs text-[#888]">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>AI is formulating response from Knowledge Base...</span>
              </div>
            )}
          </div>

          {/* Test Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-[#222] bg-[#0A0A0A] flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a test customer message (e.g. ওয়াচটার দাম কত?)..."
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="px-4 py-2.5 rounded-lg bg-white text-black font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test</span>
            </button>
          </form>
        </div>

        {/* Right 1 Col: Live Controls */}
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-6 overflow-y-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-[#222]">
            <Sliders className="w-4 h-4 text-[#888]" />
            <h3 className="font-semibold text-sm text-[#EDEDED]">Persona Parameters</h3>
          </div>

          {/* Persona Style */}
          <div className="space-y-2">
            <label className="block text-xs text-[#888] font-medium">Tone & Style</label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none"
            >
              <option value="Friendly & Helpful">Friendly & Courteous (Recommended)</option>
              <option value="Direct & Sales Driven">Direct & Sales Aggressive</option>
              <option value="Formal & Corporate">Formal Corporate Executive</option>
            </select>
          </div>

          {/* Language Setting */}
          <div className="space-y-2">
            <label className="block text-xs text-[#888] font-medium">Dialect</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none"
            >
              <option value="Bangla (Natural)">Natural Bengali (Bangla Script)</option>
              <option value="Banglish (Phonetic)">Banglish (English letters, Bangla words)</option>
              <option value="English">Pure English</option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#888]">Creativity (Temperature)</span>
              <span className="font-mono text-[#EDEDED]">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-[10px] text-[#555]">
              <span>Strict / Factual</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Connected Knowledge Status */}
          <div className="p-3 rounded-xl bg-[#111] border border-[#222] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#EDEDED] font-medium">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Active Knowledge Base</span>
            </div>
            <p className="text-[11px] text-[#888]">
              Simulator is loaded with 12 products, shipping policy, and pricing rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
