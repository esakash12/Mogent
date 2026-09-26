import { api } from "./client";

export async function fetchConversations(
  options?: string | { pageId?: string; channel?: string; limit?: number; skip?: number; search?: string; all?: boolean }
) {
  let queryStr = "";
  if (typeof options === "string") {
    queryStr = options;
  } else if (options && typeof options === "object") {
    const params = new URLSearchParams();
    if (options.pageId && options.pageId !== "ALL") params.append("pageId", options.pageId);
    if (options.channel && options.channel !== "ALL") params.append("channel", options.channel);
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.skip !== undefined && options.skip !== null) params.append("skip", options.skip.toString());
    if (options.search) params.append("search", options.search);
    if (options.all) params.append("all", "true");
    queryStr = params.toString();
  }
  const endpoint = `/api/conversations${queryStr ? `?${queryStr}` : ""}`;
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
