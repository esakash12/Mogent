import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { copilotService } from "../services/copilot-service";

export const copilotRouter = new Hono();

// Enforce authentication on all Co-Pilot routes
copilotRouter.use("*", authMiddleware);

/**
 * GET /api/copilot/session
 * Returns the current active session and chat messages.
 */
copilotRouter.get("/session", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  const user = (c as any).get("user");
  const userId = user?.id || "anonymous-user";

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const session = await copilotService.getOrCreateSession(workspaceId, userId);
    return c.json({ success: true, data: session });
  } catch (error: any) {
    console.error("CoPilot session fetch error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/copilot/chat
 * Send a message to the Business Co-Pilot to manage the store.
 */
copilotRouter.post("/chat", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  const user = (c as any).get("user");
  const userId = user?.id || "anonymous-user";

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const { message, text, pageId } = body;
    const content = (message || text || "").trim();

    if (!content) {
      return c.json({ success: false, error: "Message content cannot be empty" }, 400);
    }

    const result = await copilotService.processChat({
      workspaceId,
      userId,
      text: content,
      pageId: pageId || undefined,
    });

    return c.json({
      success: true,
      data: {
        reply: result.reply,
        action: result.action,
        session: result.session,
      },
    });
  } catch (error: any) {
    console.error("CoPilot chat error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/copilot/memories
 * Returns all learned dynamic rules and policies for this workspace.
 */
copilotRouter.get("/memories", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  const pageId = c.req.query("pageId");

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const memories = await copilotService.listMemories(workspaceId, pageId);
    return c.json({ success: true, data: memories });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/copilot/memories/:id
 * Remove a specific memory rule.
 */
copilotRouter.delete("/memories/:id", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  const { id } = c.req.param();

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    await copilotService.deleteMemory(id, workspaceId);
    return c.json({ success: true, message: "Rule deleted successfully" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PATCH /api/copilot/memories/:id/toggle
 * Enable or disable a specific memory rule.
 */
copilotRouter.patch("/memories/:id/toggle", async (c) => {
  const workspaceId = (c as any).get("workspaceId") || c.req.header("x-workspace-id");
  const { id } = c.req.param();

  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace context is required" }, 400);
  }

  try {
    const body = await c.req.json();
    const { isActive } = body;
    await copilotService.toggleMemory(id, workspaceId, Boolean(isActive));
    return c.json({ success: true, message: "Rule status updated" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
