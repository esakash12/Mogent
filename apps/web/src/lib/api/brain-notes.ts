import { api } from "./client";

export interface StoreBrainNoteData {
  id: string;
  workspaceId: string;
  pageId?: string | null;
  channel?: string;
  title: string;
  content: string;
  version: number;
  lastUpdatedBy?: string;
  updatedAt: string;
}

export async function fetchBrainNote(pageId?: string, channel?: string): Promise<StoreBrainNoteData | null> {
  const query = new URLSearchParams();
  if (pageId && pageId !== "ALL") query.set("pageId", pageId);
  if (channel && channel !== "ALL") query.set("channel", channel);
  const qs = query.toString();
  const endpoint = `/api/brain-notes${qs ? `?${qs}` : ""}`;
  const res = await api.get(endpoint);
  return res.success ? (res.data as StoreBrainNoteData) : null;
}

export async function saveBrainNote(data: {
  pageId?: string;
  content: string;
  title?: string;
  channel?: string;
}): Promise<StoreBrainNoteData | null> {
  const res = await api.put("/api/brain-notes", data);
  return res.success ? (res.data as StoreBrainNoteData) : null;
}
