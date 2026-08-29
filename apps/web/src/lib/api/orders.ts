import { api } from "./client";

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
