import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { GenerateAffiliateLinkBody } from "@workspace/api-zod";
import { generateAffiliateLink } from "../services/shopeeService.js";
import { recordPriceSnapshot } from "../services/priceHistoryService.js";
import { deleteCached, deleteCachedByPattern } from "../services/cacheService.js";
import slugify from "slugify";

/**
 * Invalidate every public cache key that may contain a stale view of this
 * product's price (so the "Harga Turun!" badge appears immediately after a
 * snapshot is recorded).
 */
function invalidateProductCaches(slug?: string | null) {
  if (slug) deleteCached(`product:${slug}`);
  deleteCachedByPattern("products:");
}

const router = Router();

router.post("/affiliate/generate", async (req, res) => {
  try {
    const body = GenerateAffiliateLinkBody.parse(req.body);
    const { url } = body;

    if (!url.includes("shopee.co.id") && !url.includes("shope.ee")) {
      return res.status(400).json({
        error: "Invalid URL",
        message: "URL harus dari domain shopee.co.id atau shope.ee",
      });
    }

    const productInfo = await generateAffiliateLink(url);

    const existing = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.shopeeId, productInfo.shopeeId))
      .limit(1);

    if (existing[0]) {
      const updated = await db
        .update(productsTable)
        .set({
          affiliateLink: productInfo.affiliateLink,
          price: productInfo.price,
          priceBeforeDisc: productInfo.priceBeforeDisc,
          commission: productInfo.commission,
          commissionRate: productInfo.commissionRate,
          lastUpdated: new Date(),
        })
        .where(eq(productsTable.id, existing[0].id))
        .returning();

      await recordPriceSnapshot(existing[0].id, productInfo.price, productInfo.priceBeforeDisc);
      invalidateProductCaches(existing[0].slug);

      return res.json({ product: updated[0] || existing[0], isNew: false });
    }

    const slug = slugify(productInfo.name, {
      lower: true,
      strict: true,
      locale: "id",
    });

    const uniqueSlug = `${slug}-${Date.now()}`;

    const [product] = await db
      .insert(productsTable)
      .values({
        shopeeId: productInfo.shopeeId,
        name: productInfo.name,
        slug: uniqueSlug,
        price: productInfo.price,
        priceBeforeDisc: productInfo.priceBeforeDisc,
        commission: productInfo.commission,
        commissionRate: productInfo.commissionRate,
        imageUrl: productInfo.imageUrl,
        images: productInfo.images,
        shopName: productInfo.shopName,
        shopRating: productInfo.shopRating,
        ratingStar: productInfo.ratingStar,
        soldCount: productInfo.soldCount,
        category: productInfo.category || "Umum",
        affiliateLink: productInfo.affiliateLink,
        status: "draft",
      })
      .returning();

    await recordPriceSnapshot(product.id, product.price, product.priceBeforeDisc);
    invalidateProductCaches(product.slug);

    return res.json({ product, isNew: true });
  } catch (err) {
    req.log.error({ err }, "Error generating affiliate link");
    return res.status(500).json({
      error: "Generation failed",
      message: err instanceof Error ? err.message : "Gagal generate link afiliasi",
    });
  }
});

export default router;
