import { Hono } from "hono";
import { OrdersController } from "../controllers/orders.controller";
import { authMiddleware } from "../middleware/auth";

export const ordersRouter = new Hono();

// Enforce auth on orders routes
ordersRouter.use("*", authMiddleware);

// GET /api/orders - List all orders for the workspace
ordersRouter.get("/", OrdersController.list);

// POST /api/orders - Create a new order manually or from chat
ordersRouter.post("/", OrdersController.create);

// PATCH /api/orders/:id/status - Update order status
ordersRouter.patch("/:id/status", OrdersController.updateStatus);
