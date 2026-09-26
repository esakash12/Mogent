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
    formData.append("file", file);
    formData.append("folder", "products");

    const res = await api.post<{ url: string; key: string }>("/api/upload", formData);
    if (res?.success && (res.data?.url || (res as any).url)) {
      return { success: true, url: res.data?.url || (res as any).url };
    }
    return { success: false, error: res?.error || "Failed to upload image." };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to upload image." };
  }
}
