"use client";

import { useState, useEffect } from "react";
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
import { fetchKnowledgeAndWhatsApp, createKnowledgeItem, deleteKnowledgeItem } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [websites, setWebsites] = useState<WebsiteItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchKnowledgeAndWhatsApp();
      if (data && Array.isArray(data.items)) {
        const siteItems = data.items
          .filter((i: any) => i.category === "WEBSITE_CRAWL" || i.category === "WEBSITE")
          .map((i: any) => ({
            id: i.id,
            url: i.title,
            pagesCount: 1,
            lastCrawled: "Active",
            status: "INDEXED" as const,
          }));
        setWebsites(siteItems);
      }
    } catch (err) {
      console.error("Failed to load website sources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const formattedUrl = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
    setIsCrawling(true);

    try {
      const created = await createKnowledgeItem({
        title: formattedUrl,
        category: "WEBSITE_CRAWL",
        content: `Website content indexed for AI training from source: ${formattedUrl}`,
      });

      setWebsites([
        {
          id: created?.id || Date.now().toString(),
          url: formattedUrl,
          pagesCount: 1,
          lastCrawled: "Just now",
          status: "INDEXED",
        },
        ...websites,
      ]);
      setUrlInput("");
    } catch (err) {
      console.error("Crawl error:", err);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleDelete = async (id: string) => {
    setWebsites(websites.filter((w) => w.id !== id));
    try {
      await deleteKnowledgeItem(id);
    } catch (err) {
      console.error("Delete website source error:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Description Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-1">
        <h2 className="text-sm font-bold text-[#0F172A]">Website</h2>
        <p className="text-xs text-[#475569]">
          Train your AI agent directly from your website URLs. Mogent AI will crawl product pages and FAQs automatically.
        </p>
      </div>

      {/* Crawl Form Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#0F172A]">Train from Website or Sitemap</h3>

        <form onSubmit={handleCrawl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="https://example.com/sitemap.xml or https://example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
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
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#475569]">
          Indexed Website Sources ({websites.length})
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            <span className="text-xs font-bold text-[#64748B]">Loading indexed sources...</span>
          </div>
        ) : websites.length > 0 ? (
          <div className="divide-y divide-[#F1F5F9]">
            {websites.map((w) => (
              <div key={w.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#0F172A] truncate">{w.url}</p>
                    <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-bold">
                      ✓ Indexed
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Connected to AI Knowledge Base • Status: Live
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(w.id)}
                  className="p-2 rounded-xl text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                  title="Remove Source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <Globe className="w-8 h-8 text-[#CBD5E1] mx-auto" />
            <p className="text-xs font-bold text-[#0F172A]">No website sources indexed yet</p>
            <p className="text-[11px] text-[#64748B]">
              Enter your website URL or sitemap link above to automatically train your AI on your web pages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
