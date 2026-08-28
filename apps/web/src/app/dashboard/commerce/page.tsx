"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  Facebook,
  Rss,
  Eye,
  Trash2,
  Edit2,
  CheckCircle2,
  Loader2,
  UploadCloud,
  X,
  Box,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProducts, createProduct, toggleProductStock, deleteProduct, uploadImageFile } from "@/lib/api";
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
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("100");
  const [newProdCategory, setNewProdCategory] = useState("General");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await loadData();
    } catch (err) {
      console.error("Failed to create product:", err);
    } finally {
      setIsSubmitting(false);
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
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, description, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/10 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => alert("Facebook Catalog Sync initiated.")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition-all shadow-sm cursor-pointer"
          >
            <Facebook className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Import from Facebook</span>
          </button>

          <button
            onClick={() => alert("Feed Sync initiated.")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F9FAFB] border border-[#E5E7EB] text-xs font-semibold text-[#374151] transition-all shadow-sm cursor-pointer"
          >
            <Rss className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Import from Feed</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Product Table Container */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F3F4F6] text-xs font-bold text-[#6B7280]">
          {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin mx-auto" />
            <p className="text-xs text-[#6B7280]">Loading products catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center mx-auto border border-[#FDE68A]">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">No products in catalog</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
                Add your products or import from Facebook so your AI agent knows what to recommend.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Product</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] text-[#6B7280] font-semibold border-b border-[#E5E7EB]">
                <tr>
                  <th className="p-4 w-10">
                    <input type="checkbox" className="rounded border-[#D1D5DB] text-[#F59E0B]" />
                  </th>
                  <th className="p-4 w-20">Image</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Availability</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[#F9FAFB] transition-colors group">
                    <td className="p-4">
                      <input type="checkbox" className="rounded border-[#D1D5DB] text-[#F59E0B]" />
                    </td>
                    <td className="p-4">
                      <div className="w-12 h-12 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] overflow-hidden flex items-center justify-center shrink-0">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-[#9CA3AF]" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-[#111827]">
                      <p className="line-clamp-2 max-w-md">{prod.name}</p>
                      {prod.category && (
                        <span className="text-[10px] text-[#6B7280] font-normal">{prod.category}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-[#111827]">
                      ৳{prod.price}
                    </td>
                    <td className="p-4 text-[#4B5563] font-medium">
                      {prod.stockCount || 100}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStock(prod)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer",
                          prod.inStock
                            ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                            : "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
                        )}
                      >
                        <Box className="w-3 h-3" />
                        <span>{prod.inStock ? "In stock" : "Out of stock"}</span>
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDeleteItem(prod)}
                          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#F3F4F6]">
              <h3 className="text-sm font-bold text-[#111827]">Add New Product</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Premium ID Card Printing"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Price (৳) *</label>
                  <input
                    type="number"
                    required
                    placeholder="150"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Category</label>
                <input
                  type="text"
                  placeholder="Printing, Apparel, Electronics..."
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  placeholder="Mention delivery turnaround, size options, warranty, etc."
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F59E0B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">Product Image</label>
                <div className="flex items-center gap-3">
                  {newProdImage && (
                    <img src={newProdImage} alt="Preview" className="w-12 h-12 rounded-xl object-cover border" />
                  )}
                  <label className="flex-1 border border-dashed border-[#D1D5DB] hover:border-[#F59E0B] rounded-xl p-3 text-center cursor-pointer hover:bg-[#FFFBEB] transition-colors">
                    <span className="text-xs text-[#6B7280]">
                      {isUploadingImage ? "Uploading image..." : "Upload product photo"}
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F3F4F6]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteItem?.name}" from your catalog?`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
}
