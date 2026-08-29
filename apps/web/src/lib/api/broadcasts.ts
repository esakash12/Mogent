import { api } from "./client";

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

export async function fetchAnalytics() {
  const res = await api.get("/api/dashboard/analytics", { cache: "no-store" });
  return res.success ? res.data : null;
}
