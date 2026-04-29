import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq, and, ne, desc, sql } from "drizzle-orm";
import { httpCache } from "../lib/httpCache.js";
import { getOldPricesForProducts, attachPriceDrop } from "../services/priceHistoryService.js";

const router = Router();

// Sitemap spec: max 50,000 URL per file. Kita pakai 5,000 per chunk supaya
// file kecil & cepat di-fetch crawler.
const PRODUCTS_PER_SITEMAP = 5000;

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

async function getProductCount(): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.status, "published"));
  return rows[0]?.c ?? 0;
}

async function getMaxLastUpdated(): Promise<Date | null> {
  const rows = await db
    .select({ m: sql<Date | null>`max(${productsTable.lastUpdated})` })
    .from(productsTable)
    .where(eq(productsTable.status, "published"));
  return rows[0]?.m ?? null;
}

/* ---------- /sitemap.xml — auto-pilih index vs flat ----------------------- */

router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const totalProducts = await getProductCount();

    // Kalau produk ≤ PRODUCTS_PER_SITEMAP → satu file (flat)
    // Kalau lebih → return SITEMAP-INDEX yang nunjuk ke chunk files
    if (totalProducts > PRODUCTS_PER_SITEMAP) {
      const numChunks = Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP);
      const maxLastUpdated = await getMaxLastUpdated();
      const lastmod = (maxLastUpdated ?? new Date()).toISOString();

      const sitemaps: string[] = [];
      sitemaps.push(
        `<sitemap><loc>${base}/sitemap-pages.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`,
      );
      for (let i = 1; i <= numChunks; i++) {
        sitemaps.push(
          `<sitemap><loc>${base}/sitemap-products-${i}.xml</loc><lastmod>${lastmod}</lastmod></sitemap>`,
        );
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.join("\n")}
</sitemapindex>`;
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.set("Last-Modified", new Date(lastmod).toUTCString());
      return res.send(xml);
    }

    // Flat sitemap (≤ 5,000 produk)
    return res.redirect(307, "/sitemap-pages.xml");
  } catch (err) {
    req.log.error({ err }, "Error generating sitemap");
    return res.status(500).send("Sitemap error");
  }
});

/* ---------- /sitemap-pages.xml — semua URL non-produk + (jika kecil) produk -- */

router.get("/sitemap-pages.xml", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const totalProducts = await getProductCount();

    const [productsForFlat, categories] = await Promise.all([
      totalProducts <= PRODUCTS_PER_SITEMAP
        ? db
            .select({
              slug: productsTable.slug,
              updatedAt: productsTable.lastUpdated,
            })
            .from(productsTable)
            .where(eq(productsTable.status, "published"))
            .orderBy(desc(productsTable.lastUpdated))
        : Promise.resolve([] as Array<{ slug: string; updatedAt: Date | null }>),
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
    urls.push(
      `<url><loc>${base}/trending</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    );
    urls.push(
      `<url><loc>${base}/terbaik</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    );
    urls.push(
      `<url><loc>${base}/harga-turun</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    );

    // Best-of pages — satu URL per kategori (hanya kategori yang punya ≥3 produk)
    const bestOfRows = await db
      .select({
        category: productsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(productsTable)
      .where(and(eq(productsTable.status, "published"), ne(productsTable.category, "")))
      .groupBy(productsTable.category)
      .having(sql`count(*) >= 3`);

    for (const r of bestOfRows) {
      if (!r.category) continue;
      const slug = r.category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug) continue;
      urls.push(
        `<url><loc>${base}/terbaik/${slug}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      );
    }

    for (const c of categories) {
      if (!c.category) continue;
      urls.push(
        `<url><loc>${base}/search?category=${encodeURIComponent(c.category)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
      );
    }

    for (const p of productsForFlat) {
      const lastmod = (p.updatedAt ?? new Date()).toISOString();
      urls.push(
        `<url><loc>${base}/product/${p.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    const lastModHeader =
      productsForFlat.length > 0 && productsForFlat[0]?.updatedAt
        ? new Date(productsForFlat[0].updatedAt).toUTCString()
        : new Date().toUTCString();

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.set("Last-Modified", lastModHeader);
    return res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Error generating sitemap-pages");
    return res.status(500).send("Sitemap error");
  }
});

/* ---------- /sitemap-products-:n.xml — chunk produk -------------------- */

router.get("/sitemap-products-:n.xml", async (req, res) => {
  try {
    const base = getBaseUrl(req);
    const n = parseInt(req.params.n!, 10);
    if (!Number.isInteger(n) || n < 1) return res.status(404).send("Not found");

    const totalProducts = await getProductCount();
    const maxN = Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP);
    if (n > maxN) return res.status(404).send("Not found");

    const offset = (n - 1) * PRODUCTS_PER_SITEMAP;
    const products = await db
      .select({
        slug: productsTable.slug,
        updatedAt: productsTable.lastUpdated,
      })
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      .orderBy(desc(productsTable.lastUpdated))
      .limit(PRODUCTS_PER_SITEMAP)
      .offset(offset);

    const urls = products.map((p) => {
      const lastmod = (p.updatedAt ?? new Date()).toISOString();
      return `<url><loc>${base}/product/${p.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    const lastModHeader =
      products.length > 0 && products[0]?.updatedAt
        ? new Date(products[0].updatedAt).toUTCString()
        : new Date().toUTCString();

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.set("Last-Modified", lastModHeader);
    return res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Error generating sitemap-products chunk");
    return res.status(500).send("Sitemap error");
  }
});

/* ---------- /robots.txt ----------------------------------------------- */

router.get("/robots.txt", async (req, res) => {
  const base = getBaseUrl(req);
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /generate
Disallow: /api/
Disallow: /search

Sitemap: ${base}/sitemap.xml
`;
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=86400");
  return res.send(body);
});

/* ---------- /feed.xml ------------------------------------------------- */

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

/* ---------- /api/stats/trending --------------------------------------- */

router.get("/stats/trending", httpCache({ maxAge: 120 }), async (req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      .orderBy(
        desc(sql`${productsTable.clickCount} * 3 + ${productsTable.viewCount}`),
      )
      .limit(8);

    const oldPriceMap = await getOldPricesForProducts(products.map((p) => p.id));
    const trending = products.map((p) => {
      const { commission: _c, commissionRate: _r, ...rest } = p;
      return attachPriceDrop(rest, oldPriceMap);
    });
    return res.json({ products: trending });
  } catch (err) {
    req.log.error({ err }, "Error getting trending");
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
