import { api } from "./client";

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

export async function fetchTelegramStatus() {
  return await api.get("/api/automation/telegram");
}

export async function disconnectTelegram() {
  return await api.delete("/api/automation/telegram");
}

export async function sendTestTelegramAlert() {
  return await api.post("/api/automation/telegram/test-alert", {});
}
