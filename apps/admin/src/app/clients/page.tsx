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
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  email: string;
  pagesCount: number;
  plan: "Starter" | "Pro" | "Enterprise";
  messagesUsed: number;
  messageLimit: number;
  status: "ACTIVE" | "WARNING" | "SUSPENDED";
  joinedDate: string;
}

const mockClients: Client[] = [
  {
    id: "cl-1",
    name: "TechGadgets BD",
    email: "shohag.tech@gmail.com",
    pagesCount: 3,
    plan: "Pro",
    messagesUsed: 14250,
    messageLimit: 50000,
    status: "ACTIVE",
    joinedDate: "12 Aug, 2026",
  },
  {
    id: "cl-2",
    name: "Aarong Fashion Store",
    email: "support@fashionstore.com.bd",
    pagesCount: 5,
    plan: "Enterprise",
    messagesUsed: 89300,
    messageLimit: 100000,
    status: "WARNING",
    joinedDate: "01 Jul, 2026",
  },
  {
    id: "cl-3",
    name: "Organic Honey Mart",
    email: "info@organichoney.bd",
    pagesCount: 1,
    plan: "Starter",
    messagesUsed: 980,
    messageLimit: 1000,
    status: "WARNING",
    joinedDate: "18 Aug, 2026",
  },
  {
    id: "cl-4",
    name: "Dhaka Electronics Hub",
    email: "contact@dhakahub.com",
    pagesCount: 2,
    plan: "Pro",
    messagesUsed: 4200,
    messageLimit: 50000,
    status: "ACTIVE",
    joinedDate: "05 Aug, 2026",
  },
  {
    id: "cl-5",
    name: "Spam Shop (Blocked)",
    email: "baduser@fake.com",
    pagesCount: 1,
    plan: "Starter",
    messagesUsed: 1200,
    messageLimit: 1000,
    status: "SUSPENDED",
    joinedDate: "20 Aug, 2026",
  },
];

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("ALL");
  const [clients, setClients] = useState<Client[]>(mockClients);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${API_BASE}/api/admin/clients`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Client[] = json.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            email: c.ownerEmail || "owner@workspace.com",
            pagesCount: c.pagesCount || 1,
            plan: "Pro",
            messagesUsed: 2450,
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
      })
      .catch(() => {});
  }, []);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === "ALL" || c.plan.toUpperCase() === selectedPlan;
    return matchesSearch && matchesPlan;
  });

  const toggleSuspend = (id: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: c.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
            }
          : c
      )
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#EDEDED]">
            Client Management
          </h1>
          <p className="text-[#888] text-sm mt-1">
            Manage customer workspaces, subscriptions, quotas, and Facebook page access.
          </p>
        </div>

        <button className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[13px] flex items-center gap-2 transition-colors w-fit shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Total Clients</span>
          <p className="text-2xl font-bold text-[#EDEDED] mt-1">{clients.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Active Subscriptions</span>
          <p className="text-2xl font-bold text-[#10B981] mt-1">
            {clients.filter((c) => c.status === "ACTIVE").length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Quota Warnings</span>
          <p className="text-2xl font-bold text-amber-500 mt-1">
            {clients.filter((c) => c.status === "WARNING").length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <span className="text-xs text-[#888] font-medium">Suspended Accounts</span>
          <p className="text-2xl font-bold text-red-400 mt-1">
            {clients.filter((c) => c.status === "SUSPENDED").length}
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

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {["ALL", "STARTER", "PRO", "ENTERPRISE"].map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
                selectedPlan === plan
                  ? "bg-amber-500 text-black font-semibold"
                  : "bg-[#111] text-[#888] hover:text-[#EDEDED] border border-[#222]"
              )}
            >
              {plan}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#111] border-b border-[#222] text-[#888] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Connected Pages</th>
                <th className="px-6 py-4">Message Quota</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {filteredClients.map((client) => {
                const usagePercent = Math.min(
                  Math.round((client.messagesUsed / client.messageLimit) * 100),
                  100
                );

                return (
                  <tr key={client.id} className="hover:bg-[#111]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#222] border border-[#333] flex items-center justify-center font-bold text-xs text-[#EDEDED]">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#EDEDED] group-hover:text-amber-500 transition-colors">
                            {client.name}
                          </p>
                          <p className="text-[11px] text-[#888] font-mono mt-0.5">{client.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11px] font-semibold border",
                          client.plan === "Enterprise"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : client.plan === "Pro"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-[#222] text-[#888] border-[#333]"
                        )}
                      >
                        {client.plan}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[#EDEDED]">
                        <Facebook className="w-3.5 h-3.5 text-blue-400" />
                        <span>{client.pagesCount} Pages</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="w-48 space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[#EDEDED] font-mono">
                            {client.messagesUsed.toLocaleString()} / {client.messageLimit.toLocaleString()}
                          </span>
                          <span className={usagePercent > 90 ? "text-red-400 font-bold" : "text-[#888]"}>
                            {usagePercent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#222] overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              usagePercent > 90
                                ? "bg-red-500"
                                : usagePercent > 75
                                ? "bg-amber-500"
                                : "bg-[#10B981]"
                            )}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                          client.status === "ACTIVE"
                            ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                            : client.status === "WARNING"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            client.status === "ACTIVE"
                              ? "bg-[#10B981]"
                              : client.status === "WARNING"
                              ? "bg-amber-500"
                              : "bg-red-400"
                          )}
                        />
                        {client.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleSuspend(client.id)}
                          className={cn(
                            "px-2.5 py-1 rounded text-xs font-medium border transition-colors",
                            client.status === "SUSPENDED"
                              ? "border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10"
                              : "border-red-500/30 text-red-400 hover:bg-red-500/10"
                          )}
                        >
                          {client.status === "SUSPENDED" ? "Unban" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
