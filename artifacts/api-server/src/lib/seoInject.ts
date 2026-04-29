/**
 * Server-side SEO injection untuk SPA fallback.
 *
 * Tujuan: memberi crawler yang tidak/lambat eksekusi JS (Bing, Yandex, social bots
 * Facebook/Twitter/WhatsApp) versi index.html yang sudah berisi meta tags lengkap +
 * JSON-LD per route — tanpa perlu full SSR React.
 *
 * Strategi:
 * - File-based static templates per route (home, about, search, dst)
 * - Untuk /product/:slug → DB lookup (LRU cache 5 menit) → inject Product schema +
 *   custom title/desc/og:image
 * - Untuk path tidak dikenal → return HTTP 404 (bukan 200) supaya tidak di-index
 *   sebagai "soft 404"
 *
 * SeoHead.tsx (client-side) tetap jalan dan idempotent — kalau JS load, ia akan
 * meng-overwrite meta dengan data terbaru dari API. Ini cuma "first paint" SEO.
 */

import { db } from "@workspace/db";
import { productsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

interface ProductLite {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  category: string | null;
  shopName: string | null;
  shopeeId: string | null;
  ratingStar: number | null;
  soldCount: number | null;
  metaTitle: string | null;
  metaDesc: string | null;
}

/* ---------- LRU cache (sederhana, TTL 5 menit) -------------------------- */

const CACHE_TTL_MS = 5 * 60 * 1000;
const slugCache = new Map<string, { value: ProductLite | null; exp: number }>();

async function getProductBySlug(slug: string): Promise<ProductLite | null> {
  const cached = slugCache.get(slug);
  if (cached && cached.exp > Date.now()) return cached.value;

  const rows = await db
    .select({
      id: productsTable.id,
      slug: productsTable.slug,
      name: productsTable.name,
      imageUrl: productsTable.imageUrl,
      price: productsTable.price,
      category: productsTable.category,
      shopName: productsTable.shopName,
      shopeeId: productsTable.shopeeId,
      ratingStar: productsTable.ratingStar,
      soldCount: productsTable.soldCount,
      metaTitle: productsTable.metaTitle,
      metaDesc: productsTable.metaDesc,
      status: productsTable.status,
    })
    .from(productsTable)
    .where(eq(productsTable.slug, slug))
    .limit(1);

  const row = rows[0];
  const value: ProductLite | null =
    !row || row.status !== "published"
      ? null
      : {
          id: row.id,
          slug: row.slug,
          name: row.name,
          imageUrl: row.imageUrl,
          price: row.price,
          category: row.category,
          shopName: row.shopName,
          shopeeId: row.shopeeId,
          ratingStar: row.ratingStar,
          soldCount: row.soldCount,
          metaTitle: row.metaTitle,
          metaDesc: row.metaDesc,
        };

  slugCache.set(slug, { value, exp: Date.now() + CACHE_TTL_MS });
  if (slugCache.size > 1000) {
    // simple GC — buang entry pertama
    const firstKey = slugCache.keys().next().value;
    if (firstKey !== undefined) slugCache.delete(firstKey);
  }
  return value;
}

/* ---------- Helper: HTML escape + meta block builder -------------------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).slice(0, 500);
}

interface MetaInputs {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  noindex?: boolean;
  jsonLd?: Array<Record<string, unknown>>;
}

function buildMetaBlock(m: MetaInputs): string {
  const parts: string[] = [];
  parts.push(`<title>${escapeHtml(m.title)}</title>`);
  parts.push(`<meta name="description" content="${escapeAttr(m.description)}" />`);
  parts.push(
    `<meta name="robots" content="${m.noindex ? "noindex,follow" : "index,follow"}" />`,
  );
  parts.push(`<link rel="canonical" href="${escapeAttr(m.canonical)}" />`);

  // Open Graph
  parts.push(`<meta property="og:type" content="${m.ogType || "website"}" />`);
  parts.push(`<meta property="og:title" content="${escapeAttr(m.title)}" />`);
  parts.push(
    `<meta property="og:description" content="${escapeAttr(m.description)}" />`,
  );
  parts.push(`<meta property="og:url" content="${escapeAttr(m.canonical)}" />`);
  parts.push(`<meta property="og:locale" content="id_ID" />`);
  if (m.ogImage) {
    parts.push(`<meta property="og:image" content="${escapeAttr(m.ogImage)}" />`);
    parts.push(
      `<meta property="og:image:alt" content="${escapeAttr(m.title)}" />`,
    );
  }

  // Twitter
  parts.push(`<meta name="twitter:card" content="summary_large_image" />`);
  parts.push(`<meta name="twitter:title" content="${escapeAttr(m.title)}" />`);
  parts.push(
    `<meta name="twitter:description" content="${escapeAttr(m.description)}" />`,
  );
  if (m.ogImage) {
    parts.push(`<meta name="twitter:image" content="${escapeAttr(m.ogImage)}" />`);
  }

  // JSON-LD
  if (m.jsonLd && m.jsonLd.length > 0) {
    for (const ld of m.jsonLd) {
      const json = JSON.stringify(ld).replace(/</g, "\\u003c");
      parts.push(`<script type="application/ld+json">${json}</script>`);
    }
  }

  return parts.join("\n    ");
}

/**
 * Inject meta block ke dalam <head> dengan menghapus tag default yang akan
 * di-overwrite. Pakai marker comment supaya idempotent.
 */
function injectIntoHead(html: string, metaBlock: string): string {
  const MARKER_START = "<!-- ssr-seo-start -->";
  const MARKER_END = "<!-- ssr-seo-end -->";
  const block = `${MARKER_START}\n    ${metaBlock}\n    ${MARKER_END}`;

  // Kalau sudah pernah di-inject (template di-cache), replace
  if (html.includes(MARKER_START)) {
    return html.replace(/<!-- ssr-seo-start -->[\s\S]*?<!-- ssr-seo-end -->/, block);
  }

  // Hapus default <title>, <meta name="description">, <meta name="robots">,
  // <link rel="canonical">, dan og:* default supaya tidak duplikat
  let stripped = html
    .replace(/<title>[^<]*<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/i, "")
    .replace(/<meta\s+name="robots"[^>]*>/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>/i, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");

  // Sisipkan sebelum </head>
  return stripped.replace(/<\/head>/i, `${block}\n  </head>`);
}

/* ---------- Main entry ------------------------------------------------- */

export interface InjectResult {
  html: string;
  status: number;
}

function getOrigin(req: { protocol?: string; headers: Record<string, unknown> }): string {
  const envUrl = process.env["PUBLIC_BASE_URL"];
  if (envUrl) return envUrl.replace(/\/$/, "");
  const xfHost = req.headers["x-forwarded-host"] as string | undefined;
  const xfProto = req.headers["x-forwarded-proto"] as string | undefined;
  if (xfHost) {
    const proto = xfProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${xfHost.split(",")[0]?.trim()}`;
  }
  const host = req.headers.host as string | undefined;
  const proto = req.protocol || "https";
  return `${proto}://${host}`;
}

const SITE_DESC =
  "Rekomendasi produk Shopee terbaik yang dikurasi objektif: handphone, fashion, peralatan rumah, kecantikan, dan banyak lagi. Update harga & promo gratis ongkir tiap hari.";

const SITE_NAME = "ShopeeRecommend";

/**
 * Hasilkan HTML dengan meta yang sesuai per route.
 * @param html  Template index.html (raw, hasil fs.readFile)
 * @param path  req.path (tidak termasuk query)
 * @param req   Request object (untuk origin detection)
 */
export async function injectSeo(
  html: string,
  path: string,
  req: { protocol?: string; headers: Record<string, unknown> },
): Promise<InjectResult> {
  const origin = getOrigin(req);
  const canonical = `${origin}${path}`;

  // ---- Route: /product/:slug ----
  const productMatch = path.match(/^\/product\/([^/?#]+)\/?$/);
  if (productMatch) {
    const slug = productMatch[1]!;
    let product: ProductLite | null = null;
    try {
      product = await getProductBySlug(slug);
    } catch {
      // DB error → fallback ke template default, jangan crash
      product = null;
    }

    if (!product) {
      return {
        html: injectIntoHead(
          html,
          buildMetaBlock({
            title: `Produk Tidak Ditemukan — ${SITE_NAME}`,
            description: "Halaman produk yang Anda cari tidak ditemukan.",
            canonical,
            noindex: true,
          }),
        ),
        status: 404,
      };
    }

    const title = product.metaTitle || `Review ${product.name} - Harga & Kelebihan`;
    const desc =
      product.metaDesc ||
      `Review lengkap ${product.name}: pengalaman pakai, kelebihan, kekurangan, FAQ, dan harga Rp ${product.price.toLocaleString("id-ID")}. Cek sebelum beli di Shopee!`;

    // priceValidUntil: 30 hari dari sekarang (format YYYY-MM-DD)
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const productLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: desc,
      image: product.imageUrl ? [product.imageUrl] : undefined,
      sku: product.shopeeId || undefined,
      ...(product.category ? { category: product.category } : {}),
      ...(product.shopName
        ? { brand: { "@type": "Brand", name: product.shopName } }
        : {}),
      offers: {
        "@type": "Offer",
        url: canonical,
        priceCurrency: "IDR",
        price: product.price,
        priceValidUntil: validUntil,
        availability: "https://schema.org/InStock",
        ...(product.shopName
          ? { seller: { "@type": "Organization", name: product.shopName } }
          : {}),
      },
      ...(product.ratingStar
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.ratingStar,
              reviewCount: Math.max(product.soldCount ?? 10, 10),
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    };

    const breadcrumbLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Beranda", item: `${origin}/` },
        ...(product.category
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: product.category,
                item: `${origin}/search?category=${encodeURIComponent(product.category)}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: product.name,
                item: canonical,
              },
            ]
          : [
              {
                "@type": "ListItem",
                position: 2,
                name: product.name,
                item: canonical,
              },
            ]),
      ],
    };

    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `${title} | ${SITE_NAME}`,
          description: desc,
          canonical,
          ogImage: product.imageUrl || undefined,
          ogType: "product",
          jsonLd: [productLd, breadcrumbLd],
        }),
      ),
      status: 200,
    };
  }

  // ---- Static routes ----
  if (path === "/" || path === "") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `${SITE_NAME} — Rekomendasi Produk Shopee Terbaik & Terupdate`,
          description: SITE_DESC,
          canonical: `${origin}/`,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/about") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Tentang Kami | ${SITE_NAME}`,
          description: `Tentang ${SITE_NAME} — platform rekomendasi produk Shopee independen di Indonesia.`,
          canonical,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/sitemap") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Peta Situs | ${SITE_NAME}`,
          description: "Daftar semua halaman dan kategori di ShopeeRecommend.",
          canonical,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/terbaik" || path === "/terbaik/") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Produk Terbaik per Kategori | ${SITE_NAME}`,
          description:
            "Daftar produk Shopee terbaik per kategori — dipilih dari rating, jumlah terjual, dan minat pembaca. Update otomatis tiap minggu.",
          canonical,
        }),
      ),
      status: 200,
    };
  }

  const bestOfMatch = path.match(/^\/terbaik\/([^/?#]+)\/?$/);
  if (bestOfMatch) {
    const slug = bestOfMatch[1]!;
    const readable = slug.replace(/-/g, " ");
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `10 ${readable} Terbaik — Rekomendasi & Harga | ${SITE_NAME}`,
          description: `Daftar 10 ${readable} terbaik di Shopee, dipilih berdasarkan rating, jumlah terjual, dan minat pembaca. Cek harga & review sebelum beli.`,
          canonical,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/harga-turun") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Produk Harga Turun Hari Ini | ${SITE_NAME}`,
          description:
            "Daftar produk Shopee yang harganya turun dalam 7 hari terakhir. Update otomatis — pantau diskon terbaru tanpa perlu cek satu-satu.",
          canonical,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/trending") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Produk Trending Hari Ini | ${SITE_NAME}`,
          description:
            "Produk Shopee paling banyak dicari & dibeli hari ini. Update real-time.",
          canonical,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/wishlist") {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Wishlist Anda | ${SITE_NAME}`,
          description: "Daftar produk favorit Anda.",
          canonical,
          noindex: true,
        }),
      ),
      status: 200,
    };
  }

  if (path === "/search" || path.startsWith("/search?")) {
    // Search results = noindex, follow (sesuai best practice — hindari thin content)
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Cari Produk | ${SITE_NAME}`,
          description:
            "Cari produk Shopee favorit Anda berdasarkan nama, kategori, harga, atau rating.",
          canonical: `${origin}/search`,
          noindex: true,
        }),
      ),
      status: 200,
    };
  }

  // Admin / generate / app pages — noindex (server hint), client juga set
  if (path.startsWith("/admin") || path.startsWith("/generate")) {
    return {
      html: injectIntoHead(
        html,
        buildMetaBlock({
          title: `Admin | ${SITE_NAME}`,
          description: SITE_NAME,
          canonical,
          noindex: true,
        }),
      ),
      status: 200,
    };
  }

  // Path tidak dikenal → 404 status (penting: jangan return 200 untuk
  // halaman yang tidak ada, biar Google tidak menganggap "soft 404")
  return {
    html: injectIntoHead(
      html,
      buildMetaBlock({
        title: `Halaman Tidak Ditemukan (404) | ${SITE_NAME}`,
        description: "Halaman yang Anda cari tidak ditemukan.",
        canonical,
        noindex: true,
      }),
    ),
    status: 404,
  };
}
