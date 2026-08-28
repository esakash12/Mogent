"use client";

import { useState, useEffect } from "react";
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
import { fetchKnowledgeAndWhatsApp, createKnowledgeItem, deleteKnowledgeItem } from "@/lib/api";

interface ServiceItem {
  id: string;
  name: string;
  details: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchKnowledgeAndWhatsApp();
      if (data && Array.isArray(data.items)) {
        const sItems = data.items
          .filter((i: any) => i.category === "SERVICE_OFFERING" || i.category === "SERVICE")
          .map((i: any) => ({
            id: i.id,
            name: i.title,
            details: i.content,
          }));
        setServices(sItems);
      }
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    setSaving(true);

    try {
      const created = await createKnowledgeItem({
        title: serviceName.trim(),
        category: "SERVICE_OFFERING",
        content: serviceDetails.trim(),
      });

      setServices([
        {
          id: created?.id || Date.now().toString(),
          name: serviceName.trim(),
          details: serviceDetails.trim(),
        },
        ...services,
      ]);
      setServiceName("");
      setServiceDetails("");
    } catch (err) {
      console.error("Error creating service:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setServices(services.filter((s) => s.id !== id));
    try {
      await deleteKnowledgeItem(id);
    } catch (err) {
      console.error("Error deleting service:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Description Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-1">
        <h2 className="text-sm font-bold text-[#0F172A]">Services</h2>
        <p className="text-xs text-[#475569]">
          List each service you offer — one per entry. Put the price, sizes, options and any instructions in the details; your AI agent uses them to answer customers.
        </p>
      </div>

      {/* Add a Service Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#0F172A]">Add a Service</h3>

        <form onSubmit={handleSaveService} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">Service name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Business Card Printing / Custom Stitching"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#334155] mb-1">Details (price, turnaround, instructions) *</label>
            <textarea
              rows={4}
              required
              placeholder="Describe the service: pricing, minimum order quantity, turnaround time, design options..."
              value={serviceDetails}
              onChange={(e) => setServiceDetails(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] leading-relaxed"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? "Saving Service..." : "Save Service"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Services List */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#475569]">
          Active Services ({services.length})
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            <span className="text-xs font-bold text-[#64748B]">Loading services...</span>
          </div>
        ) : services.length > 0 ? (
          <div className="divide-y divide-[#F1F5F9]">
            {services.map((service) => (
              <div key={service.id} className="p-5 flex items-start justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#0F172A]">{service.name}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-[10px] font-bold">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed whitespace-pre-line font-medium">
                    {service.details}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2 rounded-xl text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer shrink-0"
                  title="Delete Service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <Wrench className="w-8 h-8 text-[#CBD5E1] mx-auto" />
            <p className="text-xs font-bold text-[#0F172A]">No services added yet</p>
            <p className="text-[11px] text-[#64748B]">
              Add your custom services, embroidery, stitching or repair offerings above for your AI agent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
