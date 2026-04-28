import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { GenerateAffiliateLinkBody } from "@workspace/api-zod";
import { generateAffiliateLink } from "../services/shopeeService.js";
import slugify from "slugify";

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
