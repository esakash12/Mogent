import { api } from "./client";

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
