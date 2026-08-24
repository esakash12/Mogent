import { Users, Key, Server, Activity, ArrowUpRight, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#EDEDED] mb-1">System Overview</h1>
          <p className="text-[#888] text-sm">Global platform metrics and health status.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Clients", value: "142", icon: Users, trend: "+12 this month", trendUp: true },
          { title: "Active AI Keys", value: "8", icon: Key, trend: "3 exhausting soon", trendUp: false },
          { title: "Messages Processed", value: "4.2M", icon: Activity, trend: "+800k this week", trendUp: true },
          { title: "System Load", value: "24%", icon: Server, trend: "Stable", trendUp: true },
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded-xl border border-[#222] bg-[#0A0A0A] hover:bg-[#111] transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#888] group-hover:text-[#EDEDED] transition-colors">{stat.title}</span>
              <div className="p-2 rounded-lg bg-[#222] text-[#EDEDED]">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-[#EDEDED] tracking-tight">{stat.value}</span>
              <span className={`text-xs font-medium flex items-center gap-1 ${stat.trendUp ? "text-[#10B981]" : "text-amber-500"}`}>
                {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Clients & System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg text-[#EDEDED]">Recent Clients</h3>
            <Link href="/clients" className="text-sm text-[#888] hover:text-[#EDEDED] flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { name: "TechGadgets BD", plan: "Pro", messages: "12,450", status: "Active" },
              { name: "Fashion House", plan: "Pro", messages: "8,200", status: "Active" },
              { name: "Organic Foods", plan: "Starter", messages: "950", status: "Warning - Limit" },
            ].map((client, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[#111] border border-[#222]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center font-semibold text-[#EDEDED] text-sm">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[#EDEDED] text-sm">{client.name}</p>
                    <p className="text-xs text-[#888] mt-0.5">{client.plan} Plan</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#EDEDED] text-sm">{client.messages}</p>
                  <p className={`text-xs mt-0.5 ${client.status.includes('Warning') ? 'text-amber-500' : 'text-[#10B981]'}`}>
                    {client.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-[#222] bg-[#0A0A0A]">
          <h3 className="font-semibold text-lg text-[#EDEDED] mb-6">System Health</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#EDEDED]">API Keys Quota</span>
                <span className="text-xs text-amber-500">85% Used</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#222] overflow-hidden">
                <div className="h-full bg-amber-500 w-[85%] rounded-full" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#EDEDED]">Redis Cache (Upstash)</span>
                <span className="text-xs text-[#10B981]">Healthy</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#222] overflow-hidden">
                <div className="h-full bg-[#10B981] w-[20%] rounded-full" />
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#222]">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Key Rotation Needed</p>
                  <p className="opacity-80">2 Gemini keys are nearing their rate limit. Consider adding more keys.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
