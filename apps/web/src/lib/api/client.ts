/**
 * Core Generic HTTP Client for Mogent Web Platform
 * Handles header injection, auth tokens, multi-tenant workspace context, and standardized response envelopes.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

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
 * Safely parse JSON without throwing exceptions on empty or malformed server output
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
 * Resolves current bearer token and multi-tenant workspace ID from local storage
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
 * Low-level typed fetch wrapper with centralized status code handling
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
      return {
        success: false,
        error: "Access denied. Insufficient permissions for this action.",
      };
    }

    if (res.status >= 500) {
      return {
        success: false,
        error: `Server error (${res.status}). Please try again later.`,
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
 * Generic REST Client Methods
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
