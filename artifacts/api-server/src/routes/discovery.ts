import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { and, desc, eq, ne, sql, or } from "drizzle-orm";
import slugify from "slugify";
import { httpCache } from "../lib/httpCache.js";
import {
  getOldPricesForProducts,
  attachPriceDrop,
} from "../services/priceHistoryService.js";

const router = Router();

const MIN_BRAND_PRODUCTS = 2;
const MIN_TAG_PRODUCTS = 3;
const TOP_LIMIT = 24;

function makeSlug(s: string): string {
  return slugify(s, { lower: true, strict: true, locale: "id" });
}

function strip<T extends Record<string, unknown>>(p: T) {
  const { commission: _c, commissionRate: _r, ...rest } = p as any;
  return rest;
}

/* ---------- VS — bandingkan dua produk ----------------------------- */

router.get("/vs/:slugA/:slugB", httpCache({ maxAge: 300 }), async (req, res) => {
  try {
    const { slugA, slugB } = req.params as { slugA: string; slugB: string };
    if (!slugA || !slugB || slugA === slugB) {
      return res.status(400).json({ error: "Need two different slugs" });
    }

    const rows = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          or(eq(productsTable.slug, slugA), eq(productsTable.slug, slugB)),
        ),
      );

    const a = rows.find((r) => r.slug === slugA);
    const b = rows.find((r) => r.slug === slugB);
    if (!a || !b) {
      return res.status(404).json({ error: "One or both products not found" });
    }

    const oldPriceMap = await getOldPricesForProducts([a.id, b.id]);
    return res.json({
      a: attachPriceDrop(strip(a), oldPriceMap),
      b: attachPriceDrop(strip(b), oldPriceMap),
    });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error in /vs");
    return res.status(500).json({ error: "Failed to compare" });
  }
});

/* ---------- BRANDS — daftar brand & detail ------------------------- */

router.get("/brands", httpCache({ maxAge: 600 }), async (req, res) => {
  try {
    const rows = await db
      .select({
        shopName: productsTable.shopName,
        count: sql<number>`count(*)::int`,
        avgRating: sql<number>`AVG(COALESCE(${productsTable.ratingStar},0))::float`,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          ne(productsTable.shopName, ""),
        ),
      )
      .groupBy(productsTable.shopName)
      .having(sql`count(*) >= ${MIN_BRAND_PRODUCTS}`)
      .orderBy(desc(sql`count(*)`));

    const brands = rows
      .filter((r) => r.shopName)
      .map((r) => ({
        name: r.shopName as string,
        slug: makeSlug(r.shopName as string),
        productCount: r.count,
        avgRating: Math.round((r.avgRating ?? 0) * 10) / 10,
      }));

    return res.json({ brands });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error listing brands");
    return res.status(500).json({ error: "Failed to list brands" });
  }
});

router.get("/brands/:slug", httpCache({ maxAge: 300 }), async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!slug) return res.status(400).json({ error: "Invalid slug" });

    const allShops = await db
      .select({ shopName: productsTable.shopName })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          ne(productsTable.shopName, ""),
        ),
      )
      .groupBy(productsTable.shopName);

    const matched = allShops
      .map((r) => r.shopName)
      .filter((n): n is string => !!n)
      .find((n) => makeSlug(n) === slug);

    if (!matched) return res.status(404).json({ error: "Brand not found" });

    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          eq(productsTable.shopName, matched),
        ),
      )
      .orderBy(
        desc(
          sql`COALESCE(${productsTable.ratingStar},0) * 20
              + COALESCE(${productsTable.clickCount},0) * 3
              + COALESCE(${productsTable.viewCount},0)`,
        ),
      )
      .limit(TOP_LIMIT);

    const oldPriceMap = await getOldPricesForProducts(products.map((p) => p.id));
    const avgRating =
      products.reduce((sum, p) => sum + (p.ratingStar ?? 0), 0) /
        products.filter((p) => p.ratingStar).length || 0;

    return res.json({
      brand: matched,
      slug,
      productCount: products.length,
      avgRating: Math.round(avgRating * 10) / 10,
      products: products.map((p) => attachPriceDrop(strip(p), oldPriceMap)),
    });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error in /brands/:slug");
    return res.status(500).json({ error: "Failed to get brand" });
  }
});

/* ---------- KOLEKSI — tag-based curated lists ---------------------- */

router.get("/koleksi", httpCache({ maxAge: 600 }), async (req, res) => {
  try {
    // Unnest jsonb tags array, group by tag, count
    const rows = await db.execute<{ tag: string; count: number }>(sql`
      SELECT lower(jsonb_array_elements_text(tags)) AS tag,
             count(*)::int AS count
      FROM products
      WHERE status = 'published'
        AND tags IS NOT NULL
        AND jsonb_array_length(tags) > 0
      GROUP BY tag
      HAVING count(*) >= ${MIN_TAG_PRODUCTS}
      ORDER BY count DESC
      LIMIT 60
    `);

    const list =
      (rows as unknown as { rows?: Array<{ tag: string; count: number }> }).rows ??
      (rows as unknown as Array<{ tag: string; count: number }>);

    const collections = list.map((r) => ({
      tag: r.tag,
      slug: makeSlug(r.tag),
      productCount: Number(r.count),
    }));

    return res.json({ collections });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error listing koleksi");
    return res.status(500).json({ error: "Failed to list koleksi" });
  }
});

router.get("/koleksi/:slug", httpCache({ maxAge: 300 }), async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!slug) return res.status(400).json({ error: "Invalid slug" });

    // Find original tag matching this slug
    const allTagsRows = await db.execute<{ tag: string }>(sql`
      SELECT DISTINCT lower(jsonb_array_elements_text(tags)) AS tag
      FROM products
      WHERE status = 'published'
        AND tags IS NOT NULL
        AND jsonb_array_length(tags) > 0
    `);
    const allTagsList =
      (allTagsRows as unknown as { rows?: Array<{ tag: string }> }).rows ??
      (allTagsRows as unknown as Array<{ tag: string }>);

    const matchedTag = allTagsList
      .map((r) => r.tag)
      .find((t) => makeSlug(t) === slug);

    if (!matchedTag) return res.status(404).json({ error: "Collection not found" });

    const productsRows = await db.execute<any>(sql`
      SELECT * FROM products
      WHERE status = 'published'
        AND tags IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(tags) AS t
          WHERE lower(t) = ${matchedTag}
        )
      ORDER BY (
        COALESCE(rating_star,0) * 20
        + COALESCE(click_count,0) * 3
        + COALESCE(view_count,0)
      ) DESC
      LIMIT ${TOP_LIMIT}
    `);

    const products =
      (productsRows as unknown as { rows?: any[] }).rows ??
      (productsRows as unknown as any[]);

    // Map snake_case → camelCase to match ProductCard expectations
    const mapped = products.map((p: any) => ({
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
      reviewContent: p.review_content,
      pros: p.pros,
      cons: p.cons,
      faq: p.faq,
      metaTitle: p.meta_title,
      metaDesc: p.meta_desc,
      viewCount: p.view_count,
      clickCount: p.click_count,
      conversionCount: p.conversion_count,
      status: p.status,
      createdAt: p.created_at,
      lastUpdated: p.last_updated,
      publishedAt: p.published_at,
    }));

    const oldPriceMap = await getOldPricesForProducts(mapped.map((p: any) => p.id));
    return res.json({
      tag: matchedTag,
      slug,
      productCount: mapped.length,
      products: mapped.map((p: any) => attachPriceDrop(p, oldPriceMap)),
    });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error in /koleksi/:slug");
    return res.status(500).json({ error: "Failed to get koleksi" });
  }
});

export default router;
