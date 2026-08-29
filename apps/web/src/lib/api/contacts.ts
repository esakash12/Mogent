import { api } from "./client";

export async function fetchContacts(filter?: string, pageId?: string) {
  const params = new URLSearchParams();
  if (filter && filter !== "ALL") params.append("filter", filter);
  if (pageId && pageId !== "ALL") params.append("pageId", pageId);

  const endpoint = `/api/contacts${params.toString() ? `?${params.toString()}` : ""}`;
  return await api.get(endpoint);
}

export async function createContactLead(data: {
  name: string;
  phone?: string;
  address?: string;
  pageId?: string;
  sentiment?: string;
}) {
  return await api.post("/api/contacts", data);
}
