import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc, asc, sql, ilike, or } from "drizzle-orm";
import { SearchProductsQueryParams } from "@workspace/api-zod";
import { httpCache } from "../lib/httpCache.js";

const router = Router();

router.get("/search", httpCache({ maxAge: 30 }), async (req, res) => {
  try {
    const query = SearchProductsQueryParams.parse(req.query);
    const { q, category, minPrice, maxPrice, minRating, sort, page, limit } = query;
    const offset = (page - 1) * limit;

    const conditions = [eq(productsTable.status, "published")];

    if (q) {
      conditions.push(
        or(
          ilike(productsTable.name, `%${q}%`),
          ilike(productsTable.category, `%${q}%`),
          ilike(productsTable.shopName, `%${q}%`),
        )!,
      );
    }

    if (category) {
      conditions.push(eq(productsTable.category, category));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(productsTable.price, minPrice));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(productsTable.price, maxPrice));
    }

    if (minRating !== undefined) {
      conditions.push(gte(productsTable.ratingStar, minRating));
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
    return res.json({
      products: products.map((p) => {
        const { commission: _c, commissionRate: _r, ...rest } = p;
        return rest;
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Error searching products");
    return res.status(500).json({ error: "Failed to search products" });
  }
});

router.get("/search/suggest", httpCache({ maxAge: 60 }), async (req, res) => {
  try {
    const q = String(req.query["q"] ?? "").trim();
    if (q.length < 2) return res.json({ suggestions: [] });

    const cacheKey = `suggest:${q.toLowerCase()}`;
    const { getCached, setCached } = await import("../services/cacheService.js");
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        slug: productsTable.slug,
        imageUrl: productsTable.imageUrl,
        price: productsTable.price,
        category: productsTable.category,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          or(
            ilike(productsTable.name, `%${q}%`),
            ilike(productsTable.category, `%${q}%`),
          )!,
        ),
      )
      .orderBy(desc(productsTable.clickCount))
      .limit(8);

    const result = { suggestions: products };
    setCached(cacheKey, result, 60);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error in search suggest");
    return res.status(500).json({ error: "Failed to suggest" });
  }
});

export default router;
