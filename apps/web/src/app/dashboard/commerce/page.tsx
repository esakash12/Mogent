"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  Facebook,
  Rss,
  Globe,
  Eye,
  Trash2,
  Edit2,
  CheckCircle2,
  Loader2,
  UploadCloud,
  X,
  Box,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchProducts,
  createProduct,
  toggleProductStock,
  deleteProduct,
  uploadImageFile,
  importProductFromUrl,
  importProductFromFacebook,
  importProductFromFeed,
} from "@/lib/api";
import { ConfirmModal } from "@/components/confirm-modal";

interface Product {
  id: string;
  name: string;
  price: number;
  regularPrice?: number;
  image?: string;
  category?: string;
  inStock: boolean;
  stockCount?: number;
  salesCount?: number;
  description?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Manual Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("General");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Web Import Modal
  const [showWebModal, setShowWebModal] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [isImportingWeb, setIsImportingWeb] = useState(false);

  // Feed Import Modal
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [isImportingFeed, setIsImportingFeed] = useState(false);

  // Facebook Import State
  const [isImportingFb, setIsImportingFb] = useState(false);

  // Toast / Status Message
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete State
  const [deleteItem, setDeleteItem] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;
    setIsSubmitting(true);
    try {
      await createProduct({
        name: newProdName,
        price: parseFloat(newProdPrice),
        regularPrice: parseFloat(newProdPrice),
        category: newProdCategory,
        description: newProdDescription,
        image: newProdImage,
      });
      setShowAddModal(false);
      setNewProdName("");
      setNewProdPrice("");
      setNewProdDescription("");
      setNewProdImage("");
      setStatusMsg({ type: "success", text: "Product successfully added to catalog!" });
      await loadData();
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ type: "error", text: "Failed to create product." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webUrl.trim()) return;
    setIsImportingWeb(true);
    try {
      const res = await importProductFromUrl(webUrl);
      if (res?.success) {
        setShowWebModal(false);
        setWebUrl("");
        setStatusMsg({ type: "success", text: res.message || "Product imported from Web URL!" });
        await loadData();
      } else {
        setStatusMsg({ type: "error", text: res?.error || "Failed to import from web URL." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error importing from URL." });
    } finally {
      setIsImportingWeb(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleImportFacebook = async () => {
    setIsImportingFb(true);
    try {
      const res = await importProductFromFacebook();
      if (res?.success) {
        setStatusMsg({ type: "success", text: res.message || `Imported products from Facebook!` });
        await loadData();
      } else {
        setStatusMsg({ type: "error", text: res?.error || "Failed to import from Facebook." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error syncing with Facebook." });
    } finally {
      setIsImportingFb(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleImportFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;
    setIsImportingFeed(true);
    try {
      const res = await importProductFromFeed(feedUrl);
      if (res?.success) {
        setShowFeedModal(false);
        setFeedUrl("");
        setStatusMsg({ type: "success", text: res.message || "Feed products imported successfully!" });
        await loadData();
      } else {
        setStatusMsg({ type: "error", text: res?.error || "Failed to import from feed." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Error parsing feed." });
    } finally {
      setIsImportingFeed(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const res = await uploadImageFile(file);
      if (res?.url) {
        setNewProdImage(res.url);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deleteItem.id);
      setProducts(products.filter((p) => p.id !== deleteItem.id));
      setDeleteItem(null);
      setStatusMsg({ type: "success", text: "Product deleted from catalog." });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStock = async (product: Product) => {
    try {
      setProducts(
        products.map((p) => (p.id === product.id ? { ...p, inStock: !p.inStock } : p))
      );
      await toggleProductStock(product.id);
    } catch (err) {
      console.error("Toggle stock error:", err);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {statusMsg && (
        <div
          className={cn(
            "p-3.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-sm animate-in fade-in",
            statusMsg.type === "success"
              ? "bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669]"
              : "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, description, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Import from Web URL */}
          <button
            onClick={() => setShowWebModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] transition-all shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#059669]" />
            <span>Web to Product</span>
          </button>

          {/* Import from Facebook */}
          <button
            onClick={handleImportFacebook}
            disabled={isImportingFb}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isImportingFb ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1877F2]" />
            ) : (
              <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
            )}
            <span>{isImportingFb ? "Syncing..." : "Facebook থেকে এড"}</span>
          </button>

          {/* Import from Feed */}
          <button
            onClick={() => setShowFeedModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0F172A] transition-all shadow-xs cursor-pointer"
          >
            <Rss className="w-3.5 h-3.5 text-[#D97706]" />
            <span>ফিড থেকে ইমপোর্ট</span>
          </button>

          {/* Add Product Manual */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-extrabold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Product Table Container */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9] text-xs font-bold text-[#475569] flex items-center justify-between">
          <span>
            {filteredProducts.length} {filteredProducts.length === 1 ? "Product" : "Products"} in Live Catalog
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin mx-auto" />
            <p className="text-xs font-bold text-[#64748B]">Loading products catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFFBEB] text-[#92400E] flex items-center justify-center mx-auto border border-[#FDE68A]">
              <Package className="w-7 h-7 text-[#D97706]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">No products in catalog yet</h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
                Add products manually, import from Facebook, or scrape from your web URL so your AI agent knows what to recommend.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black text-xs font-extrabold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
              <button
                onClick={() => setShowWebModal(true)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4 text-[#059669]" />
                <span>Web to Product</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Product Info</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price (BDT)</th>
                  <th className="p-4">Stock Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] font-medium">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E2E8F0] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#64748B] shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[#0F172A] text-xs truncate max-w-xs">{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] text-[#64748B] truncate max-w-xs mt-0.5">{p.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] text-[10px] font-bold">
                        {p.category || "General"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-black text-xs text-[#0F172A]">৳{p.price.toLocaleString()}</span>
                        {p.regularPrice && p.regularPrice > p.price && (
                          <span className="text-[10px] text-[#94A3B8] line-through block">
                            ৳{p.regularPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStock(p)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer",
                          p.inStock
                            ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                            : "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            p.inStock ? "bg-[#059669]" : "bg-[#DC2626]"
                          )}
                        />
                        <span>{p.inStock ? "In Stock" : "Out of Stock"}</span>
                      </button>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => setDeleteItem(p)}
                        className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WEB TO PRODUCT MODAL */}
      {showWebModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#059669]" />
                <span>Web to Product (Scrape from URL)</span>
              </h3>
              <button onClick={() => setShowWebModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Enter any product URL from your website or ecommerce store. Mogent AI will extract the product title, image, price, and description automatically.
            </p>

            <form onSubmit={handleImportWeb} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Product Web URL *</label>
                <input
                  type="text"
                  required
                  placeholder="https://yourstore.com/products/polo-shirt"
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowWebModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingWeb || !webUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isImportingWeb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isImportingWeb ? "Scraping..." : "Scrape & Add Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEED IMPORT MODAL */}
      {showFeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Rss className="w-4 h-4 text-[#D97706]" />
                <span>ফিড থেকে প্রডাক্ট ইমপোর্ট (Feed URL)</span>
              </h3>
              <button onClick={() => setShowFeedModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Enter your Google Merchant XML, WooCommerce, Shopify RSS, or JSON product feed URL to batch import catalog items.
            </p>

            <form onSubmit={handleImportFeed} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Data Feed URL (XML / RSS / JSON) *</label>
                <input
                  type="text"
                  required
                  placeholder="https://yourstore.com/feed/products.xml"
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowFeedModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingFeed || !feedUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isImportingFeed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rss className="w-3.5 h-3.5" />}
                  <span>{isImportingFeed ? "Importing..." : "Start Feed Sync"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MANUAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium Cotton Polo Shirt"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Price (BDT) *</label>
                  <input
                    type="number"
                    required
                    placeholder="550"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="Clothing / Shoes"
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Product Image URL / Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/product.jpg"
                    value={newProdImage}
                    onChange={(e) => setNewProdImage(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B]"
                  />
                  <label className="px-3 py-2 rounded-xl border border-[#CBD5E1] hover:bg-[#F8FAFC] text-xs font-bold text-[#0F172A] flex items-center gap-1.5 cursor-pointer shrink-0">
                    {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Description / Sizes / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Available sizes: M, L, XL, XXL. 100% Combed Cotton. 2-day delivery across BD."
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:border-[#F59E0B] leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-extrabold text-xs disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        description={`Are you sure you want to remove "${deleteItem?.name}" from your AI product catalog?`}
        confirmText="Delete Product"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
