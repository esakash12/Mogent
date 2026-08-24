import { Hono } from "hono";
import { prisma, AiMode } from "@mogent/database";
import { encryptToken } from "@mogent/shared";
import { config } from "../config";
import crypto from "crypto";

export const pagesRouter = new Hono();

// -----------------------------------------------------------------------------
// 1. GET ALL FACEBOOK PAGES FOR WORKSPACE
// -----------------------------------------------------------------------------
pagesRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const pages = await prisma.facebookPage.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: pages.map((p) => ({
        id: p.id,
        name: p.name,
        pageId: p.pageId,
        category: p.category || "Online Store",
        aiMode: p.aiMode,
        webhookStatus: p.webhookSubscribed ? "SUBSCRIBED" : "PENDING",
        systemPrompt: p.systemPrompt || "You are a helpful AI assistant.",
        temperature: p.aiTemperature,
        isActive: p.isActive,
        createdAt: p.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching pages:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 2. CONNECT NEW FACEBOOK PAGE
// -----------------------------------------------------------------------------
pagesRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { name, pageId, accessToken, systemPrompt, aiMode, category } = body;
    let workspaceId = c.req.header("x-workspace-id") || body.workspaceId;

    if (!name || !pageId || !accessToken) {
      return c.json({ success: false, error: "Name, Page ID, and Access Token are required" }, 400);
    }

    // Fallback to default workspace if not supplied
    if (!workspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      if (defaultWs) workspaceId = defaultWs.id;
      else {
        const newWs = await prisma.workspace.create({
          data: { name: "Default Workspace", slug: "default-ws" },
        });
        workspaceId = newWs.id;
      }
    }

    // Encrypt the Access Token using AES-256-GCM
    const { encryptedData, iv, tag } = encryptToken(accessToken.trim(), config.tokenEncryptionKey);
    const verifyToken = `mogent_${crypto.randomBytes(12).toString("hex")}`;

    const validAiMode = Object.values(AiMode).includes(aiMode) ? aiMode : AiMode.HYBRID;

    const page = await prisma.facebookPage.upsert({
      where: { pageId: pageId.trim() },
      update: {
        name: name.trim(),
        encryptedAccessToken: encryptedData,
        tokenIv: iv,
        tokenTag: tag,
        systemPrompt: systemPrompt?.trim() || "You are a polite AI customer service executive.",
        aiMode: validAiMode,
        category: category || "E-Commerce",
        isActive: true,
        webhookSubscribed: true,
      },
      create: {
        workspaceId,
        pageId: pageId.trim(),
        name: name.trim(),
        category: category || "E-Commerce",
        encryptedAccessToken: encryptedData,
        tokenIv: iv,
        tokenTag: tag,
        verifyToken,
        webhookSubscribed: true,
        aiMode: validAiMode,
        systemPrompt: systemPrompt?.trim() || "You are a polite AI customer service executive.",
        aiTemperature: 0.3,
        isActive: true,
      },
    });

    return c.json({
      success: true,
      data: {
        id: page.id,
        name: page.name,
        pageId: page.pageId,
        category: page.category,
        aiMode: page.aiMode,
        webhookStatus: "SUBSCRIBED",
        systemPrompt: page.systemPrompt,
        temperature: page.aiTemperature,
      },
    });
  } catch (error: any) {
    console.error("Error connecting Facebook page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 3. UPDATE PAGE SETTINGS (AI Mode, System Prompt, Temperature)
// -----------------------------------------------------------------------------
pagesRouter.patch("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    const body = await c.req.json();
    const { aiMode, systemPrompt, temperature, businessName, businessDescription, isActive } = body;

    const updateData: any = {};
    if (aiMode && Object.values(AiMode).includes(aiMode)) updateData.aiMode = aiMode;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (temperature !== undefined) updateData.aiTemperature = Number(temperature);
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.facebookPage.update({
      where: { id },
      data: updateData,
    });

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// 4. DELETE PAGE
// -----------------------------------------------------------------------------
pagesRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.facebookPage.delete({
      where: { id },
    });
    return c.json({ success: true, message: "Page disconnected successfully" });
  } catch (error: any) {
    console.error("Error deleting page:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
