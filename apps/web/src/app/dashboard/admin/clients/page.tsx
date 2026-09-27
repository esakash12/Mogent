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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminClients } from "@/lib/api";

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

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminClients();
      if (res.success && Array.isArray(res.data)) {
        setClients(res.data);
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
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] text-xs font-bold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin Multi-Tenant Directory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">
            Merchant Workspaces & Clients
          </h1>
          <p className="text-[#64748B] text-xs mt-1">
            Overview of all merchant stores, connected Facebook Pages, and product catalogs across the platform.
          </p>
        </div>

        <button
          onClick={loadClients}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] flex items-center gap-2 transition-colors cursor-pointer shadow-xs w-fit"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-[#F59E0B]", loading && "animate-spin")} />
          <span>Refresh Clients</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Total Workspaces</span>
          <p className="text-2xl font-black text-[#0F172A] mt-1">{clients.length}</p>
        </div>
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Total Connected Pages</span>
          <p className="text-2xl font-black text-[#2563EB] mt-1">
            {clients.reduce((acc, c) => acc + (c.pagesCount || 0), 0)}
          </p>
        </div>
        <div className="p-5 rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
          <span className="text-xs font-bold text-[#64748B]">Total Catalog Products</span>
          <p className="text-2xl font-black text-[#D97706] mt-1">
            {clients.reduce((acc, c) => acc + (c.productsCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search workspace, owner email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-white border border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] placeholder:text-[#94A3B8] shadow-xs"
        />
      </div>

      {/* Clients Table */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            <span className="text-xs text-[#64748B]">Loading merchant workspaces...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="text-xs text-[#64748B]">No merchant workspaces found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                <tr>
                  <th className="p-4">Workspace</th>
                  <th className="p-4">Owner Email</th>
                  <th className="p-4">Pages Connected</th>
                  <th className="p-4">Products</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-4 font-bold text-[#0F172A]">
                      <p>{c.name}</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono">Slug: {c.slug}</p>
                    </td>

                    <td className="p-4 text-[#475569] font-mono">
                      {c.ownerEmail}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#2563EB]">
                        <Facebook className="w-3.5 h-3.5" />
                        {c.pagesCount} Pages
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-[#0F172A]">
                        <Package className="w-3.5 h-3.5 text-[#D97706]" />
                        {c.productsCount} Items
                      </span>
                    </td>

                    <td className="p-4 text-[#64748B] font-mono">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
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
