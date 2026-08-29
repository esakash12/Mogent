import { api, API_BASE, safeFetchJson } from "./client";

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
