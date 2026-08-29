import { api } from "./client";

export async function fetchCurrentUser() {
  const res = await api.get("/api/auth/me");
  return res.success ? res.data : null;
}

export async function updateUserProfile(data: { name?: string; password?: string }) {
  return await api.put("/api/auth/profile", data);
}

export async function fetchTeamMembers() {
  const res = await api.get<any[]>("/api/auth/team");
  return res.success && Array.isArray(res.data) ? res.data : [];
}

export async function inviteTeamMember(data: { name?: string; email: string; role: string }) {
  return await api.post("/api/auth/team/invite", data);
}

export async function deleteTeamMember(id: string) {
  return await api.delete(`/api/auth/team/${id}`);
}
