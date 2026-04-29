# Shopee Affiliate Platform (ShopeeRecommend)

## Project Overview

A full-stack Shopee affiliate platform with AI-powered content generation, SEO-optimized product pages, affiliate link generation, and admin dashboard. Indonesian-language UI.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Backend**: Express 5 (API server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Auth**: JWT (admin only, stored in localStorage)
- **Caching**: node-cache
- **Charts**: Recharts
- **Theming**: next-themes (dark/light mode)

## Artifacts

- `artifacts/shopee-affiliate` → React+Vite frontend at `/` (port from $PORT env)
- `artifacts/api-server` → Express API at `/api` (port 8080)

## Price-drop alerts (7-day window)

**Schema** (`lib/db/src/schema/shopee.ts` → `productPriceHistoryTable`):
- Columns: `id` (uuid), `productId`, `price`, `priceBeforeDisc`, `recordedAt` (defaults to now).
- Indexes: `idx_pph_product_id` and composite `idx_pph_product_recorded` (productId, recordedAt) — used by the `DISTINCT ON` lookup.

**Service** (`artifacts/api-server/src/services/priceHistoryService.ts`):
- `recordPriceSnapshot(productId, price, priceBeforeDisc?)` — inserts a new row only when price changed since the last snapshot, keeping the table compact.
- `getOldPricesForProducts(ids[])` — single batched `SELECT DISTINCT ON (product_id)` returning the latest snapshot per product that's ≥`PRICE_DROP_WINDOW_DAYS` (7) days old.
- `attachPriceDrop(product, oldPriceMap)` — appends `oldPrice7d: number | null`. Value is non-null only when the older snapshot is **strictly higher** than the current price.

**Where snapshots are recorded:**
- `routes/affiliate.ts` `POST /api/affiliate/generate` — both code paths (existing-product update + new-product insert) call `recordPriceSnapshot()` and then `invalidateProductCaches(slug)` so the badge appears immediately on the next list/search request.

**Where `oldPrice7d` is exposed in responses:**
- `routes/products.ts` — `GET /api/products` (list) + `GET /api/products/:slug` (detail).
- `routes/search.ts` — `GET /api/search` (filtered search).
- `routes/seo.ts` — `GET /api/stats/trending` (trending list).

**OpenAPI / generated types:**
- `lib/api-spec/openapi.yaml` declares `oldPrice7d` (integer, nullable) on the shared `Product` schema; codegen propagates it to `lib/api-zod` and `lib/api-client-react`. Run `pnpm --filter @workspace/api-spec run codegen` after editing the spec.

**Frontend** (`artifacts/shopee-affiliate/src/components/ProductCard.tsx`):
- Green animated `Harga Turun NN%!` badge with `TrendingDown` icon, positioned **top-LEFT** of the image (sliding to `top-9` when the discount ribbon is present, `top-2` otherwise) so it never overlaps the top-right compare button.

## Key Features

- Affiliate link generation via Shopee API + SHA256 (with mock fallback)
- AI review content generation via Gemini API (with deterministic fallback)
- SEO-optimized product pages with pros/cons/FAQ
- Admin dashboard with analytics (charts, top products, stats)
- Search with filters (category, sort, pagination)
- Dark mode toggle
- Indonesian-language UI throughout

## Pages

- `/` — Home (hero, link generator, trending section, categories, featured products)
- `/product/:slug` — Product detail (review, pros/cons, FAQ, share buttons, sticky mobile buy bar, wishlist/compare/copy buttons, affiliate disclosure)
- `/search` — Product search with filters + debounced auto-suggest dropdown
- `/trending` — Top trending products (ranked by views/clicks)
- `/wishlist` — User wishlist (localStorage, noindex)
- `/compare` — Product comparison up to 4 items (localStorage, noindex)
- `/generate` — AI content generator
- `/admin` — Admin login
- `/admin/dashboard` — Dashboard with analytics (commission visible only here)
- `/admin/products` — Product management (publish/delete)
- `/about` — About + affiliate disclosure
- `/sitemap` — Full sitemap (HTML)

## SEO Endpoints (served via vite proxy from API)

- `/sitemap.xml` — XML sitemap. **Auto-pilih mode**: kalau produk ≤ 5,000 → redirect 307 ke `/sitemap-pages.xml` (flat); kalau > 5,000 → return sitemap-index yang nunjuk ke `/sitemap-pages.xml` + `/sitemap-products-N.xml` (5,000 produk per chunk).
- `/sitemap-pages.xml` — Static pages + kategori + (jika produk ≤ 5,000) semua produk.
- `/sitemap-products-:n.xml` — Chunk produk ke-n (5,000 per file). Aktif hanya kalau produk > 5,000.
- `/robots.txt` — Robots file. Disallow `/admin`, `/generate`, `/api/`, `/search` (search results = thin content).
- `/feed.xml` — RSS 2.0 feed of latest products.
- `/api/stats/trending` — Top trending products by view+click score.
- `/api/search/suggest?q=...` — Search auto-suggest.

> Semua sitemap mengirim `Last-Modified` header sesuai `MAX(products.lastUpdated)` supaya crawler bisa conditional-fetch.

## Server-Side SEO Injection (production only)

`artifacts/api-server/src/lib/seoInject.ts` — meng-inject meta tags + JSON-LD ke
`index.html` saat SPA fallback (Express) men-serve halaman, supaya bot yang tidak
mengeksekusi JS (Bing, Yandex, Facebook/Twitter/WhatsApp link previewer) langsung
dapet meta lengkap.

- Aktif hanya saat `NODE_ENV=production` (di Replit dev pakai Vite dev server, jadi tidak relevan).
- Per-route meta block: `/`, `/about`, `/sitemap`, `/trending`, `/wishlist`, `/search*`, `/admin*`, `/generate*`.
- `/product/:slug` → DB lookup (LRU cache 5 menit) → inject Product + BreadcrumbList JSON-LD + custom title/desc/og:image. Slug tidak ditemukan → **HTTP 404** (bukan soft-404 200).
- Path tidak dikenal → **HTTP 404** (penting biar Google tidak meng-index halaman tidak ada).
- Idempotent: pakai marker `<!-- ssr-seo-start/end -->`. Template di-cache di memori (auto-refresh via `fs.statSync` mtime).
- `<SeoHead/>` client-side tetap jalan dan meng-overwrite meta saat JS load (data terbaru dari API).

## Admin SEO Audit

`GET /api/admin/seo-audit` (JWT-protected) — Audit semua produk **published** dan
laporkan kelengkapan field SEO. Response: `{ summary, labels, severities, products }`.

- **High** (penalti 20): meta title/desc kosong, gambar kosong.
- **Medium** (penalti 8): tidak ada FAQ, pros/cons, review pendek, kategori kosong.
- **Low** (penalti 3): tidak ada tags, nama pendek, meta title/desc kepanjangan/kependekan.
- Skor produk: `max(0, 100 - total_penalti)`.

UI: `/admin/seo` (`AdminSeoAudit.tsx`) — kartu summary (skor rata-rata, count perfect/high/medium/low),
breakdown per jenis issue (clickable filter), filter search/severity/issue, list produk dengan
tombol langsung **Lihat** (PDP) & **Edit** (form admin). Pakai raw fetch + `getAdminToken()`
(tidak lewat OpenAPI codegen). Link cepat dari Dashboard admin → tombol "Audit SEO".

## Privacy

- Public product API responses strip `commission` and `commissionRate` fields (admin-only)
- Wishlist & Compare are client-side only (localStorage, no server tracking)
- Affiliate links use `rel="sponsored nofollow noopener noreferrer"`

## Default Admin Credentials

- Username: `admin`, Password: `admin123`

## Env Vars

- `SESSION_SECRET` — JWT signing secret (required)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — Admin credentials (defaults: admin/admin123)
- `SHOPEE_PARTNER_ID` / `SHOPEE_PARTNER_KEY` — Shopee API (optional; falls back to mock)
- `GEMINI_API_KEY` — Gemini AI (optional; falls back to deterministic generator)
- `DATABASE_URL` — PostgreSQL connection string

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages (excludes `mockup-sandbox`, a Replit dev-only artifact)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## VPS Deployment

- `ecosystem.config.cjs` — PM2 process file (api on 8080, web on 25500)
- `INSTALL.md` — full VPS install guide (quick path + manual path + ops)

## Shell Scripts (`.sh`)

| File | Runs on | Trigger | Purpose |
|---|---|---|---|
| `install.sh` | VPS (Ubuntu/Debian) | Manual once: `./install.sh` | One-click fresh install — apt deps, Node 24, PostgreSQL, PM2, auto-generate `.env` (SESSION_SECRET + admin password), `pnpm install --frozen-lockfile`, drizzle push, build, `pm2 start`, **auto-setup `pm2 startup systemd`** for reboot persistence. Idempotent, supports env-var overrides (`INSTALL_PG`, `AUTO_BUILD`, `AUTO_START`, `DB_NAME`, `DB_USER`, `NODE_MAJOR`, `RUN_DB_PUSH`, `INSTALL_PM2`). Password admin **never printed to stdout** — read from `.env` via `sudo grep ADMIN_PASSWORD .env`. |
| `scripts/setup-nginx.sh` | VPS | Manual once after DNS pointed: `./scripts/setup-nginx.sh <domain> <email> [--no-www]` | One-liner Nginx + Let's Encrypt SSL. Installs nginx + certbot, generates site config (reverse proxy `/api → :8080`, `/ → :25500`, SEO endpoints proxied), validates & reloads nginx, runs `certbot --nginx --non-interactive --agree-tos --redirect`, then updates `PUBLIC_BASE_URL` di `.env` jadi `https://<domain>` + `pm2 restart all`. Auto-detects subdomain (skip www variant). Pakai `--no-www` untuk skip www variant secara eksplisit. Idempotent — re-run aman. Prasyarat: DNS A record sudah point ke IP VPS, port 80/443 terbuka. |
| `scripts/deploy.sh` | VPS | Manual after `git pull`: `./scripts/deploy.sh` | Lightweight update flow — checks `.env` exists, runs `pnpm install --frozen-lockfile` → drizzle push → `pnpm run build` → `pm2 reload --update-env` (zero-downtime). Falls back to `pm2 start` if apps not registered. Skips apt/Postgres/PM2 install (use `install.sh` for that). Optionally symlink to `.git/hooks/post-merge` for auto-deploy on every pull. |
| `scripts/post-merge.sh` | **Replit** (not VPS) | Auto via `.replit [postMerge]` after task-agent merge | Reconciles Replit env after merged work — `pnpm install --frozen-lockfile` + `pnpm --filter @workspace/db run push`. **Do not** add `pm2`/build calls here — PM2 doesn't exist in Replit and would crash the merge reconciliation. |

> All VPS scripts use `set -euo pipefail` (fail-fast) and are idempotent. Bash syntax validated with `bash -n`.

### Recommended VPS workflow (urutan eksekusi)

1. **First-time install** (fresh VPS): `./install.sh` — app jalan di port internal 8080 + 25500
2. **Pasang domain + HTTPS**: `./scripts/setup-nginx.sh domain-anda.com email@anda.com` — site live di `https://domain-anda.com`
3. **Update kode setelah `git pull`**: `./scripts/deploy.sh` — zero-downtime reload

## Identitas Brand (1-klik dari admin)

Di `/admin/settings`, tab **Identitas** (tab pertama, default) memungkinkan user mengubah seluruh identitas situs dalam sekali simpan:

- `brand_name` — nama website (header, footer, tab browser, og:site_name)
- `brand_tagline` — kalimat di footer (di bawah logo)
- `brand_logo_url` — logo gambar (override ikon default)
- `brand_favicon_url` — favicon dinamis (PNG/SVG/ICO)
- `brand_primary_color` — warna utama dalam hex (mis. `#ee4d2d`)
- `brand_footer_text` — kalimat di sisi kanan footer

Implementasi:
- Helper `resolveBrand(cfg)` di `lib/site-config.ts` mengembalikan nilai brand efektif dengan fallback chain `brand_name → og_site_name → schema_org_name → "ShopeeRecommend"`.
- `Layout.tsx` membaca `brand` untuk header/footer logo, nama, tagline, footer text, dan dynamic Org/WebSite JSON-LD.
- `SiteScripts.tsx` mengaplikasikan favicon (`<link rel="icon">`), `meta theme-color`, dan menulis `--primary` CSS variable hasil konversi `hexToHslString()` agar Tailwind `bg-primary`/`text-primary` ikut berubah seketika.
- `SeoHead.tsx` menggunakan `brand.name` sebagai fallback `meta_title_template` (`%s | <brand>`) dan `og:site_name`.
- `siteConfig.ts` whitelist `PUBLIC_KEYS` mencakup semua `brand_*`. Setelah POST `/admin/settings`, server cache di-invalidate dan React Query akan refetch `useSiteConfig`.

## Configurable SEO & API Keys (admin panel)

All third-party API keys and SEO settings are editable from `/admin/settings` and stored in `settings` table (key/value).

- Backend services read settings via `lib/settingsCache.ts` (30s in-memory cache, `getSetting`/`getSettingsMap`). Cache invalidates after admin POST `/admin/settings`.
- `shopeeService.ts` and `aiService.ts` read env vars first, then fallback to settings (`shopee_partner_id`, `shopee_partner_key`, `shopee_api_url`, `gemini_api_key`, `huggingface_api_key`).
- Public-safe SEO settings exposed via `GET /api/site-config` (cached 60s). The frontend hook `useSiteConfig()` fetches once via React Query.
- `<SeoHead/>` component (per-page) sets title/description/canonical/og/twitter using site config templates.
- `<SiteScripts/>` (mounted in Layout) injects verification meta tags and analytics scripts (GA4, Google Ads, Meta Pixel, TikTok Pixel) on first paint, plus SPA route-change pageview tracking.
- Admin settings tabs: API Keys, Search Engine, Social Media, Analytics, SEO Umum, Schema.org.

## Mobile responsiveness

- `<MobileBottomNav/>` (md:hidden, fixed bottom): Beranda · Produk · Trending · Wishlist · Akun. Wishlist shows count badge.
- `<main>` has `pb-16 md:pb-0` so content clears the bottom nav.
- Bottom nav respects `env(safe-area-inset-bottom)` for notched devices and hides on inner admin pages.

## Performance optimizations (latest pass)

- **HTTP cache headers** via `lib/httpCache.ts` middleware on public read endpoints (sets `Cache-Control: public, max-age=N, s-maxage=5N, stale-while-revalidate=10N` + `Vary: Accept-Encoding`):
  - `/api/products` — 60s
  - `/api/products/:slug` — 120s
  - `/api/categories` — 300s
  - `/api/search` — 30s
  - `/api/search/suggest` — 60s
  - `/api/stats/trending` — 120s
  - `/api/site-config` — 60s (already in route)
- **DNS prefetch** in `index.html` for Shopee CDN hosts (`cf.shopee.co.id`, `cf.shopee.com.my`, `down-id.img.susercontent.com`) and `images.unsplash.com`.
- **Hover/focus/touchstart prefetch** on `<ProductCard>` — uses React Query `prefetchQuery` with a 120ms debounce so navigating to a product is near-instant.
- **Above-the-fold image priority** — `<ProductCard priority>` switches the image to `loading="eager"` + `fetchpriority="high"`. Used on first 4 cards in Home (trending + product grid) and TrendingPage. ProductDetail hero uses `fetchPriority="high"`.
- **Lazy-load `LinkGenerator`** on Home (`React.lazy` + `Suspense`) — keeps the hero render lightweight.

## PWA / Service Worker

- Generated by `vite-plugin-pwa` at build time (`dist/public/sw.js`, `manifest.webmanifest`).
- Auto-registered on app load; auto-updates on new deploys.
- Disabled in dev mode (`devOptions.enabled: false`).
- Caching strategy:
  - Precache: all built JS/CSS/HTML/SVG/woff2 (~1 MB).
  - Images (any origin): `CacheFirst`, 200 entries max, 30-day TTL.
  - Google Fonts: `StaleWhileRevalidate`, 1-year TTL.
  - `GET /api/products*`: `NetworkFirst` w/ 4s timeout, 5-min TTL.
  - Mutations and other API routes always hit the network (no cache).

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
