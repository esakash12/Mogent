import { Hono } from "hono";
import { prisma } from "@mogent/database";

export const productsRouter = new Hono();

// GET /api/products - List products for active workspace
productsRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let where: any = {};
    if (workspaceId) {
      where = { workspaceId };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return c.json({
      success: true,
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        regularPrice: p.regularPrice ?? Math.round(p.price * 1.25),
        image: p.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
        category: p.category || "General",
        inStock: p.inStock,
        salesCount: p.salesCount,
        description: p.description || "",
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/products - Add product to catalog
productsRouter.post("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { name, price, regularPrice, image, category, description } = body;

    if (!name || !price) {
      return c.json({ success: false, error: "Product name and price are required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "No workspace found" }, 404);
    }

    const created = await prisma.product.create({
      data: {
        workspaceId: targetWorkspaceId,
        name: name.trim(),
        price: Number(price),
        regularPrice: regularPrice ? Number(regularPrice) : null,
        imageUrl: image || null,
        category: category || "General",
        description: description || null,
        inStock: true,
      },
    });

    return c.json({
      success: true,
      data: {
        id: created.id,
        name: created.name,
        price: created.price,
        regularPrice: created.regularPrice,
        image: created.imageUrl,
        category: created.category,
        inStock: created.inStock,
        salesCount: created.salesCount,
        description: created.description,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /api/products/:id/stock - Toggle in-stock status
productsRouter.patch("/:id/stock", async (c) => {
  const { id } = c.req.param();
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return c.json({ success: false, error: "Product not found" }, 404);

    const updated = await prisma.product.update({
      where: { id },
      data: { inStock: !product.inStock },
    });

    return c.json({ success: true, inStock: updated.inStock });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/products/:id - Delete product
productsRouter.delete("/:id", async (c) => {
  const { id } = c.req.param();
  try {
    await prisma.product.delete({ where: { id } });
    return c.json({ success: true, message: "Product removed" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
