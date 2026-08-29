import { api } from "./client";

export async function fetchConversations(queryString: string = "") {
  const endpoint = `/api/conversations${queryString ? `?${queryString}` : ""}`;
  const res = await api.get<any[]>(endpoint);
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchMessages(conversationId: string) {
  const res = await api.get<any[]>(`/api/conversations/${conversationId}/messages`);
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function sendMessage(conversationId: string, text: string) {
  return await api.post(`/api/conversations/${conversationId}/messages`, { text });
}

export async function toggleConversationMode(conversationId: string, isHumanControl: boolean) {
  return await api.post(`/api/conversations/${conversationId}/toggle-mode`, { isHumanControl });
}

export async function markSaleCompleted(conversationId: string) {
  return await api.post(`/api/conversations/${conversationId}/complete-sale`, {});
}

export async function startWhatsAppConversation(data: {
  phoneNumber: string;
  name?: string;
  initialMessage?: string;
  facebookPageId?: string;
}) {
  return await api.post<any>("/api/conversations/whatsapp/start", data);
}

export async function updateConversationStatus(conversationId: string, status: string) {
  return await api.patch(`/api/conversations/${conversationId}/status`, { status });
}
