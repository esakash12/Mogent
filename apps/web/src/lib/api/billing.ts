import { api } from "./client";

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
