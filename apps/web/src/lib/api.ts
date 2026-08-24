const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// --- ANALYTICS ---
export async function fetchAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/analytics`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback analytics data:", err);
    return null;
  }
}

// --- CONVERSATIONS ---
export async function fetchConversations() {
  try {
    const res = await fetch(`${API_BASE}/api/conversations`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback conversations data:", err);
    return null;
  }
}

export async function fetchMessages(conversationId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch messages");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback messages data:", err);
    return null;
  }
}

export async function sendMessage(conversationId: string, text: string) {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error("Error sending message:", err);
    return null;
  }
}

export async function toggleConversationMode(conversationId: string, isHumanControl: boolean) {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/mode`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHumanControl }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error toggling mode:", err);
    return false;
  }
}

// --- PRODUCTS ---
export async function fetchProducts() {
  try {
    const res = await fetch(`${API_BASE}/api/products`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback products data:", err);
    return null;
  }
}

export async function createProduct(data: {
  name: string;
  price: number;
  regularPrice?: number;
  image?: string;
  category?: string;
  description?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error("Error creating product:", err);
    return null;
  }
}

export async function toggleProductStock(productId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/products/${productId}/stock`, {
      method: "PATCH",
    });
    const json = await res.json();
    return json.inStock;
  } catch (err) {
    console.error("Error toggling product stock:", err);
    return null;
  }
}

// --- CONTACTS ---
export async function fetchContacts(filter?: string) {
  try {
    const url = filter ? `${API_BASE}/api/contacts?filter=${filter}` : `${API_BASE}/api/contacts`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch contacts");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback contacts data:", err);
    return null;
  }
}

// --- KNOWLEDGE & WHATSAPP ---
export async function fetchKnowledgeAndWhatsApp() {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch knowledge");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback knowledge data:", err);
    return null;
  }
}

export async function createKnowledgeItem(data: { title: string; category: string; content: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error("Error creating knowledge item:", err);
    return null;
  }
}

export async function deleteKnowledgeItem(id: string) {
  try {
    await fetch(`${API_BASE}/api/knowledge/${id}`, { method: "DELETE" });
    return true;
  } catch (err) {
    console.error("Error deleting knowledge item:", err);
    return false;
  }
}

export async function saveWhatsAppProtocol(data: {
  mode: string;
  number: string;
  hotline: string;
  address: string;
  prefillText: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    console.error("Error saving WhatsApp protocol:", err);
    return false;
  }
}
