import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { prisma, Role } from "@mogent/database";
import { config } from "../config";

export const authRouter = new Hono();

// Helper to create slug
function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// -----------------------------------------------------------------------------
// 1. REGISTER NEW USER & WORKSPACE
// -----------------------------------------------------------------------------
authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, password, workspaceName } = body;

    if (!email || !password || !name) {
      return c.json({ success: false, error: "Name, email, and password are required" }, 400);
    }

    if (password.length < 6) {
      return c.json({ success: false, error: "Password must be at least 6 characters" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return c.json({ success: false, error: "An account with this email already exists" }, 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user and workspace in a transaction
    const finalWorkspaceName = workspaceName?.trim() || `${name}'s Workspace`;
    const baseSlug = slugify(finalWorkspaceName) || "workspace";
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
        },
      });

      const newWorkspace = await tx.workspace.create({
        data: {
          name: finalWorkspaceName,
          slug,
          whatsAppMode: "ON_DEMAND",
        },
      });

      const membership = await tx.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: newWorkspace.id,
          role: Role.OWNER,
        },
      });

      return { user: newUser, workspace: newWorkspace, membership };
    });

    // Generate JWT Token
    const token = await sign(
      {
        userId: result.user.id,
        email: result.user.email,
        workspaceId: result.workspace.id,
        role: result.membership.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
      },
      config.jwtSecret,
      "HS256"
    );

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
          slug: result.workspace.slug,
          role: result.membership.role,
        },
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return c.json({ success: false, error: error.message || "Failed to register" }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. LOGIN USER
// -----------------------------------------------------------------------------
authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, error: "Email and password are required" }, 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return c.json({ success: false, error: "Invalid email or password" }, 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return c.json({ success: false, error: "Invalid email or password" }, 401);
    }

    // Default to first workspace or create one if none exists
    let activeMembership = user.memberships[0];

    if (!activeMembership) {
      const workspaceName = `${user.name || "User"}'s Workspace`;
      const slug = `${slugify(workspaceName)}-${Math.random().toString(36).substring(2, 7)}`;
      const newWs = await prisma.workspace.create({
        data: { name: workspaceName, slug },
      });
      activeMembership = await prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: newWs.id,
          role: Role.OWNER,
        },
        include: { workspace: true },
      });
    }

    const token = await sign(
      {
        userId: user.id,
        email: user.email,
        workspaceId: activeMembership.workspaceId,
        role: activeMembership.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
      config.jwtSecret,
      "HS256"
    );

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        workspace: {
          id: activeMembership.workspace.id,
          name: activeMembership.workspace.name,
          slug: activeMembership.workspace.slug,
          role: activeMembership.role,
        },
        workspaces: user.memberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: m.role,
        })),
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return c.json({ success: false, error: error.message || "Login failed" }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. GET CURRENT USER & SESSION PROFILE
// -----------------------------------------------------------------------------
authRouter.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = (await verify(token, config.jwtSecret, "HS256")) as {
      userId: string;
      email: string;
      workspaceId?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const activeWorkspace =
      user.memberships.find((m) => m.workspaceId === payload.workspaceId)?.workspace ||
      user.memberships[0]?.workspace;

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        workspace: activeWorkspace
          ? {
              id: activeWorkspace.id,
              name: activeWorkspace.name,
              slug: activeWorkspace.slug,
              role: user.memberships.find((m) => m.workspaceId === activeWorkspace.id)?.role,
            }
          : null,
        workspaces: user.memberships.map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          slug: m.workspace.slug,
          role: m.role,
        })),
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: "Invalid token session" }, 401);
  }
});

// -----------------------------------------------------------------------------
// 4. SUPER ADMIN AUTHENTICATION (ENTERPRISE BCRYPT & RBAC)
// -----------------------------------------------------------------------------
authRouter.post("/admin/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ success: false, error: "Email and password are required" }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Look up User in database with isAdmin: true
    let adminUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    let isValid = false;

    if (adminUser && adminUser.isAdmin && adminUser.passwordHash) {
      // Validate with bcrypt hash from database
      isValid = await bcrypt.compare(password, adminUser.passwordHash);
    } else {
      // Match authoritative master secret from .env
      const envAdminSecret = config.adminSecret;
      const designatedAdminEmail = (process.env.ADMIN_EMAIL || "admin@mogent.tech").toLowerCase();

      if (
        (cleanEmail === designatedAdminEmail || cleanEmail === "shohag.tech@gmail.com") &&
        password === envAdminSecret
      ) {
        // Automatically persist or update Super Admin in PostgreSQL with Bcrypt hash
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!adminUser) {
          adminUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: "Super Admin",
              passwordHash: hashedPassword,
              isAdmin: true,
            },
          });
        } else {
          adminUser = await prisma.user.update({
            where: { id: adminUser.id },
            data: {
              isAdmin: true,
              passwordHash: hashedPassword,
            },
          });
        }
        isValid = true;
      }
    }

    if (!isValid || !adminUser) {
      return c.json({ success: false, error: "Access Denied: Invalid Super Admin Credentials." }, 401);
    }

    // Issue Secure 7-Day Admin JWT
    const token = await sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        isAdmin: true,
        role: "SUPER_ADMIN",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      },
      config.jwtSecret,
      "HS256"
    );

    return c.json({
      success: true,
      data: {
        token,
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name || "Super Admin",
          role: "SUPER_ADMIN",
        },
      },
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    return c.json({ success: false, error: error.message || "Admin login failed" }, 500);
  }
});
