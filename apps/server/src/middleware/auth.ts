import { Context, Next } from "hono";
import { verify } from "hono/jwt";
import { config } from "../config";
import { prisma } from "@mogent/database";

declare module "hono" {
  interface ContextVariableMap {
    jwtPayload: any;
    userId: string;
    userEmail: string;
    workspaceId: string;
  }
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  workspaceId: string;
  isAdmin?: boolean;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const workspaceHeader = c.req.header("x-workspace-id");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized: Missing Bearer token" }, 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return c.json({ success: false, error: "Unauthorized: Token string is empty" }, 401);
  }

  try {
    const payload = (await verify(token, config.jwtSecret, "HS256")) as {
      userId: string;
      email: string;
      role?: string;
      workspaceId?: string;
      isAdmin?: boolean;
    };

    if (!payload || !payload.userId) {
      return c.json({ success: false, error: "Unauthorized: Invalid token payload" }, 401);
    }

    // Resolve active workspace
    let targetWorkspaceId = workspaceHeader?.trim() || payload.workspaceId?.trim() || null;

    // Multi-tenant permission guard: non-admins must actually belong to targetWorkspaceId
    if (!payload.isAdmin && payload.role !== "SUPER_ADMIN") {
      if (targetWorkspaceId) {
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: targetWorkspaceId,
              userId: payload.userId,
            },
          },
        });

        if (!member) {
          // If header requested an unauthorized workspace, fall back to their valid workspace
          const validMember = await prisma.workspaceMember.findFirst({
            where: { userId: payload.userId },
          });
          if (validMember) {
            targetWorkspaceId = validMember.workspaceId;
          } else {
            return c.json({ success: false, error: "Forbidden: You do not have access to this workspace" }, 403);
          }
        }
      } else {
        const firstMember = await prisma.workspaceMember.findFirst({
          where: { userId: payload.userId },
        });
        if (firstMember) {
          targetWorkspaceId = firstMember.workspaceId;
        }
      }
    }

    c.set("jwtPayload", payload);
    c.set("userId", payload.userId);
    c.set("userEmail", payload.email);
    c.set("workspaceId", targetWorkspaceId || "");

    await next();
  } catch (err: any) {
    return c.json({ success: false, error: `Unauthorized: ${err.message}` }, 401);
  }
}

export async function adminAuthMiddleware(c: Context, next: Next) {
  // Support direct internal x-admin-secret header for automation/scripts if configured
  const adminSecretHeader = c.req.header("x-admin-secret");
  const envAdminSecret = (config.adminSecret || process.env.ADMIN_SECRET || "").trim();
  if (adminSecretHeader && envAdminSecret && adminSecretHeader.trim() === envAdminSecret) {
    c.set("adminUser", { isAdmin: true, role: "SUPER_ADMIN" });
    return await next();
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized: Missing Admin Bearer token" }, 401);
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return c.json({ success: false, error: "Unauthorized: Token string is empty" }, 401);
  }

  try {
    const payload = (await verify(token, config.jwtSecret, "HS256")) as {
      userId?: string;
      email?: string;
      isAdmin?: boolean;
      role?: string;
    };

    if (!payload || !payload.userId) {
      return c.json({ success: false, error: "Unauthorized: Invalid token" }, 401);
    }

    let isAuthorizedAdmin = payload.isAdmin === true || payload.role === "SUPER_ADMIN";

    if (!isAuthorizedAdmin) {
      // Double check in database in case permissions were updated
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { isAdmin: true },
      });
      if (user?.isAdmin) {
        isAuthorizedAdmin = true;
      }
    }

    if (!isAuthorizedAdmin) {
      return c.json({ success: false, error: "Forbidden: Super Admin access required" }, 403);
    }

    c.set("adminUser", payload);
    await next();
  } catch (err: any) {
    return c.json({ success: false, error: `Unauthorized: ${err.message}` }, 401);
  }
}
