#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Update deploy untuk VPS setelah `git pull`
# =============================================================================
# Jalankan dari root project di VPS setelah pull kode terbaru:
#   ./scripts/deploy.sh
#
# Langkah:
#   1. pnpm install (frozen lockfile)
#   2. push schema database (drizzle)
#   3. build production (api-server + shopee-affiliate)
#   4. pm2 reload (zero-downtime) — start kalau belum register
#
# Idempotent — aman dijalankan berulang.
# =============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
ECOSYSTEM_FILE="${PROJECT_ROOT}/ecosystem.config.cjs"

cd "${PROJECT_ROOT}"

if [ ! -f "${PROJECT_ROOT}/pnpm-workspace.yaml" ]; then
  echo "✗ Bukan root project (tidak menemukan pnpm-workspace.yaml di ${PROJECT_ROOT})." >&2
  exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
  echo "✗ .env tidak ditemukan di ${ENV_FILE}. Jalankan ./install.sh dulu." >&2
  exit 1
fi

echo "==> 1/4 pnpm install"
pnpm install --frozen-lockfile

echo "==> 2/4 push schema database"
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a
pnpm --filter @workspace/db run push

echo "==> 3/4 build production"
pnpm run build

echo "==> 4/4 pm2 reload"
if ! command -v pm2 >/dev/null 2>&1; then
  echo "✗ pm2 tidak terinstall — install dengan: npm install -g pm2" >&2
  exit 1
fi
if [ ! -f "${ECOSYSTEM_FILE}" ]; then
  echo "✗ ecosystem.config.cjs tidak ditemukan di ${ECOSYSTEM_FILE}" >&2
  exit 1
fi

if pm2 describe shopee-api >/dev/null 2>&1 && pm2 describe shopee-web >/dev/null 2>&1; then
  pm2 reload "${ECOSYSTEM_FILE}" --update-env
else
  pm2 start "${ECOSYSTEM_FILE}" --update-env
fi
pm2 save >/dev/null 2>&1 || true

echo
echo "✓ Deploy selesai. Status:"
pm2 status || true
