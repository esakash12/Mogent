import { api } from "./client";

export interface FetchContactsOptions {
  filter?: string;
  pageId?: string;
  search?: string;
  all?: boolean;
  limit?: number;
}

export async function fetchContacts(
  filterOrOptions?: string | FetchContactsOptions,
  pageIdArg?: string
) {
  const params = new URLSearchParams();

  if (typeof filterOrOptions === "object" && filterOrOptions !== null) {
    if (filterOrOptions.filter && filterOrOptions.filter !== "ALL") params.append("filter", filterOrOptions.filter);
    if (filterOrOptions.pageId && filterOrOptions.pageId !== "ALL") params.append("pageId", filterOrOptions.pageId);
    if (filterOrOptions.search) params.append("search", filterOrOptions.search);
    if (filterOrOptions.all) params.append("all", "true");
    if (filterOrOptions.limit) params.append("limit", filterOrOptions.limit.toString());
  } else {
    if (filterOrOptions && filterOrOptions !== "ALL") params.append("filter", filterOrOptions);
    if (pageIdArg && pageIdArg !== "ALL") params.append("pageId", pageIdArg);
  }

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
