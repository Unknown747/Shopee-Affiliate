import { db } from "@workspace/db";
import { productPriceHistoryTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const PRICE_DROP_WINDOW_DAYS = 7;

/**
 * For each product id, find the most recent price snapshot recorded
 * at or before (now - window). If that snapshot's price is higher than
 * the product's current price, treat it as a price drop.
 *
 * Returns a Map<productId, oldPrice7d>.
 */
export async function getOldPricesForProducts(
  productIds: string[],
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const cutoff = new Date(Date.now() - PRICE_DROP_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db.execute<{ product_id: string; price: number }>(sql`
    SELECT DISTINCT ON (product_id) product_id, price
    FROM product_price_history
    WHERE product_id IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})
      AND recorded_at <= ${cutoff}
    ORDER BY product_id, recorded_at DESC
  `);

  const map = new Map<string, number>();
  const list = (rows as unknown as { rows?: Array<{ product_id: string; price: number }> }).rows
    ?? (rows as unknown as Array<{ product_id: string; price: number }>);
  for (const r of list) {
    map.set(r.product_id, Number(r.price));
  }
  return map;
}

/**
 * Attach `oldPrice7d` field to a product. Value is non-null only when
 * the older snapshot price is strictly higher than the current price.
 */
export function attachPriceDrop<T extends { id: string; price: number }>(
  product: T,
  oldPriceMap: Map<string, number>,
): T & { oldPrice7d: number | null } {
  const old = oldPriceMap.get(product.id);
  return {
    ...product,
    oldPrice7d: typeof old === "number" && old > product.price ? old : null,
  };
}

/**
 * Record a price snapshot for a product.
 * Only inserts a new row if the price has actually changed since the last snapshot,
 * to keep the history table compact.
 */
export async function recordPriceSnapshot(
  productId: string,
  price: number,
  priceBeforeDisc?: number | null,
): Promise<void> {
  const [latest] = await db
    .select()
    .from(productPriceHistoryTable)
    .where(eq(productPriceHistoryTable.productId, productId))
    .orderBy(desc(productPriceHistoryTable.recordedAt))
    .limit(1);

  if (latest && latest.price === price && (latest.priceBeforeDisc ?? null) === (priceBeforeDisc ?? null)) {
    return;
  }

  await db.insert(productPriceHistoryTable).values({
    productId,
    price,
    priceBeforeDisc: priceBeforeDisc ?? null,
  });
}
