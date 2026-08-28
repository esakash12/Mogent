const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function safeFetchJson<T = any>(res: Response, fallback: T = null as any): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function getHeaders(customHeaders: Record<string, string> = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : null;
  const workspaceStr = typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") : null;
  let workspaceId = "";
  if (workspaceStr) {
    try {
      if (workspaceStr.startsWith("{")) {
        workspaceId = JSON.parse(workspaceStr)?.id || "";
      } else if (workspaceStr !== "null" && workspaceStr !== "undefined") {
        workspaceId = workspaceStr;
      }
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
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
    return await safeFetchJson(res);
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
    return await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
    return json.data;
  } catch (err) {
    console.error("Error creating page:", err);
    return null;
  }
}

export async function updatePageSettings(
  pageId: string,
  data: {
    aiMode?: string;
    systemPrompt?: string;
    temperature?: number;
    autoReplyEnabled?: boolean;
    commentReplyEnabled?: boolean;
    privateReplyEnabled?: boolean;
  }
) {
  try {
    const res = await fetch(`${API_BASE}/api/pages/${pageId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
    return json.success;
  } catch (err) {
    console.error("Error deleting page:", err);
    return false;
  }
}

// --- CONVERSATIONS ---
export async function fetchConversations(queryString: string = "") {
  try {
    const url = `${API_BASE}/api/conversations${queryString}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch conversations");
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
    return json.inStock;
  } catch (err) {
    console.error("Error toggling product stock:", err);
    return null;
  }
}

export async function deleteProduct(productId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/products/${productId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const json = await safeFetchJson(res);
    return json.success;
  } catch (err) {
    console.error("Error deleting product:", err);
    return false;
  }
}

export async function importProductFromUrl(url: string) {
  try {
    const res = await fetch(`${API_BASE}/api/products/import-url`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ url }),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function importProductFromFacebook() {
  try {
    const res = await fetch(`${API_BASE}/api/products/import-facebook`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function importProductFromFeed(feedUrl: string) {
  try {
    const res = await fetch(`${API_BASE}/api/products/import-feed`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ feedUrl }),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function uploadImageFile(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_token") : "";
    const wsId = typeof window !== "undefined" ? localStorage.getItem("mogent_workspace_id") : "";

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(wsId ? { "x-workspace-id": wsId } : {}),
      },
      body: formData,
    });

    const json = await safeFetchJson(res);
    if (json.success && json.data) {
      return { success: true, url: json.data.url };
    }
    return { success: false, error: json.error || "Upload failed" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error during upload" };
  }
}

// --- CONTACTS ---
export async function fetchContacts(filter?: string, pageId?: string) {
  try {
    const params = new URLSearchParams();
    if (filter) params.append("filter", filter);
    if (pageId && pageId !== "ALL") params.append("pageId", pageId);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE}/api/contacts${queryString}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch contacts");
    const json = await safeFetchJson(res);
    return json.data || [];
  } catch (err) {
    console.warn("Using fallback contacts data:", err);
    return null;
  }
}

// --- KNOWLEDGE & WHATSAPP ---
export async function fetchKnowledgeAndWhatsApp(pageId?: string) {
  try {
    const url = pageId && pageId !== "ALL"
      ? `${API_BASE}/api/knowledge?pageId=${pageId}`
      : `${API_BASE}/api/knowledge`;
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch knowledge");
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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

export async function saveSystemPrompt(data: { systemPrompt: string; businessName?: string; pageId?: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/system-prompt`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await safeFetchJson(res);
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
    const json = await safeFetchJson(res);
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
  couponCode?: string;
  notes?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/billing/submit-payment`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await safeFetchJson(res);
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit payment" };
  }
}

export async function testPlaygroundChat(message: string, history: Array<{ role: string; content: string }>, pageId?: string) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/playground`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, history, pageId }),
    });
    const json = await safeFetchJson(res);
    return json;
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach AI Playground" };
  }
}

// --- PROFILE & USER ---
export async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    const json = await safeFetchJson(res);
    return json.success ? json.data : null;
  } catch (err) {
    console.error("Error fetching user:", err);
    return null;
  }
}

export async function updateUserProfile(data: { name?: string; password?: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- TEAM MANAGEMENT ---
export async function fetchTeamMembers() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/team`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    const json = await safeFetchJson(res);
    return json.success ? json.data : [];
  } catch (err) {
    console.error("Error fetching team members:", err);
    return [];
  }
}

export async function inviteTeamMember(data: { name?: string; email: string; role: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/team/invite`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTeamMember(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/team/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- ORDERS ---
export async function fetchOrders(status?: string, pageId?: string) {
  try {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (pageId && pageId !== "ALL") params.append("pageId", pageId);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE}/api/orders${queryString}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    const json = await safeFetchJson(res);
    return json.success ? json.data : [];
  } catch (err) {
    console.error("Error fetching orders:", err);
    return [];
  }
}

export async function createOrder(data: any) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- AUTOMATION & RULES ---
export async function fetchAutomationRules() {
  try {
    const res = await fetch(`${API_BASE}/api/automation/rules`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    const json = await safeFetchJson(res);
    return json.success ? json.data : [];
  } catch (err) {
    console.error("Error fetching rules:", err);
    return [];
  }
}

export async function createAutomationRule(data: { name: string; keywords: string[]; reason?: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/automation/rules`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleAutomationRule(id: string, isActive: boolean) {
  try {
    const res = await fetch(`${API_BASE}/api/automation/rules/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAutomationRule(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/automation/rules/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- TELEGRAM MASTER BOT ALERTS ---
export async function fetchTelegramStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/automation/telegram`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function disconnectTelegram() {
  try {
    const res = await fetch(`${API_BASE}/api/automation/telegram/disconnect`, {
      method: "POST",
      headers: getHeaders(),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendTestTelegramAlert() {
  try {
    const res = await fetch(`${API_BASE}/api/automation/telegram/test`, {
      method: "POST",
      headers: getHeaders(),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- PAYMENT CONFIG & RECEIVER NUMBERS ---
export async function fetchPaymentConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/billing/payment-config`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminPaymentConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/payment-config`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAdminPaymentConfig(data: {
  bkashNumber?: string;
  bkashType?: string;
  nagadNumber?: string;
  nagadType?: string;
  rocketNumber?: string;
  rocketType?: string;
  instructions?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/payment-config`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- COUPON & DISCOUNT CODES ---
export async function validateCouponCode(code: string, plan: string) {
  try {
    const res = await fetch(`${API_BASE}/api/billing/coupons/validate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ code, plan }),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchAdminCoupons() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/coupons`, {
      headers: getHeaders(),
      cache: "no-store",
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createAdminCoupon(data: {
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  applicablePlan?: string;
  usageLimit?: number;
  expiresAt?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/coupons`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAdminCoupon(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/coupons/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleAdminCoupon(id: string) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/coupons/${id}/toggle`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function testPlaygroundAI(data: { message: string; history?: any[] }) {
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/playground`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchFollowupConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/broadcasts/followup-config`, {
      headers: getHeaders(),
    });
    const json = await safeFetchJson(res);
    return json.data;
  } catch (err: any) {
    return null;
  }
}

export async function saveFollowupConfig(data: {
  isEnabled: boolean;
  delayHours: number;
  messageText: string;
  pageId?: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/api/broadcasts/followup-config`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function triggerFollowupScan() {
  try {
    const res = await fetch(`${API_BASE}/api/broadcasts/trigger-followup`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return await safeFetchJson(res);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}







