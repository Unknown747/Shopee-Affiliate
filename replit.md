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
- Table `product_price_history` records a snapshot every time a product's price changes (via `recordPriceSnapshot()` in `services/priceHistoryService.ts`, called from both branches of `routes/affiliate.ts`).
- Helpers `getOldPricesForProducts()` and `attachPriceDrop()` enrich product responses with `oldPrice7d` (most recent snapshot ≥7 days old, only when strictly higher than current price).
- Applied in `routes/products.ts` (list + detail), `routes/search.ts`, and `routes/seo.ts` (`/stats/trending`).
- `ProductCard` shows an animated green "Harga Turun!" badge in the top-right corner when `oldPrice7d` is present.

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

- `/sitemap.xml` — XML sitemap (proxies to `/api/sitemap.xml`)
- `/robots.txt` — Robots file (proxies to `/api/robots.txt`)
- `/feed.xml` — RSS 2.0 feed of latest products (proxies to `/api/feed.xml`)
- `/api/stats/trending` — Top trending products by view+click score
- `/api/search/suggest?q=...` — Search auto-suggest

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

- `install.sh` — one-click installer for fresh Ubuntu/Debian VPS (apt deps, Node 24, PostgreSQL, PM2, auto-`.env`, build, start)
- `ecosystem.config.cjs` — PM2 process file (api on 8080, web on 25500)
- `INSTALL.md` — full VPS install guide (quick path + manual path + ops)

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
