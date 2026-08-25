const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function getHeaders(customHeaders: Record<string, string> = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : null;
  const workspaceStr = typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") : null;
  let workspaceId = "";
  if (workspaceStr) {
    try {
      workspaceId = JSON.parse(workspaceStr)?.id || "";
    } catch {}
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (workspaceId) {
    headers["x-workspace-id"] = workspaceId;
  }

  return headers;
}

// --- ANALYTICS ---
export async function fetchAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/analytics`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback analytics data:", err);
    return null;
  }
}

// --- FACEBOOK PAGES ---
export async function fetchPages() {
  try {
    const res = await fetch(`${API_BASE}/api/pages`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch pages");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("Error fetching pages:", err);
    return [];
  }
}

export async function fetchFacebookConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/pages/facebook/config`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    return null;
  }
}

export async function inspectFacebookToken(token: string) {
  try {
    const res = await fetch(`${API_BASE}/api/pages/inspect-token`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ token }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function connectFacebookPagesOAuth(pages: Array<{ id: string; name: string; accessToken: string; category?: string }>) {
  try {
    const res = await fetch(`${API_BASE}/api/pages/facebook/oauth-connect`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ pages }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createPage(data: {
  name: string;
  pageId: string;
  accessToken: string;
  systemPrompt?: string;
  aiMode?: string;
  category?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/pages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error("Error creating page:", err);
    return null;
  }
}

export async function updatePageSettings(
  pageId: string,
  data: { aiMode?: string; systemPrompt?: string; temperature?: number }
) {
  try {
    const res = await fetch(`${API_BASE}/api/pages/${pageId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.success;
  } catch (err) {
    console.error("Error updating page:", err);
    return false;
  }
}

export async function deletePage(pageId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/pages/${pageId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const json = await res.json();
    return json.success;
  } catch (err) {
    console.error("Error deleting page:", err);
    return false;
  }
}

// --- CONVERSATIONS ---
export async function fetchConversations() {
  try {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("Using fallback conversations data:", err);
    return null;
  }
}

export async function fetchMessages(conversationId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch messages");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("Using fallback messages data:", err);
    return null;
  }
}

export async function sendMessage(conversationId: string, text: string) {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: getHeaders(),
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
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/toggle-mode`, {
      method: "POST",
      headers: getHeaders(),
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
    const res = await fetch(`${API_BASE}/api/products`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();
    return json.data || [];
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
      headers: getHeaders(),
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
      headers: getHeaders(),
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
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch contacts");
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("Using fallback contacts data:", err);
    return null;
  }
}

// --- KNOWLEDGE & WHATSAPP ---
export async function fetchKnowledgeAndWhatsApp() {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge`, {
      headers: getHeaders(),
      cache: "no-store",
    });
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
      headers: getHeaders(),
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
    await fetch(`${API_BASE}/api/knowledge/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
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
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (err) {
    console.error("Error saving WhatsApp protocol:", err);
    return false;
  }
}

export async function saveSystemPrompt(data: { systemPrompt: string; businessName?: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/system-prompt`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save system prompt" };
  }
}

// --- BILLING & PAYMENTS ---
export async function fetchBillingStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/billing`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch billing");
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn("Using fallback billing data:", err);
    return null;
  }
}

export async function submitPayment(data: {
  plan: string;
  method: string;
  senderNumber: string;
  trxId: string;
  notes?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/billing/submit-payment`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit payment" };
  }
}

export async function testPlaygroundChat(message: string, history: Array<{ role: string; content: string }>) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/playground`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, history }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach AI Playground" };
  }
}



