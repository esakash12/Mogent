"use client";

import { useState } from "react";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WebsiteItem {
  id: string;
  url: string;
  pagesCount: number;
  lastCrawled: string;
  status: "INDEXED" | "CRAWLING" | "FAILED";
}

export default function WebsiteTrainingPage() {
  const [urlInput, setUrlInput] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [websites, setWebsites] = useState<WebsiteItem[]>([
    {
      id: "1",
      url: "https://mybrand-store.com",
      pagesCount: 18,
      lastCrawled: "1 hour ago",
      status: "INDEXED",
    },
  ]);

  const handleCrawl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsCrawling(true);

    setTimeout(() => {
      setWebsites([
        {
          id: Date.now().toString(),
          url: urlInput.startsWith("http") ? urlInput : `https://${urlInput}`,
          pagesCount: Math.floor(Math.random() * 15) + 6,
          lastCrawled: "Just now",
          status: "INDEXED",
        },
        ...websites,
      ]);
      setUrlInput("");
      setIsCrawling(false);
    }, 1200);
  };

  const handleDelete = (id: string) => {
    setWebsites(websites.filter((w) => w.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Description Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-1">
        <h2 className="text-sm font-bold text-[#111827]">Website</h2>
        <p className="text-xs text-[#6B7280]">
          Train your AI agent directly from your website URLs. Mogent AI will crawl product pages and FAQs automatically.
        </p>
      </div>

      {/* Crawl Form Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#111827]">Train from Website or Sitemap</h3>

        <form onSubmit={handleCrawl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="https://example.com/sitemap.xml or https://example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
            />
          </div>
          <button
            type="submit"
            disabled={isCrawling}
            className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isCrawling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isCrawling ? "Crawling Pages..." : "Crawl & Train"}</span>
          </button>
        </form>
      </div>

      {/* Crawled Sources List */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F3F4F6] text-xs font-bold text-[#6B7280]">
          Indexed Website Sources ({websites.length})
        </div>

        <div className="divide-y divide-[#F3F4F6]">
          {websites.map((site) => (
            <div key={site.id} className="p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#111827]">{site.url}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-[10px] font-bold border border-[#A7F3D0] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Indexed
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  {site.pagesCount} pages indexed • Last synced {site.lastCrawled}
                </p>
              </div>

              <button
                onClick={() => handleDelete(site.id)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
