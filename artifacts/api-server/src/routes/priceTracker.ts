import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, productPriceHistoryTable } from "@workspace/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { httpCache } from "../lib/httpCache.js";
import {
  getOldPricesForProducts,
  attachPriceDrop,
  PRICE_DROP_WINDOW_DAYS,
} from "../services/priceHistoryService.js";

const router = Router();

/* ---------- GET /api/products/:slug/price-history ---------------------- */

router.get(
  "/products/:slug/price-history",
  httpCache({ maxAge: 300 }),
  async (req, res) => {
    try {
      const slug = String(req.params.slug || "");
      if (!slug) return res.status(400).json({ error: "Invalid slug" });

      const [product] = await db
        .select({ id: productsTable.id, currentPrice: productsTable.price })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.slug, slug),
            eq(productsTable.status, "published"),
          ),
        )
        .limit(1);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const rows = await db
        .select({
          recordedAt: productPriceHistoryTable.recordedAt,
          price: productPriceHistoryTable.price,
          priceBeforeDisc: productPriceHistoryTable.priceBeforeDisc,
        })
        .from(productPriceHistoryTable)
        .where(
          and(
            eq(productPriceHistoryTable.productId, product.id),
            sql`${productPriceHistoryTable.recordedAt} >= ${cutoff}`,
          ),
        )
        .orderBy(asc(productPriceHistoryTable.recordedAt));

      const history = rows.map((r) => ({
        recordedAt: r.recordedAt?.toISOString() ?? null,
        price: r.price,
        priceBeforeDisc: r.priceBeforeDisc,
      }));

      const min = history.length
        ? Math.min(...history.map((h) => h.price))
        : product.currentPrice;
      const max = history.length
        ? Math.max(...history.map((h) => h.price))
        : product.currentPrice;
      const first = history[0]?.price ?? product.currentPrice;
      const last = history[history.length - 1]?.price ?? product.currentPrice;

      return res.json({
        currentPrice: product.currentPrice,
        history,
        stats: {
          min,
          max,
          firstPrice: first,
          lastPrice: last,
          changePct: first ? Math.round(((last - first) / first) * 100) : 0,
          windowDays: 90,
          dataPoints: history.length,
        },
      });
    } catch (err) {
      (req as any).log?.error?.({ err }, "Error getting price history");
      return res.status(500).json({ error: "Failed to get price history" });
    }
  },
);

/* ---------- GET /api/price-drops — produk dengan penurunan harga ----- */

router.get("/price-drops", httpCache({ maxAge: 180 }), async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query["limit"] ?? "24"), 10) || 24, 1), 60);

    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      .orderBy(desc(productsTable.lastUpdated))
      .limit(300);

    if (products.length === 0) {
      return res.json({ products: [], windowDays: PRICE_DROP_WINDOW_DAYS });
    }

    const oldPriceMap = await getOldPricesForProducts(products.map((p) => p.id));

    const withDrop = products
      .map((p) => {
        const { commission: _c, commissionRate: _r, ...rest } = p as any;
        return attachPriceDrop(rest, oldPriceMap);
      })
      .filter((p) => p.oldPrice7d != null && p.oldPrice7d > p.price)
      .map((p) => {
        const dropPct = Math.round(
          ((p.oldPrice7d! - p.price) / p.oldPrice7d!) * 100,
        );
        return { ...p, dropPct };
      })
      .sort((a, b) => b.dropPct - a.dropPct)
      .slice(0, limit);

    return res.json({
      products: withDrop,
      windowDays: PRICE_DROP_WINDOW_DAYS,
    });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error getting price drops");
    return res.status(500).json({ error: "Failed to get price drops" });
  }
});

export default router;
