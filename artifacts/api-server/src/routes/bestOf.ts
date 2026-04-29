import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { and, desc, eq, ilike, ne, sql } from "drizzle-orm";
import slugify from "slugify";
import { httpCache } from "../lib/httpCache.js";
import {
  getOldPricesForProducts,
  attachPriceDrop,
} from "../services/priceHistoryService.js";

const router = Router();

const MIN_PRODUCTS_PER_CATEGORY = 3;
const TOP_N_PER_CATEGORY = 10;

function categorySlug(category: string): string {
  return slugify(category, { lower: true, strict: true, locale: "id" });
}

function stripCommission<T extends Record<string, unknown>>(p: T): Omit<T, "commission" | "commissionRate"> {
  const { commission: _c, commissionRate: _r, ...rest } = p as any;
  return rest;
}

/* ---------- GET /api/best-of — daftar semua kategori best-of -------------- */

router.get("/best-of", httpCache({ maxAge: 600 }), async (req, res) => {
  try {
    const rows = await db
      .select({
        category: productsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          ne(productsTable.category, ""),
        ),
      )
      .groupBy(productsTable.category)
      .having(sql`count(*) >= ${MIN_PRODUCTS_PER_CATEGORY}`)
      .orderBy(desc(sql`count(*)`));

    const categories = rows
      .filter((r) => r.category)
      .map((r) => ({
        category: r.category as string,
        slug: categorySlug(r.category as string),
        productCount: r.count,
      }));

    return res.json({ categories });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error listing best-of categories");
    return res.status(500).json({ error: "Failed to list best-of" });
  }
});

/* ---------- GET /api/best-of/:slug — top produk per kategori ------------ */

router.get("/best-of/:slug", httpCache({ maxAge: 300 }), async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!slug) return res.status(400).json({ error: "Invalid slug" });

    // Cari kategori yang slugnya match (case-insensitive, slugified)
    const allCategories = await db
      .select({ category: productsTable.category })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          ne(productsTable.category, ""),
        ),
      )
      .groupBy(productsTable.category);

    const matched = allCategories
      .map((c) => c.category)
      .filter((c): c is string => !!c)
      .find((c) => categorySlug(c) === slug);

    if (!matched) {
      return res.status(404).json({ error: "Category not found" });
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          eq(productsTable.category, matched),
        ),
      )
      .orderBy(
        desc(
          sql`COALESCE(${productsTable.ratingStar},0) * 20
              + COALESCE(${productsTable.clickCount},0) * 3
              + COALESCE(${productsTable.viewCount},0)
              + LEAST(COALESCE(${productsTable.soldCount},0), 1000) * 0.5`,
        ),
      )
      .limit(TOP_N_PER_CATEGORY);

    const oldPriceMap = await getOldPricesForProducts(products.map((p) => p.id));
    const ranked = products.map((p) =>
      attachPriceDrop(stripCommission(p), oldPriceMap),
    );

    return res.json({
      category: matched,
      slug,
      total: ranked.length,
      products: ranked,
    });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error getting best-of detail");
    return res.status(500).json({ error: "Failed to get best-of" });
  }
});

export default router;
