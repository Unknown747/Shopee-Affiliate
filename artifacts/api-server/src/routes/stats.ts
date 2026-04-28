import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, clickLogsTable } from "@workspace/db/schema";
import { eq, desc, gte, sql, and, ne } from "drizzle-orm";
import { GetTopProductsQueryParams, GetClicksChartQueryParams } from "@workspace/api-zod";
import { getCached, setCached } from "../services/cacheService.js";

const router = Router();

router.get("/stats/dashboard", async (req, res) => {
  try {
    const cacheKey = "dashboard:stats";
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [
      totalResult,
      publishedResult,
      draftResult,
      clicksResult,
      viewsResult,
      convResult,
      commResult,
      topCatResult,
      recentResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(productsTable),
      db
        .select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(eq(productsTable.status, "published")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(eq(productsTable.status, "draft")),
      db
        .select({ total: sql<number>`sum(click_count)` })
        .from(productsTable),
      db
        .select({ total: sql<number>`sum(view_count)` })
        .from(productsTable),
      db
        .select({ total: sql<number>`sum(conversion_count)` })
        .from(productsTable),
      db
        .select({ total: sql<number>`sum(commission * click_count)` })
        .from(productsTable)
        .where(eq(productsTable.status, "published")),
      db
        .select({
          category: productsTable.category,
          count: sql<number>`count(*)`,
        })
        .from(productsTable)
        .where(and(eq(productsTable.status, "published"), ne(productsTable.category, "")))
        .groupBy(productsTable.category)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
      db
        .select()
        .from(productsTable)
        .orderBy(desc(productsTable.createdAt))
        .limit(5),
    ]);

    const stats = {
      totalProducts: Number(totalResult[0]?.count ?? 0),
      publishedProducts: Number(publishedResult[0]?.count ?? 0),
      draftProducts: Number(draftResult[0]?.count ?? 0),
      totalClicks: Number(clicksResult[0]?.total ?? 0),
      totalViews: Number(viewsResult[0]?.total ?? 0),
      totalConversions: Number(convResult[0]?.total ?? 0),
      estimatedCommission: Number(commResult[0]?.total ?? 0) / 100,
      topCategories: topCatResult
        .filter((r) => r.category)
        .map((r) => ({ category: r.category!, count: Number(r.count) })),
      recentProducts: recentResult,
    };

    setCached(cacheKey, stats, 300);
    return res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Error getting dashboard stats");
    return res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

router.get("/stats/top-products", async (req, res) => {
  try {
    const { limit } = GetTopProductsQueryParams.parse(req.query);

    const cacheKey = `top-products:${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        slug: productsTable.slug,
        imageUrl: productsTable.imageUrl,
        clickCount: productsTable.clickCount,
        viewCount: productsTable.viewCount,
        commission: productsTable.commission,
        commissionRate: productsTable.commissionRate,
        price: productsTable.price,
        status: productsTable.status,
      })
      .from(productsTable)
      .orderBy(desc(productsTable.clickCount))
      .limit(limit);

    setCached(cacheKey, products, 300);
    return res.json(products);
  } catch (err) {
    req.log.error({ err }, "Error getting top products");
    return res.status(500).json({ error: "Failed to get top products" });
  }
});

router.get("/stats/clicks-chart", async (req, res) => {
  try {
    const { days } = GetClicksChartQueryParams.parse(req.query);

    const cacheKey = `clicks-chart:${days}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await db
      .select({
        date: sql<string>`date(clicked_at)`,
        clicks: sql<number>`count(*)`,
      })
      .from(clickLogsTable)
      .where(gte(clickLogsTable.clickedAt, startDate))
      .groupBy(sql`date(clicked_at)`)
      .orderBy(sql`date(clicked_at)`);

    const chartData = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split("T")[0]!;
      const found = result.find((r) => r.date === dateStr);
      return {
        date: dateStr,
        clicks: Number(found?.clicks ?? 0),
        views: Math.floor(Number(found?.clicks ?? 0) * 3.5),
      };
    });

    setCached(cacheKey, chartData, 300);
    return res.json(chartData);
  } catch (err) {
    req.log.error({ err }, "Error getting clicks chart");
    return res.status(500).json({ error: "Failed to get clicks chart" });
  }
});

export default router;
