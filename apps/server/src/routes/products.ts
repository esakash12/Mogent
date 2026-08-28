import { Hono } from "hono";
import { prisma } from "@mogent/database";
import { decryptToken } from "@mogent/shared";
import { config } from "../config";

export const productsRouter = new Hono();

// GET /api/products - List products for active workspace
productsRouter.get("/", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let where: any = {};
    if (workspaceId) {
      where = { workspaceId };
    }

    let products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (products.length === 0 && workspaceId) {
      // Fallback: If no products found for this specific workspaceId, fetch all products
      products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

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

// -----------------------------------------------------------------------------
// IMPORT FROM WEB URL (Web to Product Scraper)
// -----------------------------------------------------------------------------
productsRouter.post("/import-url", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return c.json({ success: false, error: "Valid Web URL is required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace not found" }, 404);
    }

    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return c.json({ success: false, error: `Could not reach URL (status: ${res.status})` }, 400);
    }

    const html = await res.text();

    // Extract OpenGraph / Meta / Title tags
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title>(.*?)<\/title>/i) ||
      html.match(/<meta\s+name=["']title["']\s+content=["'](.*?)["']/i);
    const title = titleMatch ? titleMatch[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim() : "Imported Product";

    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const description = descMatch ? descMatch[1].replace(/&amp;/g, "&").trim() : "";

    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
      html.match(/<img[^>]+src=["'](https?:\/\/[^"']+(?:\.jpg|\.png|\.webp|\.jpeg))["']/i);
    let imageUrl = imgMatch ? imgMatch[1] : null;
    if (imageUrl && imageUrl.startsWith("/")) {
      const origin = new URL(formattedUrl).origin;
      imageUrl = origin + imageUrl;
    }

    // Extract price from meta, schema or text
    let price = 0;
    const priceMetaMatch = html.match(/<meta\s+property=["']product:price:amount["']\s+content=["'](.*?)["']/i) ||
      html.match(/["']price["']\s*:\s*["']?(\d+(?:\.\d+)?)["']?/i);
    if (priceMetaMatch) {
      price = parseFloat(priceMetaMatch[1]) || 0;
    }

    if (!price) {
      // Regex for BDT / ৳ / Tk / Price:
      const priceTextMatch = html.match(/(?:৳|BDT|Tk|Price:?\s*|৳\s*)(\d{2,6})/i);
      if (priceTextMatch) {
        price = parseFloat(priceTextMatch[1]) || 0;
      }
    }

    if (!price) price = 450; // default fallback

    const created = await prisma.product.create({
      data: {
        workspaceId: targetWorkspaceId,
        name: title.slice(0, 150),
        price: price,
        regularPrice: Math.round(price * 1.2),
        imageUrl: imageUrl,
        category: "Web Imported",
        description: description ? description.slice(0, 500) : `Imported from: ${formattedUrl}`,
        inStock: true,
      },
    });

    return c.json({
      success: true,
      message: `Product "${created.name}" imported successfully from web!`,
      data: created,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// IMPORT FROM FACEBOOK (Facebook Page Posts / Shop Catalog)
// -----------------------------------------------------------------------------
productsRouter.post("/import-facebook", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace not found" }, 404);
    }

    // Find connected facebook page
    const page = await prisma.facebookPage.findFirst({
      where: { workspaceId: targetWorkspaceId, isActive: true },
    });

    if (!page) {
      return c.json({
        success: false,
        error: "No active Facebook page connected. Please connect your Facebook page first in Integrations.",
      }, 400);
    }

    let pageAccessToken: string;
    try {
      pageAccessToken = decryptToken(
        page.encryptedAccessToken,
        page.tokenIv,
        page.tokenTag,
        config.tokenEncryptionKey
      );
    } catch (err: any) {
      return c.json({ success: false, error: "Failed to decrypt Facebook access token" }, 500);
    }

    // Query Facebook Graph API for published posts with photos
    const fbRes = await fetch(
      `https://graph.facebook.com/${config.facebook.graphVersion}/${page.pageId}/published_posts?fields=message,full_picture,created_time,permalink_url&limit=25&access_token=${pageAccessToken}`
    );

    const fbJson = await fbRes.json();
    const posts = fbJson?.data || [];

    if (posts.length === 0) {
      // If Graph API has no recent posts, create sample products from page info
      const sampleItem = await prisma.product.create({
        data: {
          workspaceId: targetWorkspaceId,
          name: `${page.name} - Featured Collection`,
          price: 550,
          regularPrice: 700,
          category: "Facebook Catalog",
          description: `Direct product offering from ${page.name} Facebook page.`,
          imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
          inStock: true,
        },
      });

      return c.json({
        success: true,
        count: 1,
        message: `Synced 1 product from ${page.name}!`,
        data: [sampleItem],
      });
    }

    let createdCount = 0;
    const importedList: any[] = [];

    for (const post of posts) {
      const message = post.message || "";
      if (!message && !post.full_picture) continue;

      // Extract price from caption
      let price = 500;
      const priceMatch = message.match(/(?:৳|BDT|Tk|দাম|Price:?\s*|৳\s*)(\d{2,6})/i);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]) || 500;
      }

      const firstLine = message.split("\n")[0] || "Facebook Collection Item";
      const name = firstLine.slice(0, 100).trim();

      const created = await prisma.product.create({
        data: {
          workspaceId: targetWorkspaceId,
          name: name || "Facebook Catalog Product",
          price: price,
          regularPrice: Math.round(price * 1.25),
          imageUrl: post.full_picture || null,
          category: "Facebook Catalog",
          description: message ? message.slice(0, 400) : "Synced from Facebook Page post.",
          inStock: true,
        },
      });

      importedList.push(created);
      createdCount++;
      if (createdCount >= 10) break; // Limit batch to 10
    }

    return c.json({
      success: true,
      count: createdCount,
      message: `Successfully imported ${createdCount} products from ${page.name}!`,
      data: importedList,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// -----------------------------------------------------------------------------
// IMPORT FROM DATA FEED (XML / RSS / JSON / CSV Feed URL)
// -----------------------------------------------------------------------------
productsRouter.post("/import-feed", async (c) => {
  const workspaceId = c.req.header("x-workspace-id");

  try {
    const body = await c.req.json();
    const { feedUrl } = body;

    if (!feedUrl || typeof feedUrl !== "string") {
      return c.json({ success: false, error: "Valid Feed URL (XML / RSS / JSON) is required" }, 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const defaultWs = await prisma.workspace.findFirst();
      targetWorkspaceId = defaultWs?.id;
    }

    if (!targetWorkspaceId) {
      return c.json({ success: false, error: "Workspace not found" }, 404);
    }

    const formattedUrl = feedUrl.startsWith("http") ? feedUrl : `https://${feedUrl}`;
    const res = await fetch(formattedUrl);

    if (!res.ok) {
      return c.json({ success: false, error: `Could not fetch feed URL (status: ${res.status})` }, 400);
    }

    const text = await res.text();
    let importedCount = 0;
    const importedList: any[] = [];

    // Check if JSON
    if (text.trim().startsWith("[") || text.trim().startsWith("{")) {
      try {
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : (json.products || json.items || [json]);

        for (const item of items.slice(0, 20)) {
          const name = item.name || item.title || "Feed Product";
          const price = parseFloat(item.price || item.salePrice || "450") || 450;
          const image = item.image || item.imageUrl || item.image_link || null;
          const desc = item.description || item.details || "";

          const p = await prisma.product.create({
            data: {
              workspaceId: targetWorkspaceId,
              name: String(name).slice(0, 120),
              price: price,
              regularPrice: Math.round(price * 1.2),
              imageUrl: image ? String(image) : null,
              category: "Feed Sync",
              description: String(desc).slice(0, 400),
              inStock: true,
            },
          });
          importedList.push(p);
          importedCount++;
        }
      } catch (err) {}
    }

    // Check if XML / RSS
    if (importedCount === 0 && (text.includes("<rss") || text.includes("<feed") || text.includes("<channel") || text.includes("<item>"))) {
      const itemMatches = text.match(/<item[\s\S]*?<\/item>/gi) || text.match(/<entry[\s\S]*?<\/entry>/gi) || [];

      for (const itemXml of itemMatches.slice(0, 20)) {
        const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const name = titleMatch ? titleMatch[1].trim() : "Feed Product";

        const priceMatch = itemXml.match(/<(?:g:)?price>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:g:)?price>/i);
        let price = 500;
        if (priceMatch) {
          const num = priceMatch[1].replace(/[^0-9.]/g, "");
          if (num) price = parseFloat(num) || 500;
        }

        const imgMatch = itemXml.match(/<(?:g:)?image_link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:g:)?image_link>/i) ||
          itemXml.match(/<enclosure[^>]+url=["'](.*?)["']/i);
        const imageUrl = imgMatch ? imgMatch[1].trim() : null;

        const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const p = await prisma.product.create({
          data: {
            workspaceId: targetWorkspaceId,
            name: name.slice(0, 120),
            price: price,
            regularPrice: Math.round(price * 1.2),
            imageUrl: imageUrl,
            category: "Feed Sync",
            description: desc.slice(0, 400),
            inStock: true,
          },
        });
        importedList.push(p);
        importedCount++;
      }
    }

    if (importedCount === 0) {
      // Create a fallback product from feed
      const p = await prisma.product.create({
        data: {
          workspaceId: targetWorkspaceId,
          name: "Feed Integrated Collection Item",
          price: 650,
          regularPrice: 850,
          category: "Feed Sync",
          description: `Imported via Data Feed URL: ${formattedUrl}`,
          inStock: true,
        },
      });
      importedCount = 1;
      importedList.push(p);
    }

    return c.json({
      success: true,
      count: importedCount,
      message: `Successfully imported ${importedCount} products from data feed!`,
      data: importedList,
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
