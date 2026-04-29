import { Router } from "express";
import { db } from "@workspace/db";
import { promosTable, productsTable } from "@workspace/db/schema";
import { and, desc, eq, gte, lte, or, isNull, sql } from "drizzle-orm";
import { httpCache } from "../lib/httpCache.js";
import {
  getOldPricesForProducts,
  attachPriceDrop,
} from "../services/priceHistoryService.js";

const router = Router();

const TOP_LIMIT = 24;

function strip<T extends Record<string, unknown>>(p: T) {
  const { commission: _c, commissionRate: _r, ...rest } = p as any;
  return rest;
}

function activePromoCondition() {
  const now = new Date();
  return and(
    eq(promosTable.status, "published"),
    or(isNull(promosTable.startDate), lte(promosTable.startDate, now)),
    or(isNull(promosTable.endDate), gte(promosTable.endDate, now)),
  );
}

router.get("/promos", httpCache({ maxAge: 120 }), async (req, res) => {
  try {
    const promos = await db
      .select()
      .from(promosTable)
      .where(activePromoCondition())
      .orderBy(desc(promosTable.startDate));
    return res.json({ promos });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error listing promos");
    return res.status(500).json({ error: "Failed to list promos" });
  }
});

router.get("/promos/:slug", httpCache({ maxAge: 120 }), async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    if (!slug) return res.status(400).json({ error: "Invalid slug" });

    const rows = await db
      .select()
      .from(promosTable)
      .where(and(eq(promosTable.slug, slug), eq(promosTable.status, "published")))
      .limit(1);

    const promo = rows[0];
    if (!promo) return res.status(404).json({ error: "Promo not found" });

    let products: any[] = [];
    if (promo.tag) {
      const tagLower = promo.tag.toLowerCase();
      const productsRows = await db.execute<any>(sql`
        SELECT * FROM products
        WHERE status = 'published'
          AND tags IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(tags) AS t
            WHERE lower(t) = ${tagLower}
          )
        ORDER BY (
          COALESCE(rating_star,0) * 20
          + COALESCE(click_count,0) * 3
          + COALESCE(view_count,0)
        ) DESC
        LIMIT ${TOP_LIMIT}
      `);
      const list =
        (productsRows as unknown as { rows?: any[] }).rows ??
        (productsRows as unknown as any[]);
      const mapped = list.map((p: any) => ({
        id: p.id,
        shopeeId: p.shopee_id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        priceBeforeDisc: p.price_before_disc != null ? Number(p.price_before_disc) : null,
        imageUrl: p.image_url,
        images: p.images,
        shopName: p.shop_name,
        shopRating: p.shop_rating != null ? Number(p.shop_rating) : null,
        ratingStar: p.rating_star != null ? Number(p.rating_star) : null,
        soldCount: p.sold_count,
        category: p.category,
        tags: p.tags,
        affiliateLink: p.affiliate_link,
        viewCount: p.view_count,
        clickCount: p.click_count,
        conversionCount: p.conversion_count,
        status: p.status,
        createdAt: p.created_at,
        lastUpdated: p.last_updated,
        publishedAt: p.published_at,
      }));
      const oldPriceMap = await getOldPricesForProducts(mapped.map((p: any) => p.id));
      products = mapped.map((p: any) => attachPriceDrop(strip(p), oldPriceMap));
    }

    return res.json({ promo, products });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error getting promo");
    return res.status(500).json({ error: "Failed to get promo" });
  }
});

export default router;
