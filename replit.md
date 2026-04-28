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

## Key Features

- Affiliate link generation via Shopee API + SHA256 (with mock fallback)
- AI review content generation via Gemini API (with deterministic fallback)
- SEO-optimized product pages with pros/cons/FAQ
- Admin dashboard with analytics (charts, top products, stats)
- Search with filters (category, sort, pagination)
- Dark mode toggle
- Indonesian-language UI throughout

## Pages

- `/` — Home (hero with link generator, categories, featured products)
- `/product/:slug` — Product detail (review, pros/cons, FAQ, share buttons)
- `/search` — Product search with filters
- `/generate` — AI content generator
- `/admin` — Admin login
- `/admin/dashboard` — Dashboard with analytics
- `/admin/products` — Product management (publish/delete)
- `/about` — About + affiliate disclosure
- `/sitemap` — Full sitemap

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
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
