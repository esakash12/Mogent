/**
 * Centralized Enterprise API Client for Mogent Platform
 * Built with Strict TypeScript Generics, Centralized Error Interception,
 * and Dynamic Multi-Tenant Workspace & Auth Token Injection.
 */

import { toast } from "./toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  totalCount?: number;
  verifiedPhonesCount?: number;
  confirmedBuyersCount?: number;
  modelsSummary?: any[];
  [key: string]: any;
}

/**
 * Safely parse JSON without crashing on malformed or empty responses
 */
export async function safeFetchJson<T = any>(res: Response, fallback: T = null as any): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * Extracts and sanitizes authorization token and multi-tenant workspace ID
 */
export function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  let token = "";
  let workspaceId = "";

  if (typeof window !== "undefined") {
    token = localStorage.getItem("mogent_auth_token") || "";
    const workspaceRaw = localStorage.getItem("mogent_workspace");
    if (workspaceRaw) {
      try {
        if (workspaceRaw.startsWith("{")) {
          workspaceId = JSON.parse(workspaceRaw)?.id || "";
        } else if (workspaceRaw !== "null" && workspaceRaw !== "undefined") {
          workspaceId = workspaceRaw;
        }
      } catch {
        workspaceId = "";
      }
    }
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

/**
 * Central generic HTTP requester with centralized 401/403/500 error trapping & auto-toasts
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const customHeaders = (options.headers as Record<string, string>) || {};
  const headers = getHeaders(customHeaders);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      return {
        success: false,
        error: "Session expired or unauthorized. Please log in.",
      };
    }

    if (res.status === 403) {
      const msg = "Access denied. Insufficient permissions for this action.";
      return {
        success: false,
        error: msg,
      };
    }

    if (res.status >= 500) {
      const msg = `Server error (${res.status}). Please try again later.`;
      return {
        success: false,
        error: msg,
      };
    }

    const json = await safeFetchJson<ApiResponse<T>>(res, {
      success: res.ok,
      error: res.ok ? undefined : `Server responded with status ${res.status}`,
    });

    return json;
  } catch (err: any) {
    const networkMsg = err?.message || "Network connection failed.";
    console.warn(`[API Notice] ${endpoint}:`, networkMsg);
    return {
      success: false,
      error: networkMsg,
    };
  }
}

/**
 * Generic REST Client (GET, POST, PUT, PATCH, DELETE)
 */
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "GET", ...options }),

  post: <T = any, B = any>(endpoint: string, body?: B, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T = any, B = any>(endpoint: string, body?: B, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = any, B = any>(endpoint: string, body?: B, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "DELETE", ...options }),
};

// =============================================================================
// 1. DASHBOARD & ANALYTICS
// =============================================================================
export async function fetchAnalytics() {
  const res = await api.get("/api/dashboard/analytics", { cache: "no-store" });
  return res.success ? res.data : null;
}

// =============================================================================
// 2. FACEBOOK PAGES & OAUTH
// =============================================================================
export async function fetchPages() {
  const res = await api.get<any[]>("/api/pages", { cache: "no-store" });
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchFacebookConfig() {
  const res = await api.get("/api/pages/facebook/config");
  return res.success ? res.data : null;
}

export async function inspectFacebookToken(token: string) {
  return await api.post("/api/pages/inspect-token", { token });
}

export async function connectFacebookPagesOAuth(
  pages: Array<{ id: string; name: string; accessToken: string; category?: string }>
) {
  return await api.post("/api/pages/facebook/oauth-connect", { pages });
}

export async function createPage(data: {
  name: string;
  pageId: string;
  accessToken: string;
  systemPrompt?: string;
  aiMode?: string;
  category?: string;
}) {
  const res = await api.post("/api/pages", data);
  return res.success ? res.data : null;
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
  return await api.patch(`/api/pages/${pageId}`, data);
}

export async function deletePage(pageId: string) {
  return await api.delete(`/api/pages/${pageId}`);
}

// =============================================================================
// 3. CONVERSATIONS & LIVE MESSENGER CHAT
// =============================================================================
export async function fetchConversations(queryString: string = "") {
  const endpoint = `/api/conversations${queryString ? `?${queryString}` : ""}`;
  const res = await api.get<any[]>(endpoint);
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchMessages(conversationId: string) {
  const res = await api.get<any[]>(`/api/conversations/${conversationId}/messages`);
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function sendMessage(conversationId: string, text: string) {
  return await api.post(`/api/conversations/${conversationId}/messages`, { text });
}

export async function toggleConversationMode(conversationId: string, isHumanControl: boolean) {
  return await api.post(`/api/conversations/${conversationId}/toggle-mode`, { isHumanControl });
}

export async function markSaleCompleted(conversationId: string) {
  return await api.post(`/api/conversations/${conversationId}/complete-sale`, {});
}

export async function startWhatsAppConversation(data: {
  phoneNumber: string;
  name?: string;
  initialMessage?: string;
  facebookPageId?: string;
}) {
  return await api.post<any>("/api/conversations/whatsapp/start", data);
}

export async function updateConversationStatus(conversationId: string, status: string) {
  return await api.patch(`/api/conversations/${conversationId}/status`, { status });
}

// =============================================================================
// 4. COMMERCE PRODUCTS & CATALOG SYNC
// =============================================================================
export async function fetchProducts() {
  const res = await api.get<any[]>("/api/products");
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function createProduct(data: {
  name: string;
  price: number;
  regularPrice?: number;
  category?: string;
  description?: string;
  image?: string;
}) {
  const res = await api.post("/api/products", data);
  return res.success ? res.data : null;
}

export async function toggleProductStock(productId: string) {
  return await api.patch(`/api/products/${productId}/toggle-stock`);
}

export async function deleteProduct(productId: string) {
  return await api.delete(`/api/products/${productId}`);
}

export async function importProductFromUrl(url: string) {
  return await api.post("/api/products/import-url", { url });
}

export async function importProductFromFacebook() {
  return await api.post("/api/products/import-facebook", {});
}

export async function importProductFromFeed(feedUrl: string) {
  return await api.post("/api/products/import-feed", { feedUrl });
}

export async function uploadImageFile(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const token = typeof window !== "undefined" ? localStorage.getItem("mogent_auth_token") : null;
    const workspaceRaw = typeof window !== "undefined" ? localStorage.getItem("mogent_workspace") : null;
    let workspaceId = "";
    if (workspaceRaw) {
      try {
        workspaceId = workspaceRaw.startsWith("{") ? JSON.parse(workspaceRaw)?.id || "" : workspaceRaw;
      } catch {}
    }

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (workspaceId) headers["x-workspace-id"] = workspaceId;

    const res = await fetch(`${API_BASE}/api/products/upload-image`, {
      method: "POST",
      headers,
      body: formData,
    });

    const json = await safeFetchJson(res);
    return json.success ? { success: true, url: json.url } : { success: false, error: json.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload image." };
  }
}

// =============================================================================
// 5. CRM CONTACTS & CUSTOMER LEADS
// =============================================================================
export async function fetchContacts(filter?: string, pageId?: string) {
  const params = new URLSearchParams();
  if (filter && filter !== "ALL") params.append("filter", filter);
  if (pageId && pageId !== "ALL") params.append("pageId", pageId);

  const endpoint = `/api/contacts${params.toString() ? `?${params.toString()}` : ""}`;
  return await api.get(endpoint);
}

export async function createContactLead(data: {
  name: string;
  phone?: string;
  address?: string;
  pageId?: string;
  sentiment?: string;
}) {
  return await api.post("/api/contacts", data);
}

// =============================================================================
// 6. ORDERS & E-COMMERCE CHECKOUT
// =============================================================================
export async function fetchOrders(status?: string, pageId?: string) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.append("status", status);
  if (pageId && pageId !== "ALL") params.append("pageId", pageId);

  const endpoint = `/api/orders${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await api.get<any[]>(endpoint);
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function createOrderManual(data: {
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  productName?: string;
  totalAmount?: number | string;
  paymentMethod?: string;
  status?: string;
  pageId?: string;
}) {
  return await api.post("/api/orders", data);
}

export async function updateOrderStatus(orderId: string, status: string) {
  return await api.patch(`/api/orders/${orderId}/status`, { status });
}

// =============================================================================
// 7. KNOWLEDGE BASE & AI SYSTEM PROMPTS
// =============================================================================
export async function fetchKnowledgeAndWhatsApp(pageId?: string) {
  const endpoint = `/api/knowledge${pageId ? `?pageId=${pageId}` : ""}`;
  const res = await api.get(endpoint);
  return res.success ? res.data : null;
}

export async function createKnowledgeItem(data: { title: string; category: string; content: string }) {
  const res = await api.post("/api/knowledge", data);
  return res.success ? res.data : null;
}

export async function deleteKnowledgeItem(id: string) {
  return await api.delete(`/api/knowledge/${id}`);
}

export async function saveWhatsAppProtocol(data: {
  mode?: string;
  number?: string;
  hotline?: string;
  address?: string;
  prefillText?: string;
  isEnabled?: boolean;
  contactNumber?: string;
  sharingRule?: "ALWAYS" | "WHEN_REQUESTED" | "HUMAN_HANDOFF" | string;
  shareInquiryHotline?: boolean;
  [key: string]: any;
}) {
  return await api.post("/api/knowledge/whatsapp", data);
}

export async function saveSystemPrompt(data: { systemPrompt: string; businessName?: string; pageId?: string }) {
  return await api.post("/api/knowledge/system-prompt", data);
}

export async function testPlaygroundAI(data: { message: string; history?: any[]; pageId?: string }) {
  return await api.post("/api/knowledge/playground", data);
}

export async function testPlaygroundChat(message: string, history: Array<{ role: string; content: string }>, pageId?: string) {
  return await api.post("/api/knowledge/playground", { message, history, pageId });
}

// =============================================================================
// 8. BILLING, PAYMENTS & PROMO COUPONS
// =============================================================================
export async function fetchBillingStatus() {
  const res = await api.get("/api/billing/status");
  return res.success ? res.data : null;
}

export async function submitPayment(data: {
  plan: string;
  amount?: number;
  method: string;
  senderNumber: string;
  trxId: string;
  couponCode?: string;
  notes?: string;
  [key: string]: any;
}) {
  return await api.post("/api/billing/submit-payment", data);
}

export async function validateCouponCode(code: string, plan: string) {
  return await api.post("/api/billing/validate-coupon", { code, plan });
}

export async function fetchPaymentConfig() {
  const res = await api.get("/api/billing/payment-config");
  return res.success ? res.data : null;
}

// =============================================================================
// 9. AUTOMATION & ESCALATION RULES
// =============================================================================
export async function fetchAutomationRules() {
  const res = await api.get<any[]>("/api/automation/rules");
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function createAutomationRule(data: { name: string; keywords: string[]; reason?: string }) {
  return await api.post("/api/automation/rules", data);
}

export async function toggleAutomationRule(id: string, isActive: boolean) {
  return await api.patch(`/api/automation/rules/${id}`, { isActive });
}

export async function deleteAutomationRule(id: string) {
  return await api.delete(`/api/automation/rules/${id}`);
}

// =============================================================================
// 10. SINGLE MASTER TELEGRAM BOT
// =============================================================================
export async function fetchTelegramStatus() {
  return await api.get("/api/automation/telegram");
}

export async function disconnectTelegram() {
  return await api.delete("/api/automation/telegram");
}

export async function sendTestTelegramAlert() {
  return await api.post("/api/automation/telegram/test-alert", {});
}

// =============================================================================
// 11. USER PROFILE & TEAM MANAGEMENT
// =============================================================================
export async function fetchCurrentUser() {
  const res = await api.get("/api/auth/me");
  return res.success ? res.data : null;
}

export async function updateUserProfile(data: { name?: string; password?: string }) {
  return await api.put("/api/auth/profile", data);
}

export async function fetchTeamMembers() {
  const res = await api.get<any[]>("/api/auth/team");
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function inviteTeamMember(data: { name?: string; email: string; role: string }) {
  return await api.post("/api/auth/team/invite", data);
}

export async function deleteTeamMember(id: string) {
  return await api.delete(`/api/auth/team/${id}`);
}

// =============================================================================
// 12. ADMIN CONTROL PANEL (KEYS, WORKSPACES, APPROVALS, SETTINGS)
// =============================================================================
export async function fetchAdminKeys() {
  return await api.get("/api/admin/keys");
}

export async function addAdminKey(data: {
  key: string;
  name?: string;
  role?: "PRIMARY" | "SECONDARY" | "BACKUP";
  model?: string;
}) {
  return await api.post("/api/admin/keys", data);
}

export async function switchAdminKeyModel(keyId: string, model: string) {
  return await api.post(`/api/admin/keys/${keyId}/model`, { model });
}

export async function updateAdminKey(keyId: string, data: any) {
  return await api.put(`/api/admin/keys/${keyId}`, data);
}

export async function deleteAdminKey(keyId: string) {
  return await api.delete(`/api/admin/keys/${keyId}`);
}

export async function fetchAdminClients() {
  return await api.get("/api/admin/clients");
}

export async function fetchAdminPayments() {
  return await api.get("/api/billing/admin/payments");
}

export async function approveAdminPayment(id: string) {
  return await api.post(`/api/billing/admin/payments/${id}/approve`, {});
}

export async function rejectAdminPayment(id: string, reason?: string) {
  return await api.post(`/api/billing/admin/payments/${id}/reject`, { reason });
}

export async function fetchAdminCoupons() {
  return await api.get("/api/admin/coupons");
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
  return await api.post("/api/admin/coupons", data);
}

export async function deleteAdminCoupon(id: string) {
  return await api.delete(`/api/admin/coupons/${id}`);
}

export async function toggleAdminCoupon(id: string) {
  return await api.patch(`/api/admin/coupons/${id}/toggle`, {});
}

export async function fetchAdminPaymentConfig() {
  const res = await api.get("/api/admin/payment-config");
  return res.success ? res.data : null;
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
  return await api.post("/api/admin/payment-config", data);
}

export async function fetchAdminMetaConfig() {
  return await api.get("/api/admin/meta-config");
}

export async function saveAdminMetaConfig(data: { appId: string; appSecret: string; verifyToken: string }) {
  return await api.post("/api/admin/meta-config", data);
}

export async function fetchAdminTelegramMasterConfig() {
  return await api.get("/api/admin/telegram-master-config");
}

export async function saveAdminTelegramMasterConfig(data: {
  botToken: string;
  botUsername: string;
  adminChatId: string;
}) {
  return await api.post("/api/admin/telegram-master-config", data);
}

export async function fetchAdminCloudflareConfig() {
  return await api.get("/api/admin/cloudflare-config");
}

export async function saveAdminCloudflareConfig(data: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}) {
  return await api.post("/api/admin/cloudflare-config", data);
}

// =============================================================================
// 13. FOLLOW-UP AUTOMATIONS & BROADCASTS
// =============================================================================
export async function fetchFollowupConfig() {
  const res = await api.get("/api/broadcasts/followup-config");
  return res.success ? res.data : null;
}

export async function saveFollowupConfig(data: {
  isEnabled: boolean;
  delayHours: number;
  messageText: string;
  pageId?: string;
}) {
  return await api.post("/api/broadcasts/followup-config", data);
}

export async function triggerFollowupScan() {
  return await api.post("/api/broadcasts/trigger-followup", {});
}

export async function sendTestFollowup(data: {
  conversationId?: string;
  customerId?: string;
  customerPhone?: string;
  phone?: string;
  messageText?: string;
}) {
  return await api.post("/api/broadcasts/test-followup", data);
}
