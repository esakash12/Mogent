"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Users,
  Send,
  Search,
  Download,
  Plus,
  CheckCircle2,
  Calendar,
  Phone,
  MapPin,
  Facebook,
  Tag,
  Package,
  Image as ImageIcon,
  ExternalLink,
  MessageCircle,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProducts, createProduct, toggleProductStock, fetchContacts } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  price: number;
  regularPrice: number;
  image: string;
  category: string;
  inStock: boolean;
  salesCount: number;
  description: string;
}

export default function CommerceSectorPage() {
  const [activeTab, setActiveTab] = useState<"ORDERS" | "CATALOG" | "CONTACTS">("CATALOG");

  // Live Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdRegularPrice, setNewProdRegularPrice] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("General");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadProducts = async () => {
    setLoadingProducts(true);
    const data = await fetchProducts();
    if (Array.isArray(data)) {
      setProducts(data);
    } else {
      setProducts([]);
    }
    setLoadingProducts(false);
  };

  useEffect(() => {
    loadProducts();
    fetchContacts().then((data) => {
      if (Array.isArray(data)) setContacts(data);
      else setContacts([]);
    });
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;

    setIsSubmitting(true);
    const res = await createProduct({
      name: newProdName,
      price: Number(newProdPrice),
      regularPrice: newProdRegularPrice ? Number(newProdRegularPrice) : undefined,
      category: newProdCategory,
      description: newProdDescription,
    });

    if (res.success) {
      setShowAddProductModal(false);
      setNewProdName("");
      setNewProdPrice("");
      setNewProdRegularPrice("");
      setNewProdDescription("");
      loadProducts();
    }
    setIsSubmitting(false);
  };

  const handleToggleStock = async (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: !p.inStock } : p))
    );
    await toggleProductStock(id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Orders & Product Catalog
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Manage your store items for Gemini 2.0 AI sales recommendation, order capture, and inventory.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
          <button
            onClick={() => setActiveTab("CATALOG")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              activeTab === "CATALOG"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ORDERS")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              activeTab === "ORDERS"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Captured Orders (0)</span>
          </button>

          <button
            onClick={() => setActiveTab("CONTACTS")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
              activeTab === "CONTACTS"
                ? "bg-white text-black shadow-sm"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Leads ({contacts.length})</span>
          </button>
        </div>
      </div>

      {/* 1. CATALOG TAB */}
      {activeTab === "CATALOG" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888]">
              Products your Gemini AI assistant recommends with real pricing, stock status, and specs.
            </span>

            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product</span>
            </button>
          </div>

          {loadingProducts ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 border border-[#222] bg-[#0A0A0A] rounded-2xl">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="text-xs text-[#888]">Loading catalog...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 border border-[#222] bg-[#0A0A0A] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-amber-500">
                <Package className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[#EDEDED]">Your Product Catalog is Empty</h3>
                <p className="text-xs text-[#777] max-w-sm leading-relaxed">
                  Add products to your store so Gemini 2.0 AI can instantly answer price inquiries, suggest items, and capture delivery details.
                </p>
              </div>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Product</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] space-y-3 hover:border-[#333] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] text-[#888] border border-[#333]">
                        {p.category}
                      </span>
                      <button
                        onClick={() => handleToggleStock(p.id)}
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer",
                          p.inStock
                            ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}
                      >
                        {p.inStock ? "In Stock" : "Out of Stock"}
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-[#EDEDED]">{p.name}</h4>
                    <p className="text-xs text-[#888] line-clamp-2">{p.description || "No description provided."}</p>
                  </div>

                  <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-base text-[#EDEDED]">৳{p.price.toLocaleString()}</span>
                      {p.regularPrice && (
                        <span className="text-xs text-[#666] line-through font-mono">৳{p.regularPrice.toLocaleString()}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#666]">{p.salesCount} sold</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ORDERS TAB */}
      {activeTab === "ORDERS" && (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3 border border-[#222] bg-[#0A0A0A] rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-amber-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-[#EDEDED]">No Orders Captured Yet</h3>
            <p className="text-xs text-[#777] max-w-sm leading-relaxed">
              When a customer confirms a purchase in Facebook Messenger, Gemini 2.0 AI will automatically extract their address, mobile number, items, and log the order here.
            </p>
          </div>
        </div>
      )}

      {/* 3. CONTACTS TAB */}
      {activeTab === "CONTACTS" && (
        <div className="p-6 rounded-2xl border border-[#222] bg-[#0A0A0A] text-center space-y-3">
          <p className="text-xs text-[#888]">
            Total Leads Captured: <strong className="text-[#EDEDED]">{contacts.length}</strong>
          </p>
          <Link
            href="/dashboard/contacts"
            className="px-4 py-2 rounded-xl bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-semibold text-[#EDEDED] inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Open Full Contacts Directory</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h3 className="font-bold text-base text-[#EDEDED]">Add Product to Catalog</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Cotton Polo Shirt"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">Offer Price (BDT)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1250"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#888]">Regular Price (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1600"
                    value={newProdRegularPrice}
                    onChange={(e) => setNewProdRegularPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Clothing / Electronics"
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Product Details & Specs (For AI)</label>
                <textarea
                  rows={3}
                  placeholder="Fabric 100% combed cotton, available colors: Navy, Maroon, Black. Sizes: M, L, XL."
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#0A0A0A] border border-[#333] text-[#EDEDED] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-[#EDEDED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Product</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
