import crypto from "crypto";
import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { prisma, Role } from "@mogent/database";
import { config } from "../config";
import { authMiddleware } from "../middleware/auth";

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

    const designatedAdminEmails = [
      "shohag@burhan.com",
      "admin@mogent.tech",
      (config.adminEmail || process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    ].filter(Boolean);
    const isNewUserAdmin = designatedAdminEmails.includes(normalizedEmail);

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
          isAdmin: isNewUserAdmin,
        },
      });

      const newWorkspace = await tx.workspace.create({
        data: {
          name: finalWorkspaceName,
          slug,
          whatsAppMode: "ON_DEMAND",
          plan: "FREE",
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
        isAdmin: isNewUserAdmin,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 365 days
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
          isAdmin: isNewUserAdmin,
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
    const cleanPassword = password.trim();
    const envAdminSecret = (config.adminSecret || process.env.ADMIN_SECRET || "").trim();
    const designatedAdminEmails = [
      "shohag@burhan.com",
      "admin@mogent.tech",
      (config.adminEmail || process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    ].filter(Boolean);

    // Master admin bootstrap check (strictly designated email + configured ADMIN_SECRET)
    const isMasterAdmin =
      designatedAdminEmails.includes(normalizedEmail) &&
      Boolean(envAdminSecret) &&
      cleanPassword === envAdminSecret;

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (isMasterAdmin) {
      const hashedPassword = await bcrypt.hash(cleanPassword, 10);
      if (!user) {
        // Create user and default workspace
        const wsName = "Mogent Master Workspace";
        const newWs = await prisma.workspace.create({
          data: { name: wsName, slug: `admin-ws-${Math.random().toString(36).substring(2, 6)}` },
        });
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: "Super Admin",
            passwordHash: hashedPassword,
            isAdmin: true,
            memberships: {
              create: {
                workspaceId: newWs.id,
                role: Role.OWNER,
              },
            },
          },
          include: {
            memberships: {
              include: { workspace: true },
            },
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: hashedPassword,
            isAdmin: true,
          },
          include: {
            memberships: {
              include: { workspace: true },
            },
          },
        });
      }
    } else {
      if (!user || !user.passwordHash) {
        return c.json({ success: false, error: "Invalid email or password" }, 401);
      }

      const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
      if (!isMatch) {
        return c.json({ success: false, error: "Invalid email or password" }, 401);
      }
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

    const userEmail = (user.email || "").trim().toLowerCase();
    const isUserAdmin = Boolean(user.isAdmin && designatedAdminEmails.includes(userEmail));

    if (!isUserAdmin && user.isAdmin) {
      await prisma.user.update({ where: { id: user.id }, data: { isAdmin: false } }).catch(() => {});
      user.isAdmin = false;
    }

    const token = await sign(
      {
        userId: user.id,
        email: user.email,
        workspaceId: activeMembership.workspaceId,
        role: activeMembership.role,
        isAdmin: isUserAdmin,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 365 days
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
          isAdmin: isUserAdmin,
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

    const designatedAdminEmails = [
      "shohag@burhan.com",
      "admin@mogent.tech",
      (config.adminEmail || process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    ].filter(Boolean);
    const userEmail = (user.email || "").trim().toLowerCase();
    const isUserAdmin = Boolean(user.isAdmin && designatedAdminEmails.includes(userEmail));

    if (!isUserAdmin && user.isAdmin) {
      await prisma.user.update({ where: { id: user.id }, data: { isAdmin: false } }).catch(() => {});
      user.isAdmin = false;
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isAdmin: isUserAdmin,
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
// 3.1 UPDATE USER PROFILE
// -----------------------------------------------------------------------------
authRouter.put("/profile", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = (await verify(token, config.jwtSecret, "HS256")) as {
      userId: string;
    };

    const body = await c.req.json();
    const { name, password } = body;

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    return c.json({ success: true, data: updatedUser, message: "Profile updated successfully!" });
  } catch (err: any) {
    return c.json({ success: false, error: err.message || "Failed to update profile" }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3.2 GET WORKSPACE TEAM MEMBERS
// -----------------------------------------------------------------------------
authRouter.get("/team", authMiddleware, async (c) => {
  const targetWorkspaceId = c.get("workspaceId");

  try {
    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Active workspace required" }, 400);
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: targetWorkspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return c.json({
      success: true,
      data: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name || "Team Member",
        email: m.user.email,
        role: m.role,
        avatarUrl: m.user.avatarUrl,
        joinedAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3.3 INVITE TEAM MEMBER
// -----------------------------------------------------------------------------
authRouter.post("/team/invite", authMiddleware, async (c) => {
  const targetWorkspaceId = c.get("workspaceId");

  try {
    const body = await c.req.json();
    const { name, email, role } = body;

    if (!email || !email.trim()) {
      return c.json({ success: false, error: "Email is required" }, 400);
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Active workspace required" }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists or create invite placeholder
    let targetUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!targetUser) {
      const tempHash = await bcrypt.hash(crypto.randomUUID(), 10);
      targetUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name ? name.trim() : cleanEmail.split("@")[0],
          passwordHash: tempHash,
          isAdmin: false,
        },
      });
    }

    // Check if already in workspace
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: targetWorkspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return c.json({ success: false, error: "This user is already a member of this workspace" }, 409);
    }

    const memberRole = role === "ADMIN" ? Role.ADMIN : Role.AGENT;

    const membership = await prisma.workspaceMember.create({
      data: {
        workspaceId: targetWorkspaceId,
        userId: targetUser.id,
        role: memberRole,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
      },
    });

    return c.json({
      success: true,
      message: "Team member added successfully!",
      data: {
        id: membership.id,
        userId: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        joinedAt: membership.createdAt,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3.4 REMOVE TEAM MEMBER
// -----------------------------------------------------------------------------
authRouter.delete("/team/:id", authMiddleware, async (c) => {
  const { id } = c.req.param();
  const targetWorkspaceId = c.get("workspaceId");

  try {
    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Active workspace required" }, 400);
    }

    // Ensure target member belongs to this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId: targetWorkspaceId },
    });

    if (!member) {
      return c.json({ success: false, error: "Member not found in this workspace" }, 404);
    }

    await prisma.workspaceMember.delete({ where: { id: member.id } });
    return c.json({ success: true, message: "Member removed from workspace" });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3.5 EXPORT WORKSPACE DATA (CSV)
// -----------------------------------------------------------------------------
authRouter.get("/export-data", authMiddleware, async (c) => {
  const targetWorkspaceId = c.get("workspaceId");

  try {
    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Active workspace required" }, 400);
    }

    const pages = await prisma.facebookPage.findMany({
      where: { workspaceId: targetWorkspaceId },
      select: { id: true },
    });
    const pageIds = pages.map((p) => p.id);

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { workspaceId: targetWorkspaceId },
          ...(pageIds.length > 0 ? [{ facebookPageId: { in: pageIds } }] : []),
        ],
      },
      include: { orders: true },
    });

    let csvContent = "ID,Name,Phone,Address,Orders Count,Total Spent,Sentiment,PSID\n";
    for (const cust of customers) {
      const name = `"${(cust.firstName || "") + " " + (cust.lastName || "")}"`.trim();
      const phone = `"${cust.phoneNumber || ""}"`;
      const address = `"${(cust.deliveryAddress || "").replace(/"/g, '""')}"`;
      csvContent += `${cust.id},${name},${phone},${address},${cust.totalOrders},${cust.totalSpent},${cust.sentimentScore ?? 0},${cust.psid || ""}\n`;
    }

    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", `attachment; filename="mogent_crm_export_${Date.now()}.csv"`);
    return c.text(csvContent);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. SUPER ADMIN AUTHENTICATION (ENTERPRISE BCRYPT & RBAC)
// -----------------------------------------------------------------------------
authRouter.post("/admin/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    console.log(`[Admin Login Attempt] Email: ${email}`);

    if (!email || !password) {
      return c.json({ success: false, error: "Email and password are required" }, 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const envAdminSecret = (config.adminSecret || process.env.ADMIN_SECRET || "").trim();
    const designatedAdminEmails = [
      "shohag@burhan.com",
      "admin@mogent.tech",
      (config.adminEmail || process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    ].filter(Boolean);

    // Only allow designated admin emails
    if (!designatedAdminEmails.includes(cleanEmail)) {
      return c.json({ success: false, error: "Access Denied: Invalid Super Admin Credentials." }, 401);
    }

    let isValid = false;
    let adminUserId = "";
    let adminUserName = "Super Admin";

    // 1. Check in database
    try {
      const adminUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (adminUser) {
        adminUserId = adminUser.id;
        adminUserName = adminUser.name || "Super Admin";

        if (adminUser.passwordHash) {
          isValid = await bcrypt.compare(cleanPassword, adminUser.passwordHash);
        }
      }
    } catch (dbErr: any) {
      console.warn("[Admin Login DB check]", dbErr.message);
    }

    // 2. Fallback to ADMIN_SECRET if explicitly configured
    if (!isValid && Boolean(envAdminSecret) && cleanPassword === envAdminSecret) {
      isValid = true;
      try {
        const hashedPassword = await bcrypt.hash(cleanPassword, 10);
        const user = await prisma.user.upsert({
          where: { email: cleanEmail },
          update: { isAdmin: true, passwordHash: hashedPassword },
          create: { email: cleanEmail, name: "Super Admin", isAdmin: true, passwordHash: hashedPassword },
        });
        adminUserId = user.id;
        adminUserName = user.name || "Super Admin";
      } catch (upsertErr: any) {
        console.warn("[Admin Login DB sync]", upsertErr.message);
      }
    }

    if (!isValid || !adminUserId) {
      console.warn(`[Admin Login Failed] Invalid credentials for: ${cleanEmail}`);
      return c.json({ success: false, error: "Access Denied: Invalid Super Admin Credentials." }, 401);
    }

    // Issue Secure 365-Day Admin JWT
    const token = await sign(
      {
        userId: adminUserId,
        email: cleanEmail,
        isAdmin: true,
        role: "SUPER_ADMIN",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 365 days
      },
      config.jwtSecret,
      "HS256"
    );

    console.log(`[Admin Login Success] Logged in successfully: ${cleanEmail}`);

    return c.json({
      success: true,
      data: {
        token,
        admin: {
          id: adminUserId,
          email: cleanEmail,
          name: adminUserName,
          role: "SUPER_ADMIN",
        },
      },
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    return c.json({ success: false, error: error.message || "Admin login failed" }, 500);
  }
});
