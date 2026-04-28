import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc, asc, sql, ilike, or } from "drizzle-orm";
import { SearchProductsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/search", async (req, res) => {
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
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Error searching products");
    return res.status(500).json({ error: "Failed to search products" });
  }
});

export default router;
