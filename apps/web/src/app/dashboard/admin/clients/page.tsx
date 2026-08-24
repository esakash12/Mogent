"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Facebook,
  Package,
  Calendar,
  RefreshCw,
  ExternalLink,
  Shield,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName: string;
  membersCount: number;
  pagesCount: number;
  productsCount: number;
  status: string;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/clients`, {
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : ""}`,
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setClients(json.data);
      }
    } catch (err) {
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin Multi-Tenant Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Merchant Workspaces & Clients
          </h1>
          <p className="text-[#888] text-xs mt-1">
            Overview of all merchant stores, connected Facebook Pages, and product catalogs.
          </p>
        </div>

        <button
          onClick={loadClients}
          className="px-3.5 py-2 rounded-xl bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-mono text-[#888] hover:text-[#EDEDED] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span>Refresh Clients</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Workspaces</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{clients.length}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Connected Pages</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {clients.reduce((acc, c) => acc + (c.pagesCount || 0), 0)}
          </p>
        </div>
        <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888]">Total Catalog Products</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">
            {clients.reduce((acc, c) => acc + (c.productsCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
        <input
          type="text"
          placeholder="Search workspace, owner email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading merchant workspaces...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-[#555] mx-auto" />
            <p className="text-xs text-[#888]">No merchant workspaces found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222] text-[#888] font-semibold">
                <tr>
                  <th className="p-4">Workspace</th>
                  <th className="p-4">Owner Email</th>
                  <th className="p-4">Pages Connected</th>
                  <th className="p-4">Products</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#111]/40 transition-colors">
                    <td className="p-4 font-semibold text-[#EDEDED]">
                      <p>{c.name}</p>
                      <p className="text-[10px] text-[#666] font-mono">Slug: {c.slug}</p>
                    </td>

                    <td className="p-4 text-[#AAA] font-mono">
                      {c.ownerEmail}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-blue-400">
                        <Facebook className="w-3.5 h-3.5" />
                        {c.pagesCount} Pages
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#EDEDED]">
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        {c.productsCount} Items
                      </span>
                    </td>

                    <td className="p-4 text-[#888] font-mono">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
