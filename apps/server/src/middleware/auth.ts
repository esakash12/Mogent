import { Context, Next } from "hono";
import { verify } from "hono/jwt";
import { config } from "../config";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const workspaceHeader = c.req.header("x-workspace-id");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized: Missing Bearer token" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = (await verify(token, config.jwtSecret, "HS256")) as {
      userId: string;
      email: string;
      role?: string;
      workspaceId?: string;
    };

    if (!payload || !payload.userId) {
      return c.json({ success: false, error: "Unauthorized: Invalid token payload" }, 401);
    }

    // Resolve active workspace
    const targetWorkspaceId = workspaceHeader || payload.workspaceId;

    c.set("jwtPayload", payload);
    c.set("userId", payload.userId);
    c.set("userEmail", payload.email);
    c.set("workspaceId", targetWorkspaceId);

    await next();
  } catch (err: any) {
    return c.json({ success: false, error: `Unauthorized: ${err.message}` }, 401);
  }
}

export async function adminAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized: Missing Admin Bearer token" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = (await verify(token, config.jwtSecret, "HS256")) as {
      userId?: string;
      isAdmin?: boolean;
      role?: string;
    };

    if (!payload || (!payload.isAdmin && payload.role !== "SUPER_ADMIN")) {
      return c.json({ success: false, error: "Forbidden: Super Admin access required" }, 403);
    }

    c.set("adminUser", payload);
    await next();
  } catch (err: any) {
    return c.json({ success: false, error: `Unauthorized: ${err.message}` }, 401);
  }
}
