"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    pass: string,
    wsName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchWorkspace: (workspaceId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load session on startup
  useEffect(() => {
    const savedToken = localStorage.getItem("mogent_auth_token");
    const savedUser = localStorage.getItem("mogent_user");
    const savedWs = localStorage.getItem("mogent_workspace");

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {}
      }
      if (savedWs) {
        try {
          setWorkspace(JSON.parse(savedWs));
        } catch {}
      }

      // Refresh profile from server
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setUser(json.data.user);
            if (json.data.workspace) setWorkspace(json.data.workspace);
            if (json.data.workspaces) setWorkspaces(json.data.workspaces);
            localStorage.setItem("mogent_user", JSON.stringify(json.data.user));
            if (json.data.workspace) {
              localStorage.setItem("mogent_workspace", JSON.stringify(json.data.workspace));
            }
          } else {
            // Token expired or invalid
            logout();
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || "Login failed" };
      }

      const { token, user, workspace, workspaces } = json.data;
      setToken(token);
      setUser(user);
      setWorkspace(workspace);
      setWorkspaces(workspaces || [workspace]);

      localStorage.setItem("mogent_auth_token", token);
      localStorage.setItem("mogent_user", JSON.stringify(user));
      localStorage.setItem("mogent_workspace", JSON.stringify(workspace));

      router.push("/dashboard");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to connect to server" };
    }
  };

  const register = async (name: string, email: string, pass: string, wsName?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pass, workspaceName: wsName }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || "Registration failed" };
      }

      const { token, user, workspace } = json.data;
      setToken(token);
      setUser(user);
      setWorkspace(workspace);
      setWorkspaces([workspace]);

      localStorage.setItem("mogent_auth_token", token);
      localStorage.setItem("mogent_user", JSON.stringify(user));
      localStorage.setItem("mogent_workspace", JSON.stringify(workspace));

      router.push("/dashboard");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to connect to server" };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setWorkspace(null);
    setWorkspaces([]);
    localStorage.removeItem("mogent_auth_token");
    localStorage.removeItem("mogent_user");
    localStorage.removeItem("mogent_workspace");
    router.push("/login");
  };

  const switchWorkspace = (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId);
    if (found) {
      setWorkspace(found);
      localStorage.setItem("mogent_workspace", JSON.stringify(found));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspace,
        workspaces,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
