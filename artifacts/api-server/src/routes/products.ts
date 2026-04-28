import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, clickLogsTable } from "@workspace/db/schema";
import { eq, desc, asc, and, sql, ne } from "drizzle-orm";
import {
  GetProductBySlugParams,
  TrackProductClickParams,
  TrackProductClickBody,
  PublishProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  ListProductsQueryParams,
} from "@workspace/api-zod";
import { getCached, setCached, deleteCached } from "../services/cacheService.js";
import crypto from "crypto";

const router = Router();

function stripPrivateFields<T extends Record<string, unknown>>(product: T): Omit<T, "commission" | "commissionRate"> {
  const { commission: _c, commissionRate: _r, ...rest } = product as T & { commission?: unknown; commissionRate?: unknown };
  return rest;
}

router.get("/products", async (req, res) => {
  try {
    const query = ListProductsQueryParams.parse(req.query);
    const { page, limit, category, sort } = query;
    const offset = (page - 1) * limit;

    const cacheKey = `products:${JSON.stringify(query)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const conditions = [eq(productsTable.status, "published")];
    if (category) {
      conditions.push(eq(productsTable.category, category));
    }

    let orderBy;
    switch (sort) {
      case "cheapest":
        orderBy = asc(productsTable.price);
        break;
      case "rating":
        orderBy = desc(productsTable.ratingStar);
        break;
      case "popular":
        orderBy = desc(productsTable.clickCount);
        break;
      default:
        orderBy = desc(productsTable.createdAt);
    }

    const [products, totalResult] = await Promise.all([
      db
        .select()
        .from(productsTable)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(and(...conditions)),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    const result = {
      products: products.map(stripPrivateFields),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    setCached(cacheKey, result, 300);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing products");
    return res.status(500).json({ error: "Failed to list products" });
  }
});

router.get("/products/:slug", async (req, res) => {
  try {
    const { slug } = GetProductBySlugParams.parse(req.params);

    const cacheKey = `product:${slug}`;
    const cached = getCached(cacheKey);
    if (cached) {
      await db
        .update(productsTable)
        .set({ viewCount: sql`${productsTable.viewCount} + 1` })
        .where(eq(productsTable.slug, slug));
      return res.json(cached);
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    if (!products[0]) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = products[0];

    await db
      .update(productsTable)
      .set({ viewCount: sql`${productsTable.viewCount} + 1` })
      .where(eq(productsTable.id, product.id));

    const updatedProduct = stripPrivateFields({ ...product, viewCount: product.viewCount + 1 });
    setCached(cacheKey, updatedProduct, 1800);
    return res.json(updatedProduct);
  } catch (err) {
    req.log.error({ err }, "Error getting product by slug");
    return res.status(500).json({ error: "Failed to get product" });
  }
});

router.post("/products/:id/click", async (req, res) => {
  try {
    const { id } = TrackProductClickParams.parse(req.params);
    const body = TrackProductClickBody.parse(req.body);

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (!products[0]) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = products[0];

    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

    await Promise.all([
      db
        .update(productsTable)
        .set({ clickCount: sql`${productsTable.clickCount} + 1` })
        .where(eq(productsTable.id, id)),
      db.insert(clickLogsTable).values({
        productId: id,
        ipHash,
        userAgent: req.headers["user-agent"],
        referer: body.referer ?? req.headers.referer,
      }),
    ]);

    deleteCached(`product:${product.slug}`);

    return res.json({ success: true, affiliateLink: product.affiliateLink });
  } catch (err) {
    req.log.error({ err }, "Error tracking click");
    return res.status(500).json({ error: "Failed to track click" });
  }
});

router.post("/products/:id/publish", async (req, res) => {
  try {
    const { id } = PublishProductParams.parse(req.params);

    const updated = await db
      .update(productsTable)
      .set({ status: "published", publishedAt: new Date(), lastUpdated: new Date() })
      .where(eq(productsTable.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Product not found" });
    }

    deleteCached(`product:${updated[0].slug}`);
    deleteCached("products:");

    return res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Error publishing product");
    return res.status(500).json({ error: "Failed to publish product" });
  }
});

router.patch("/products/:id", async (req, res) => {
  try {
    const { id } = UpdateProductParams.parse(req.params);
    const body = UpdateProductBody.parse(req.body);

    const updateData: Partial<typeof productsTable.$inferInsert> = {
      lastUpdated: new Date(),
    };

    if (body.reviewContent !== undefined) updateData.reviewContent = body.reviewContent;
    if (body.pros !== undefined) updateData.pros = body.pros;
    if (body.cons !== undefined) updateData.cons = body.cons;
    if (body.faq !== undefined) updateData.faq = body.faq as Array<{ question: string; answer: string }>;
    if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle;
    if (body.metaDesc !== undefined) updateData.metaDesc = body.metaDesc;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.status != null) updateData.status = body.status;

    const updated = await db
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Product not found" });
    }

    deleteCached(`product:${updated[0].slug}`);

    return res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Error updating product");
    return res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const { id } = DeleteProductParams.parse(req.params);

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    if (!products[0]) {
      return res.status(404).json({ error: "Product not found" });
    }

    await db.delete(productsTable).where(eq(productsTable.id, id));
    deleteCached(`product:${products[0].slug}`);

    return res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    req.log.error({ err }, "Error deleting product");
    return res.status(500).json({ error: "Failed to delete product" });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const cacheKey = "categories";
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const result = await db
      .select({
        category: productsTable.category,
        count: sql<number>`count(*)`,
      })
      .from(productsTable)
      .where(and(eq(productsTable.status, "published"), ne(productsTable.category, "")))
      .groupBy(productsTable.category)
      .orderBy(desc(sql`count(*)`));

    const categories = result
      .filter((r) => r.category)
      .map((r) => ({ category: r.category!, count: Number(r.count) }));

    setCached(cacheKey, categories, 600);
    return res.json(categories);
  } catch (err) {
    req.log.error({ err }, "Error listing categories");
    return res.status(500).json({ error: "Failed to list categories" });
  }
});

export default router;
