"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Facebook,
  ShieldCheck,
  Ban,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Loader2,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
  pagesCount: number;
  productsCount: number;
  plan: "Starter" | "Pro" | "Enterprise";
  messagesUsed: number;
  messageLimit: number;
  status: "ACTIVE" | "WARNING" | "SUSPENDED";
  joinedDate: string;
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("ALL");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
    fetch(`${API_BASE}/api/admin/clients`, {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("mogent_admin_token") : ""}`,
      },
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const mapped: Client[] = json.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.ownerEmail || "No Email",
            pagesCount: c.pagesCount || 0,
            productsCount: c.productsCount || 0,
            plan: "Pro",
            messagesUsed: c.messagesUsed || 0,
            messageLimit: 50000,
            status: "ACTIVE",
            joinedDate: new Date(c.createdAt).toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          }));
          setClients(mapped);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === "ALL" || c.plan.toUpperCase() === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Live Merchant Directory
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Real multi-tenant client stores and Facebook Pages connected in PostgreSQL.
          </p>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Total Workspaces</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{clients.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Active Facebook Pages</span>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {clients.reduce((acc, c) => acc + (c.pagesCount || 0), 0)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Active Accounts</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">
            {clients.filter((c) => c.status === "ACTIVE").length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by client name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#111] border border-[#333] text-[13px] text-[#EDEDED] focus:outline-none focus:border-amber-500 transition-colors placeholder:text-[#555]"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-xs text-[#888]">Loading database workspaces...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#777]">
            No client workspaces found in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#111] border-b border-[#222] text-[#888] text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Client Workspace</th>
                  <th className="px-6 py-4">Owner Email</th>
                  <th className="px-6 py-4">Connected Pages</th>
                  <th className="px-6 py-4">Products</th>
                  <th className="px-6 py-4">Joined Date</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#111]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#222] border border-[#333] flex items-center justify-center font-bold text-xs text-amber-500">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#EDEDED] group-hover:text-amber-500 transition-colors">
                            {client.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[#888] font-mono text-xs">
                      {client.email}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <Facebook className="w-3.5 h-3.5" />
                        <span>{client.pagesCount} Pages</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[#EDEDED]">
                        <Package className="w-3.5 h-3.5 text-amber-500" />
                        <span>{client.productsCount} Products</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-[#888] font-mono text-xs">
                      {client.joinedDate}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
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
