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
  Loader2,
  UploadCloud,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProducts, createProduct, toggleProductStock, deleteProduct, uploadImageFile, fetchContacts, fetchPages } from "@/lib/api";
import { ConfirmModal } from "@/components/confirm-modal";

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
  const [activeTab, setActiveTab] = useState<"CATALOG" | "ORDERS" | "CONTACTS">("CATALOG");
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>("ALL");

  // Live Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdRegularPrice, setNewProdRegularPrice] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("General");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async (pageId = selectedPageId) => {
    setLoadingProducts(true);
    try {
      const [prodsData, pagesData, contactsData] = await Promise.all([
        fetchProducts(),
        fetchPages(),
        fetchContacts(undefined, pageId),
      ]);
      if (Array.isArray(prodsData)) setProducts(prodsData);
      if (Array.isArray(pagesData)) setPages(pagesData);
      if (Array.isArray(contactsData)) setContacts(contactsData);
    } catch (err) {
      console.error("Failed to load commerce data:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("mogent_active_page_id") : null;
    const initialPage = saved || "ALL";
    setSelectedPageId(initialPage);
    loadData(initialPage);

    const handleGlobalPageChange = (e: any) => {
      const newPageId = e.detail?.pageId || "ALL";
      setSelectedPageId(newPageId);
      loadData(newPageId);
    };

    window.addEventListener("mogent_page_changed", handleGlobalPageChange);
    return () => window.removeEventListener("mogent_page_changed", handleGlobalPageChange);
  }, []);

  const handlePageChange = (newPageId: string) => {
    setSelectedPageId(newPageId);
    if (typeof window !== "undefined") {
      localStorage.setItem("mogent_active_page_id", newPageId);
    }
    loadData(newPageId);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const res = await uploadImageFile(file);
    if (res.success && res.url) {
      setNewProdImage(res.url);
    } else {
      console.error("Image upload failed:", res.error);
    }
    setIsUploadingImage(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;

    setIsSubmitting(true);
    const res = await createProduct({
      name: newProdName,
      price: Number(newProdPrice),
      regularPrice: newProdRegularPrice ? Number(newProdRegularPrice) : undefined,
      image: newProdImage || undefined,
      category: newProdCategory,
      description: newProdDescription,
    });

    if (res) {
      setShowAddProductModal(false);
      setNewProdName("");
      setNewProdPrice("");
      setNewProdRegularPrice("");
      setNewProdDescription("");
      setNewProdImage("");
      loadData();
    }
    setIsSubmitting(false);
  };

  const handleToggleStock = async (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: !p.inStock } : p))
    );
    await toggleProductStock(id);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    const success = await deleteProduct(deleteItem.id);
    if (success) {
      setProducts((prev) => prev.filter((p) => p.id !== deleteItem.id));
    }
    setIsDeleting(false);
    setDeleteItem(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Tabs & Page Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED] flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-amber-500" />
              <span>Orders & Product Catalog</span>
            </h1>
            {selectedPageId !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold font-mono">
                📄 {pages.find((p) => p.id === selectedPageId)?.name || "Selected Page"}
              </span>
            )}
          </div>
          <p className="text-xs text-[#888] mt-0.5">
            Manage your store items for Mogent AI sales recommendation, order capture, and inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
            <button
              onClick={() => setActiveTab("CATALOG")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                activeTab === "CATALOG"
                  ? "bg-white text-black shadow-sm font-bold"
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
                  ? "bg-white text-black shadow-sm font-bold"
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
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-[#888] hover:text-[#EDEDED]"
              )}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Leads ({contacts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. CATALOG TAB */}
      {activeTab === "CATALOG" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888]">
              Products your Mogent AI assistant recommends with real pricing, stock status, and specs.
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
                  Add products to your store so Mogent AI can instantly answer price inquiries, suggest items, and capture delivery details.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-[#222] bg-[#0A0A0A] overflow-hidden hover:border-[#333] transition-all flex flex-col justify-between group"
                >
                  {/* Image banner */}
                  {p.image && (
                    <div className="w-full h-40 bg-[#141414] overflow-hidden relative border-b border-[#1C1C1C]">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <button
                        onClick={() => setDeleteItem(p)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white/80 hover:text-white backdrop-blur-md transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1C1C1C] text-[#888] border border-[#333]">
                          {p.category}
                        </span>
                        <div className="flex items-center gap-2">
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
                          {!p.image && (
                            <button
                              onClick={() => setDeleteItem(p)}
                              className="p-1 rounded text-[#555] hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
              When a customer confirms a purchase in Facebook Messenger, Mogent AI will automatically extract their address, mobile number, items, and log the order here.
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
          <div className="w-full max-w-lg rounded-2xl bg-[#111] border border-[#333] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h3 className="font-bold text-base text-[#EDEDED]">Add Product to Catalog</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-[#888] hover:text-[#EDEDED] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Product Image Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Product Image (Cloudflare R2 Storage)</label>
                {newProdImage ? (
                  <div className="relative w-full h-36 rounded-xl bg-[#0A0A0A] border border-[#333] overflow-hidden group">
                    <img src={newProdImage} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewProdImage("")}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-28 border-2 border-dashed border-[#333] hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-[#0A0A0A] transition-colors">
                    {isUploadingImage ? (
                      <div className="flex items-center gap-2 text-xs text-amber-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading to Cloudflare R2...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-[#777]" />
                        <span className="text-xs text-[#AAA] font-medium">Click to upload product image</span>
                        <span className="text-[10px] text-[#666]">JPG, PNG, WebP up to 5MB</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

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
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#888] hover:text-[#EDEDED] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Product</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={confirmDeleteProduct}
        title="Delete Product"
        description={`Are you sure you want to remove "${deleteItem?.name}" from your store catalog? Mogent AI will no longer pitch or sell this item.`}
        confirmText="Delete Product"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
