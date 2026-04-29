import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable } from "@workspace/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { httpCache } from "../lib/httpCache.js";

const router = Router();

router.get("/articles", httpCache({ maxAge: 300 }), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 24, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const category = req.query.category as string | undefined;

    const where = category
      ? and(eq(articlesTable.status, "published"), eq(articlesTable.category, category))
      : eq(articlesTable.status, "published");

    const articles = await db
      .select({
        id: articlesTable.id,
        slug: articlesTable.slug,
        title: articlesTable.title,
        excerpt: articlesTable.excerpt,
        coverImage: articlesTable.coverImage,
        category: articlesTable.category,
        tags: articlesTable.tags,
        author: articlesTable.author,
        publishedAt: articlesTable.publishedAt,
        viewCount: articlesTable.viewCount,
      })
      .from(articlesTable)
      .where(where)
      .orderBy(desc(articlesTable.publishedAt))
      .limit(limit)
      .offset(offset);

    return res.json({ articles, limit, offset });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error listing articles");
    return res.status(500).json({ error: "Failed to list articles" });
  }
});

router.get("/articles/:slug", httpCache({ maxAge: 300 }), async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    if (!slug) return res.status(400).json({ error: "Invalid slug" });

    const rows = await db
      .select()
      .from(articlesTable)
      .where(
        and(eq(articlesTable.slug, slug), eq(articlesTable.status, "published")),
      )
      .limit(1);

    const article = rows[0];
    if (!article) return res.status(404).json({ error: "Article not found" });

    // increment view count async (no await)
    db.update(articlesTable)
      .set({ viewCount: sql`${articlesTable.viewCount} + 1` })
      .where(eq(articlesTable.id, article.id))
      .execute()
      .catch(() => {});

    // related: 3 latest from same category, excluding current
    const related = article.category
      ? await db
          .select({
            slug: articlesTable.slug,
            title: articlesTable.title,
            coverImage: articlesTable.coverImage,
            excerpt: articlesTable.excerpt,
            publishedAt: articlesTable.publishedAt,
          })
          .from(articlesTable)
          .where(
            and(
              eq(articlesTable.status, "published"),
              eq(articlesTable.category, article.category),
            ),
          )
          .orderBy(desc(articlesTable.publishedAt))
          .limit(4)
      : [];

    return res.json({
      article,
      related: related.filter((r) => r.slug !== slug).slice(0, 3),
    });
  } catch (err) {
    (req as any).log?.error?.({ err }, "Error getting article");
    return res.status(500).json({ error: "Failed to get article" });
  }
});

export default router;
