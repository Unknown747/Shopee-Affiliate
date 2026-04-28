import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { GenerateAiContentBody } from "@workspace/api-zod";
import { generateProductContent } from "../services/aiService.js";

const router = Router();

router.post("/ai/generate-content", async (req, res) => {
  try {
    const body = GenerateAiContentBody.parse(req.body);

    let productName = body.productName;
    let productCategory = body.productCategory;
    let productDescription = body.productDescription;
    let price = body.price;

    if (body.productId) {
      const products = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, body.productId))
        .limit(1);

      if (products[0]) {
        productName = products[0].name;
        productCategory = products[0].category || undefined;
        price = products[0].price;
      }
    }

    const content = await generateProductContent({
      productName,
      productCategory: productCategory ?? undefined,
      productDescription: productDescription ?? undefined,
      price: price ?? undefined,
    });

    if (body.productId) {
      await db
        .update(productsTable)
        .set({
          reviewContent: content.reviewContent,
          pros: content.pros,
          cons: content.cons,
          faq: content.faq,
          metaTitle: content.metaTitle,
          metaDesc: content.metaDesc,
          tags: content.tags,
          lastUpdated: new Date(),
        })
        .where(eq(productsTable.id, body.productId));
    }

    return res.json(content);
  } catch (err) {
    req.log.error({ err }, "Error generating AI content");
    return res.status(500).json({
      error: "AI generation failed",
      message: err instanceof Error ? err.message : "Gagal generate konten AI",
    });
  }
});

export default router;
