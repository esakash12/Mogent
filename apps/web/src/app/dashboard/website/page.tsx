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
import { fetchKnowledgeAndWhatsApp, crawlWebsiteUrl, deleteKnowledgeItem } from "@/lib/api";

interface WebsiteItem {
  id: string;
  url: string;
  title?: string;
  textLength?: number;
  snippet?: string;
  pagesCount: number;
  lastCrawled: string;
  status: "INDEXED" | "CRAWLING" | "FAILED";
}

export default function WebsiteTrainingPage() {
  const [urlInput, setUrlInput] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchKnowledgeAndWhatsApp();
      if (data && Array.isArray(data.items)) {
        const siteItems = data.items
          .filter((i: any) => i.category === "WEBSITE_CRAWL" || i.category === "WEBSITE")
          .map((i: any) => {
            const rawContent = i.content || "";
            const titleMatch = rawContent.match(/\[Page Title: (.*?)\]/);
            const cleanSnippet = rawContent
              .replace(/\[Source URL: .*?\]/, "")
              .replace(/\[Page Title: .*?\]/, "")
              .trim();
            return {
              id: i.id,
              url: i.title,
              title: titleMatch ? titleMatch[1] : undefined,
              textLength: cleanSnippet.length,
              snippet: cleanSnippet.slice(0, 180) + (cleanSnippet.length > 180 ? "..." : ""),
              pagesCount: 1,
              lastCrawled: "Active",
              status: "INDEXED" as const,
            };
          });
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

    const formattedUrl = urlInput.startsWith("http") ? urlInput.trim() : `https://${urlInput.trim()}`;
    setIsCrawling(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await crawlWebsiteUrl(formattedUrl);
      if (res && res.success) {
        setWebsites([
          {
            id: res.data.id || Date.now().toString(),
            url: formattedUrl,
            title: res.data.title,
            textLength: res.data.textLength,
            snippet: res.data.snippet,
            pagesCount: 1,
            lastCrawled: "Just now",
            status: "INDEXED",
          },
          ...websites.filter((w) => w.url !== formattedUrl),
        ]);
        setUrlInput("");
        setSuccessMsg(
          `✓ "${res.data.title || formattedUrl}" indexed successfully into AI knowledge base (${res.data.textLength} chars)!`
        );
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        setErrorMsg(res?.error || "Failed to crawl target website. Please ensure the URL is publicly reachable.");
        setTimeout(() => setErrorMsg(""), 5000);
      }
    } catch (err: any) {
      console.error("Crawl error:", err);
      setErrorMsg(err.message || "Connection error while reaching the website.");
      setTimeout(() => setErrorMsg(""), 5000);
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
            <span>{isCrawling ? "Crawling & Parsing..." : "Crawl & Train"}</span>
          </button>
        </form>

        {successMsg && (
          <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#065F46] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#991B1B] flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}
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
              <div key={w.id} className="p-4 flex items-start justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-[#0F172A] truncate">
                      {w.title || w.url}
                    </p>
                    <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-bold">
                      ✓ Indexed
                    </span>
                    {w.textLength ? (
                      <span className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] text-[10px] font-mono">
                        {w.textLength.toLocaleString()} chars
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[#64748B] font-mono truncate">{w.url}</p>
                  {w.snippet && (
                    <p className="text-[11px] text-[#334155] line-clamp-2 bg-[#F8FAFC] p-2 rounded-lg border border-[#F1F5F9]">
                      {w.snippet}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(w.id)}
                  className="p-2 rounded-xl text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer shrink-0 mt-0.5"
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
