import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, and, ne, desc, sql } from "drizzle-orm";

const router = Router();

function getBaseUrl(req: any): string {
  const envUrl = process.env["PUBLIC_BASE_URL"];
  if (envUrl) return envUrl.replace(/\/$/, "");
  const xfProto = req.headers["x-forwarded-proto"] as string | undefined;
  const xfHost = req.headers["x-forwarded-host"] as string | undefined;
  const origin = req.headers["origin"] as string | undefined;
  const referer = req.headers["referer"] as string | undefined;
  if (xfHost) {
    const proto = xfProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${xfHost.split(",")[0]?.trim()}`;
  }
  if (origin) return origin.replace(/\/$/, "");
  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch {}
  }
  const proto = req.protocol || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = getBaseUrl(req);

    const [products, categories] = await Promise.all([
      db
        .select({
          slug: productsTable.slug,
          updatedAt: productsTable.lastUpdated,
        })
        .from(productsTable)
        .where(eq(productsTable.status, "published"))
        .orderBy(desc(productsTable.lastUpdated))
        .limit(5000),
      db
        .select({ category: productsTable.category })
        .from(productsTable)
        .where(and(eq(productsTable.status, "published"), ne(productsTable.category, "")))
        .groupBy(productsTable.category),
    ]);

    const now = new Date().toISOString();
    const urls: string[] = [];

    urls.push(
      `<url><loc>${base}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    );
    urls.push(
      `<url><loc>${base}/search</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`,
    );
    urls.push(
      `<url><loc>${base}/about</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
    );
    urls.push(
      `<url><loc>${base}/wishlist</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.4</priority></url>`,
    );

    for (const c of categories) {
      if (!c.category) continue;
      urls.push(
        `<url><loc>${base}/search?category=${encodeURIComponent(c.category)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      );
    }

    for (const p of products) {
      const lastmod = (p.updatedAt ?? new Date()).toISOString();
      urls.push(
        `<url><loc>${base}/product/${p.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Error generating sitemap");
    return res.status(500).send("Sitemap error");
  }
});

router.get("/robots.txt", async (req, res) => {
  const base = getBaseUrl(req);
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /generate
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=86400");
  return res.send(body);
});

router.get("/feed.xml", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      .orderBy(desc(productsTable.publishedAt))
      .limit(50);

    const items = products
      .map((p) => {
        const link = `${base}/product/${p.slug}`;
        const pub = (p.publishedAt ?? p.createdAt ?? new Date()).toUTCString();
        const desc = (p.metaDesc || p.name || "").replace(/[<>&]/g, (c) =>
          c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
        );
        return `<item>
  <title><![CDATA[${p.name}]]></title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <pubDate>${pub}</pubDate>
  <description><![CDATA[${desc}]]></description>
</item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>ShopeeRecommend - Rekomendasi Produk Terbaru</title>
<link>${base}</link>
<description>Review &amp; rekomendasi produk terbaik dari Shopee.</description>
<language>id-ID</language>
${items}
</channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=1800");
    return res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Error generating feed");
    return res.status(500).send("Feed error");
  }
});

router.get("/stats/trending", async (req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      .orderBy(
        desc(sql`${productsTable.clickCount} * 3 + ${productsTable.viewCount}`),
      )
      .limit(8);

    const trending = products.map((p) => {
      const { commission: _c, commissionRate: _r, ...rest } = p;
      return rest;
    });
    return res.json({ products: trending });
  } catch (err) {
    req.log.error({ err }, "Error getting trending");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
