import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { and, eq, ne, sql, isNotNull } from "drizzle-orm";
import { httpCache } from "../lib/httpCache.js";

const router = Router();

interface FaqItem {
  question: string;
  answer: string;
  productSlug: string;
  productName: string;
}

interface CategoryGroup {
  category: string;
  faqs: FaqItem[];
}

router.get("/faq", httpCache({ maxAge: 600 }), async (req, res) => {
  try {
    const rows = await db
      .select({
        slug: productsTable.slug,
        name: productsTable.name,
        category: productsTable.category,
        faq: productsTable.faq,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.status, "published"),
          isNotNull(productsTable.faq),
          ne(productsTable.category, ""),
          sql`jsonb_array_length(${productsTable.faq}) > 0`,
        ),
      );

    const groups = new Map<string, FaqItem[]>();
    for (const r of rows) {
      const cat = r.category ?? "Lainnya";
      if (!Array.isArray(r.faq)) continue;
      for (const f of r.faq) {
        if (!f?.question || !f?.answer) continue;
        const list = groups.get(cat) ?? [];
        list.push({
          question: f.question,
          answer: f.answer,
          productSlug: r.slug,
          productName: r.name,
        });
        groups.set(cat, list);
      }
    }

    const categories: CategoryGroup[] = Array.from(groups.entries())
      .map(([category, faqs]) => ({
        category,
        // de-dup identical questions per category
        faqs: Array.from(
          new Map(faqs.map((f) => [f.question.toLowerCase(), f])).values(),
        ).slice(0, 30),
      }))
      .sort((a, b) => b.faqs.length - a.faqs.length);

    const totalCount = categories.reduce((sum, g) => sum + g.faqs.length, 0);

    return res.json({ categories, totalCount });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error in /faq");
    return res.status(500).json({ error: "Failed to load FAQs" });
  }
});

export default router;
