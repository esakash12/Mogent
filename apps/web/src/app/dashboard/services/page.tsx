"use client";

import { useState } from "react";
import {
  Wrench,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceItem {
  id: string;
  name: string;
  details: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: "1",
      name: "Custom T-Shirt & Polo Printing",
      details: "100% Combed Cotton, Screen & DTF Printing, Minimum order 5 pcs, Price range 350-550 BDT, Delivery 3-4 days.",
    },
  ]);

  const [serviceName, setServiceName] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    setSaving(true);

    setTimeout(() => {
      setServices([
        {
          id: Date.now().toString(),
          name: serviceName,
          details: serviceDetails,
        },
        ...services,
      ]);
      setServiceName("");
      setServiceDetails("");
      setSaving(false);
    }, 400);
  };

  const handleDelete = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Description Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm space-y-1">
        <h2 className="text-sm font-bold text-[#111827]">Services</h2>
        <p className="text-xs text-[#6B7280]">
          List each service you offer — one per entry. Put the price, sizes, options and any instructions in the details; your AI agent uses them to answer customers.
        </p>
      </div>

      {/* Add a Service Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#111827]">Add a Service</h3>

        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Service name</label>
            <input
              type="text"
              required
              placeholder="e.g. Business Card Printing"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Details (price, sizes, instructions)</label>
            <textarea
              rows={4}
              required
              placeholder="Describe the service: pricing, sizes/options, minimum order, turnaround..."
              value={serviceDetails}
              onChange={(e) => setServiceDetails(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] leading-relaxed"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>

      {/* Services List / Empty State */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
        {services.length === 0 ? (
          <p className="text-xs text-[#6B7280] text-center py-4">
            No services yet. Use the form above to add your first service.
          </p>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#6B7280]">
              Active Services ({services.length})
            </h3>
            <div className="divide-y divide-[#F3F4F6]">
              {services.map((s) => (
                <div key={s.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#111827]">{s.name}</h4>
                    <p className="text-xs text-[#4B5563] leading-relaxed whitespace-pre-wrap">{s.details}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
