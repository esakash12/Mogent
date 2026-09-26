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

interface CacheRecord<T = any> {
  data: ApiResponse<T>;
  timestamp: number;
}

// In-flight Promise deduplication: map of cacheKey -> Promise<ApiResponse>
const inFlightRequests = new Map<string, Promise<ApiResponse<any>>>();

// In-memory short-lived cache for GET requests (15s default TTL)
const responseCache = new Map<string, CacheRecord>();
const DEFAULT_CACHE_TTL = 15000;

export function clearApiCache(endpointPrefix?: string) {
  if (endpointPrefix) {
    for (const key of responseCache.keys()) {
      if (key.includes(endpointPrefix)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
}

/**
 * Low-level typed fetch wrapper with centralized status code handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const method = (options.method || "GET").toUpperCase();
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const customHeaders = (options.headers as Record<string, string>) || {};
  const headers = getHeaders(customHeaders);
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }
  const workspaceHeader = headers["x-workspace-id"] || "";
  const cacheKey = `${method}:${endpoint}:${workspaceHeader}`;

  // Cache & Deduplication for GET requests
  const isNoStore = options.cache === "no-store" || options.cache === "no-cache";
  if (method === "GET" && !isNoStore) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DEFAULT_CACHE_TTL) {
      return cached.data;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }
  }

  const executeFetch = async (): Promise<ApiResponse<T>> => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const newToken = res.headers.get("x-new-token");
      if (newToken && typeof window !== "undefined") {
        localStorage.setItem("mogent_auth_token", newToken);
        localStorage.setItem("mogent_admin_token", newToken);
      }

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

      if (method === "GET" && json.success && !isNoStore) {
        responseCache.set(cacheKey, {
          data: json,
          timestamp: Date.now(),
        });
      }

      return json;
    } catch (err: any) {
      const networkMsg = err?.message || "Network connection failed.";
      console.warn(`[API Notice] ${endpoint}:`, networkMsg);
      return {
        success: false,
        error: networkMsg,
      };
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  };

  if (method === "GET" && !isNoStore) {
    const requestPromise = executeFetch();
    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Any non-GET mutation clears related cache
  if (method !== "GET") {
    clearApiCache();
  }

  return executeFetch();
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
      body: (typeof FormData !== "undefined" && body instanceof FormData) ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T = any, B = any>(endpoint: string, body?: B, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: (typeof FormData !== "undefined" && body instanceof FormData) ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T = any, B = any>(endpoint: string, body?: B, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: (typeof FormData !== "undefined" && body instanceof FormData) ? body : body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { method: "DELETE", ...options }),

  clearCache: clearApiCache,
};
