import { api } from "./client";

export async function fetchPages() {
  const res = await api.get<any[]>("/api/pages", { cache: "no-store" });
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchFacebookConfig() {
  const res = await api.get("/api/pages/facebook/config");
  return res.success ? res.data : null;
}

export async function inspectFacebookToken(token: string) {
  return await api.post("/api/pages/inspect-token", { token });
}

export async function connectFacebookPagesOAuth(
  pages: Array<{ id: string; name: string; accessToken: string; category?: string }>
) {
  return await api.post("/api/pages/facebook/oauth-connect", { pages });
}

export async function createPage(data: {
  name: string;
  pageId: string;
  accessToken: string;
  systemPrompt?: string;
  aiMode?: string;
  category?: string;
}) {
  const res = await api.post("/api/pages", data);
  return res.success ? res.data : null;
}

export async function updatePageSettings(
  pageId: string,
  data: {
    aiMode?: string;
    systemPrompt?: string;
    temperature?: number;
    autoReplyEnabled?: boolean;
    commentReplyEnabled?: boolean;
    privateReplyEnabled?: boolean;
  }
) {
  return await api.patch(`/api/pages/${pageId}`, data);
}

export async function deletePage(pageId: string) {
  return await api.delete(`/api/pages/${pageId}`);
}
