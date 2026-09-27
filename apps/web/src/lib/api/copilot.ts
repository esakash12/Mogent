import { api } from "./client";

export interface BusinessMemoryItem {
  id: string;
  workspaceId: string;
  pageId?: string | null;
  category: string;
  title: string;
  instruction: string;
  condition?: string | null;
  rawOwnerText?: string | null;
  confidence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  facebookPage?: { id: string; name: string } | null;
}

export interface CoPilotMessageItem {
  id: string;
  sessionId: string;
  sender: "OWNER" | "COPILOT";
  content: string;
  actionType?: string | null;
  actionPayload?: string | null;
  createdAt: string;
}

export interface CoPilotSessionData {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  interviewStage: string;
  messages: CoPilotMessageItem[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchCoPilotSession(): Promise<CoPilotSessionData | null> {
  const res = await api.get("/api/copilot/session");
  return res.success ? res.data : null;
}

export async function sendCoPilotMessage(
  message: string,
  pageId?: string
): Promise<{
  reply: string;
  action: { type: string; data?: any; summary?: string };
  session: CoPilotSessionData;
} | null> {
  const res = await api.post("/api/copilot/chat", {
    message,
    pageId: pageId && pageId !== "ALL" ? pageId : undefined,
  });
  return res.success ? res.data : null;
}

export async function fetchBusinessMemories(pageId?: string): Promise<BusinessMemoryItem[]> {
  const query = pageId && pageId !== "ALL" ? `?pageId=${pageId}` : "";
  const res = await api.get(`/api/copilot/memories${query}`);
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function deleteBusinessMemory(id: string) {
  return await api.delete(`/api/copilot/memories/${id}`);
}

export async function toggleBusinessMemory(id: string, isActive: boolean) {
  return await api.patch(`/api/copilot/memories/${id}/toggle`, { isActive });
}
