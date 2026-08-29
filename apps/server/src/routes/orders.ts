import { Hono } from "hono";
import { OrdersController } from "../controllers/orders.controller";

export const ordersRouter = new Hono();

// GET /api/orders - List all orders for the workspace
ordersRouter.get("/", OrdersController.list);

// POST /api/orders - Create a new order manually or from chat
ordersRouter.post("/", OrdersController.create);

// PATCH /api/orders/:id/status - Update order status
ordersRouter.patch("/:id/status", OrdersController.updateStatus);
