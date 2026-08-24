"use client";

import { useState } from "react";
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
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProducts, createProduct, toggleProductStock } from "@/lib/api";

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

interface Contact {
  id: string;
  name: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
  score: string;
  sentiment: "HIGH_INTENT" | "PURCHASED" | "INQUIRY" | "COMPLAINT";
  lastActive: string;
  psid: string;
}

const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Ultra Smartwatch Pro 2026",
    price: 2450,
    regularPrice: 3200,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
    category: "Smart Electronics",
    inStock: true,
    salesCount: 340,
    description: "AMOLED 1.9-inch display, 7-day battery backup, Heart Rate & SpO2 sensor, Bluetooth Calling.",
  },
  {
    id: "prod-2",
    name: "Wireless ANC Pro Earbuds",
    price: 1900,
    regularPrice: 2500,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60",
    category: "Audio",
    inStock: true,
    salesCount: 215,
    description: "Active Noise Cancellation, 32-hour playback with charging case, Deep bass sound.",
  },
  {
    id: "prod-3",
    name: "Magnetic 65W GaN Fast Charger",
    price: 1250,
    regularPrice: 1600,
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=60",
    category: "Accessories",
    inStock: false,
    salesCount: 88,
    description: "Triple port (2 Type-C, 1 USB-A), supports laptop & mobile fast charging simultaneously.",
  },
];

const mockContacts: Contact[] = [
  {
    id: "cnt-1",
    name: "Tanvir Khan",
    phone: "01819234567",
    address: "House 12, Road 4, Dhanmondi, Dhaka",
    ordersCount: 2,
    totalSpent: 4900,
    score: "+0.85",
    sentiment: "PURCHASED",
    lastActive: "10 mins ago",
    psid: "849204918239102",
  },
  {
    id: "cnt-2",
    name: "Sadia Afrin",
    phone: "01755112233",
    address: "Flat 4B, Sector 11, Uttara, Dhaka",
    ordersCount: 1,
    totalSpent: 3800,
    score: "+0.90",
    sentiment: "PURCHASED",
    lastActive: "1 hour ago",
    psid: "910284918239019",
  },
  {
    id: "cnt-3",
    name: "Rifat Ahmed",
    phone: "01711223344",
    address: "Mirpur 10, Dhaka",
    ordersCount: 0,
    totalSpent: 0,
    score: "+0.60",
    sentiment: "HIGH_INTENT",
    lastActive: "3 hours ago",
    psid: "593019284719283",
  },
  {
    id: "cnt-4",
    name: "Mahmud Hasan",
    phone: "01912998877",
    address: "Chawkbazar, Chattogram",
    ordersCount: 1,
    totalSpent: 1250,
    score: "+0.70",
    sentiment: "PURCHASED",
    lastActive: "Yesterday",
    psid: "482019482019381",
  },
  {
    id: "cnt-5",
    name: "Sabbir Mahmud",
    phone: "01711998877",
    address: "Agrabad, Chattogram",
    ordersCount: 1,
    totalSpent: 2450,
    score: "-0.85",
    sentiment: "COMPLAINT",
    lastActive: "2 days ago",
    psid: "392019482019281",
  },
];

export default function CommerceSectorPage() {
  const [activeTab, setActiveTab] = useState<"ORDERS" | "CATALOG" | "CONTACTS" | "BROADCASTS">("ORDERS");

  // Orders State
  const [orders, setOrders] = useState([
    {
      id: "ord-1",
      orderNumber: "ORD-8921",
      customerName: "Tanvir Khan",
      phone: "01819234567",
      address: "House 12, Road 4, Dhanmondi, Dhaka",
      items: "Ultra Smartwatch Pro (Black) x 1",
      amount: 2450,
      paymentMethod: "COD",
      status: "CONFIRMED",
      capturedAt: "10 mins ago",
    },
    {
      id: "ord-2",
      orderNumber: "ORD-8920",
      customerName: "Sadia Afrin",
      phone: "01755112233",
      address: "Flat 4B, Uttara Sector 11, Dhaka",
      items: "Wireless ANC Earbuds (White) x 2",
      amount: 3800,
      paymentMethod: "BKASH",
      status: "SHIPPED",
      capturedAt: "1 hour ago",
    },
    {
      id: "ord-3",
      orderNumber: "ORD-8919",
      customerName: "Mahmud Hasan",
      phone: "01912998877",
      address: "Chawkbazar, Chattogram",
      items: "Magnetic Fast Charger 65W x 1",
      amount: 1250,
      paymentMethod: "COD",
      status: "PENDING",
      capturedAt: "2 hours ago",
    },
  ]);

  // Product Catalog State
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdRegPrice, setNewProdRegPrice] = useState("");
  const [newProdImg, setNewProdImg] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");

  // Load from DB
  useState(() => {
    fetchProducts().then((data) => {
      if (data && data.length > 0) {
        setProducts(data);
      }
    });
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdPrice.trim()) return;

    const payload = {
      name: newProdName.trim(),
      price: Number(newProdPrice),
      regularPrice: Number(newProdRegPrice) || Number(newProdPrice) * 1.2,
      image: newProdImg.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
      category: "General",
      description: newProdDesc.trim(),
    };

    // Optimistic UI update
    const localNewP: Product = {
      id: `prod-${Date.now()}`,
      ...payload,
      inStock: true,
      salesCount: 0,
    };
    setProducts([localNewP, ...products]);
    setShowAddProduct(false);

    // Call Backend API
    const saved = await createProduct(payload);
    if (saved) {
      setProducts((prev) => prev.map((p) => (p.id === localNewP.id ? saved : p)));
    }

    setNewProdName("");
    setNewProdPrice("");
    setNewProdRegPrice("");
    setNewProdImg("");
    setNewProdDesc("");
  };

  const handleToggleProductStock = async (id: string) => {
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: !p.inStock } : p))
    );
    await toggleProductStock(id);
  };

  // Contacts State
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [contactSearch, setContactSearch] = useState("");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Sector Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">
            Commerce & Customer CRM
          </h1>
          <p className="text-xs text-[#888] mt-0.5">
            Manage your product inventory, automated sales orders, customer contacts, and WhatsApp outreach.
          </p>
        </div>

        {/* The Sector Top Navigation Tabs (No scrollbar) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111] border border-[#222]">
          <button
            onClick={() => setActiveTab("ORDERS")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "ORDERS"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders & Sales ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("CATALOG")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "CATALOG"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("BROADCASTS")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all",
              activeTab === "BROADCASTS"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-[#888] hover:text-[#EDEDED]"
            )}
          >
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>Broadcasts</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDERS & SALES */}
      {/* ========================================================================= */}
      {activeTab === "ORDERS" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Captured Orders</span>
              <p className="text-2xl font-bold text-[#EDEDED] mt-1">{orders.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Gross Sales</span>
              <p className="text-2xl font-bold text-[#10B981] mt-1">৳ 7,500</p>
            </div>
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Pending Processing</span>
              <p className="text-2xl font-bold text-amber-500 mt-1">1</p>
            </div>
            <div className="p-4 rounded-xl border border-[#222] bg-[#0A0A0A]">
              <span className="text-xs text-[#888]">Avg Order Value</span>
              <p className="text-2xl font-bold text-[#EDEDED] mt-1">৳ 2,500</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222] text-[#888] font-semibold">
                <tr>
                  <th className="p-4">Order</th>
                  <th className="p-4">Customer & Phone</th>
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Amount & Mode</th>
                  <th className="p-4">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#111]/40">
                    <td className="p-4 font-mono font-semibold text-[#EDEDED]">{ord.orderNumber}</td>
                    <td className="p-4">
                      <p className="font-semibold text-[#EDEDED]">{ord.customerName}</p>
                      <p className="text-[#888] font-mono">{ord.phone}</p>
                    </td>
                    <td className="p-4 text-[#EDEDED]">{ord.items}</td>
                    <td className="p-4">
                      <span className="font-bold font-mono text-[#EDEDED]">৳ {ord.amount}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#222] text-[#888] ml-2 border border-[#333]">
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PRODUCT CATALOG WITH IMAGES & AI AUTO-SEND */}
      {/* ========================================================================= */}
      {activeTab === "CATALOG" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-[#EDEDED]">Product Inventory & Cards</h3>
              <p className="text-xs text-[#888]">
                Products added here are automatically learned by Gemini AI to share photos, prices, and specs in Messenger!
              </p>
            </div>

            <button
              onClick={() => setShowAddProduct(true)}
              className="px-4 py-2.5 rounded-lg bg-white text-black font-bold text-xs flex items-center gap-2 hover:bg-[#EDEDED] transition-colors w-fit"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="rounded-2xl border border-[#222] bg-[#0A0A0A] hover:border-[#333] transition-all overflow-hidden flex flex-col justify-between group"
              >
                {/* Product Image Box */}
                <div className="relative h-44 w-full bg-[#111] overflow-hidden">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-md backdrop-blur-md",
                        prod.inStock
                          ? "bg-[#10B981]/90 text-black border-transparent"
                          : "bg-red-500/90 text-white border-transparent"
                      )}
                    >
                      {prod.inStock ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 text-[#EDEDED] border border-white/10 backdrop-blur-md">
                      {prod.category}
                    </span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm text-[#EDEDED] leading-snug">{prod.name}</h4>
                    <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">{prod.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#222] flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-[#EDEDED] font-mono">৳ {prod.price.toLocaleString()}</span>
                      <span className="text-xs text-[#666] line-through ml-2 font-mono">৳ {prod.regularPrice.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => handleToggleProductStock(prod.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors",
                        prod.inStock
                          ? "bg-[#111] text-[#888] hover:text-[#EDEDED] border-[#333]"
                          : "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                      )}
                    >
                      {prod.inStock ? "Mark Out of Stock" : "Mark In Stock"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-[#333] bg-[#0A0A0A] p-6 space-y-5 animate-in zoom-in-95 duration-150">
                <h3 className="text-base font-bold text-[#EDEDED]">Add Product to Catalog</h3>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#888] mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ultra Smartwatch Pro"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#888] mb-1">Sale Price (BDT ৳)</label>
                      <input
                        type="number"
                        required
                        placeholder="2450"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#888] mb-1">Regular Price (৳)</label>
                      <input
                        type="number"
                        placeholder="3200"
                        value={newProdRegPrice}
                        onChange={(e) => setNewProdRegPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#888] mb-1">Product Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg (or leave blank for placeholder)"
                      value={newProdImg}
                      onChange={(e) => setNewProdImg(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#888] mb-1">Specs & AI Description</label>
                    <textarea
                      rows={3}
                      placeholder="Display size, battery life, features for AI to explain to buyers..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111] border border-[#333] text-xs text-[#EDEDED] focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(false)}
                      className="px-4 py-2 rounded-lg bg-[#111] text-xs text-[#888]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-[#EDEDED]"
                    >
                      Save Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONTACTS DIRECTORY WITH 1-CLICK WHATSAPP */}
      {/* ========================================================================= */}
      {activeTab === "CONTACTS" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contact by name or phone..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-[#111] border border-[#222] text-[#EDEDED] focus:outline-none focus:border-[#444] placeholder:text-[#555]"
              />
            </div>

            <button className="px-4 py-2 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-xs font-semibold text-[#EDEDED] flex items-center gap-2 w-fit">
              <Download className="w-3.5 h-3.5" />
              <span>Export Contacts (CSV)</span>
            </button>
          </div>

          <div className="rounded-xl border border-[#222] bg-[#0A0A0A] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111] border-b border-[#222] text-[#888] font-semibold">
                <tr>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Delivery Location</th>
                  <th className="p-4">Total Orders</th>
                  <th className="p-4">AI Sentiment</th>
                  <th className="p-4 text-right">Instant Outreach</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {contacts
                  .filter((c) =>
                    c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                    c.phone.includes(contactSearch)
                  )
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-[#111]/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center font-bold text-xs text-[#EDEDED]">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#EDEDED]">{c.name}</p>
                            <p className="text-[10px] text-[#666] font-mono">PSID: {c.psid.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono font-semibold text-[#EDEDED]">
                        {c.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#666]" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-[#666]">Not captured yet</span>
                        )}
                      </td>

                      <td className="p-4 text-[#888] max-w-xs truncate">
                        {c.address ? (
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3 h-3 text-[#666] shrink-0" />
                            <span className="truncate">{c.address}</span>
                          </span>
                        ) : (
                          <span className="text-[#666]">--</span>
                        )}
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-[#EDEDED] font-mono">{c.ordersCount} Orders</p>
                        <p className="text-[10px] text-[#888] font-mono">৳ {c.totalSpent.toLocaleString()}</p>
                      </td>

                      <td className="p-4">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            c.sentiment === "PURCHASED"
                              ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20"
                              : c.sentiment === "HIGH_INTENT"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          )}
                        >
                          {c.score} • {c.sentiment}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.phone && (
                            <a
                              href={`https://wa.me/88${c.phone.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(c.name)},%20thank%20you%20for%20contacting%20us!`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold text-[11px] border border-[#25D366]/30 flex items-center gap-1.5 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <Link
                            href="/dashboard/inbox"
                            className="p-1.5 rounded-lg bg-[#111] hover:bg-[#222] border border-[#222] text-[#888] hover:text-[#EDEDED] transition-colors"
                            title="Open in Inbox"
                          >
                            <Facebook className="w-3.5 h-3.5 text-blue-400" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BROADCASTS */}
      {/* ========================================================================= */}
      {activeTab === "BROADCASTS" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl border border-[#222] bg-[#0A0A0A] flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-[#EDEDED]">Facebook 24h Policy Compliant Campaigns</h4>
              <p className="text-xs text-[#888]">Re-engage past buyers with discounts and product restock alerts.</p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs hover:bg-[#EDEDED]">
              + New Broadcast
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
