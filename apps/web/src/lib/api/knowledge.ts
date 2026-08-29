import { api } from "./client";

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

export async function testPlaygroundChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  pageId?: string
) {
  return await api.post("/api/knowledge/playground", { message, history, pageId });
}
