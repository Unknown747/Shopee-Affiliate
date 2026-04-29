#!/usr/bin/env bash
# =============================================================================
# install.sh — One-click VPS installer untuk ShopeeRecommend
# =============================================================================
# Otomatis menjalankan langkah persiapan VPS:
#   1. Update sistem & install paket dasar
#   2. Install Node.js 24 + pnpm (via corepack)
#   3. Install PostgreSQL 16 + buat database & user
#   4. Install PM2 (process manager)
#   5. Buat template .env (auto-generate SESSION_SECRET & password)
#   6. pnpm install + push schema database
#
# Aman dijalankan ulang (idempotent) — langkah yang sudah selesai akan dilewati.
#
# Pemakaian (dari root project, sebagai user dengan sudo):
#   chmod +x install.sh
#   ./install.sh
#
# Atau:
#   bash install.sh
#
# Setelah selesai, lanjut ke langkah Nginx + SSL di INSTALL.md (bagian 10–13).
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Helper output (warna)
# -----------------------------------------------------------------------------
if [ -t 1 ]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_BLUE=$'\033[34m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
else
  C_RESET=""; C_BOLD=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi

step()  { echo "${C_BOLD}${C_BLUE}==>${C_RESET} ${C_BOLD}$*${C_RESET}"; }
info()  { echo "    $*"; }
ok()    { echo "    ${C_GREEN}✓${C_RESET} $*"; }
warn()  { echo "    ${C_YELLOW}!${C_RESET} $*"; }
fail()  { echo "${C_RED}✗ $*${C_RESET}" >&2; exit 1; }

# -----------------------------------------------------------------------------
# Lokasi project & file konfigurasi
# -----------------------------------------------------------------------------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

if [ ! -f "${PROJECT_ROOT}/pnpm-workspace.yaml" ]; then
  fail "Script harus dijalankan dari root project (tidak menemukan pnpm-workspace.yaml)."
fi

# -----------------------------------------------------------------------------
# Konfigurasi default — bisa di-override lewat environment variable
# -----------------------------------------------------------------------------
DB_NAME="${DB_NAME:-shopee_affiliate}"
DB_USER="${DB_USER:-shopee_user}"
NODE_MAJOR="${NODE_MAJOR:-24}"
INSTALL_PG="${INSTALL_PG:-1}"     # set 0 untuk skip install PostgreSQL
INSTALL_PM2="${INSTALL_PM2:-1}"   # set 0 untuk skip install PM2
RUN_DB_PUSH="${RUN_DB_PUSH:-1}"   # set 0 untuk skip drizzle push
AUTO_BUILD="${AUTO_BUILD:-1}"     # set 0 untuk skip pnpm run build
AUTO_START="${AUTO_START:-1}"     # set 0 untuk skip pm2 start (cuma siap-siap saja)

# -----------------------------------------------------------------------------
# Cek OS
# -----------------------------------------------------------------------------
step "Cek sistem operasi"
if [ ! -f /etc/os-release ]; then
  fail "Tidak menemukan /etc/os-release. Script ini didesain untuk Ubuntu/Debian."
fi
. /etc/os-release
case "${ID:-}" in
  ubuntu|debian) ok "Terdeteksi: ${PRETTY_NAME}" ;;
  *)             warn "OS '${ID}' belum diuji — script dirancang untuk Ubuntu/Debian. Lanjut dengan risiko sendiri." ;;
esac

# -----------------------------------------------------------------------------
# Wrapper sudo (otomatis kosong kalau sudah root)
# -----------------------------------------------------------------------------
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    fail "Bukan root dan 'sudo' tidak terinstall. Jalankan ulang sebagai root atau install sudo."
  fi
  SUDO="sudo"
  info "Beberapa langkah membutuhkan sudo — Anda mungkin diminta password."
fi

# -----------------------------------------------------------------------------
# 1. Update sistem & paket dasar
# -----------------------------------------------------------------------------
step "1/8 Update sistem & install paket dasar"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y >/dev/null
$SUDO apt-get install -y curl wget git build-essential ca-certificates gnupg lsb-release openssl >/dev/null
ok "Paket dasar siap (curl, git, build-essential, openssl, ...)"

# -----------------------------------------------------------------------------
# 2. Node.js + pnpm
# -----------------------------------------------------------------------------
step "2/8 Install Node.js ${NODE_MAJOR} + pnpm"

needs_node_install=1
if command -v node >/dev/null 2>&1; then
  current_major="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
  if [ "${current_major}" -ge "${NODE_MAJOR}" ]; then
    ok "Node.js sudah terinstall: $(node -v)"
    needs_node_install=0
  else
    info "Node.js lama terdeteksi (v${current_major}), upgrade ke v${NODE_MAJOR}…"
  fi
fi

if [ "${needs_node_install}" -eq 1 ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO -E bash - >/dev/null
  $SUDO apt-get install -y nodejs >/dev/null
  ok "Node.js terinstall: $(node -v)"
fi

if ! command -v corepack >/dev/null 2>&1; then
  $SUDO npm install -g corepack >/dev/null
fi
$SUDO corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@latest --activate >/dev/null 2>&1 || $SUDO npm install -g pnpm >/dev/null
ok "pnpm siap: $(pnpm -v)"

# -----------------------------------------------------------------------------
# 3. PostgreSQL 16 + buat database
# -----------------------------------------------------------------------------
DATABASE_URL_GENERATED=""
if [ "${INSTALL_PG}" = "1" ]; then
  step "3/8 Install PostgreSQL & buat database"

  if ! command -v psql >/dev/null 2>&1; then
    $SUDO apt-get install -y postgresql postgresql-contrib >/dev/null
    ok "PostgreSQL terinstall: $(psql --version)"
  else
    ok "PostgreSQL sudah terinstall: $(psql --version)"
  fi

  $SUDO systemctl enable --now postgresql >/dev/null 2>&1 || true

  # Buat user kalau belum ada
  user_exists="$($SUDO -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || true)"
  if [ "${user_exists}" = "1" ]; then
    ok "User PostgreSQL '${DB_USER}' sudah ada — password tidak diubah"
  else
    DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)"
    $SUDO -u postgres psql -v ON_ERROR_STOP=1 <<SQL >/dev/null
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
SQL
    DATABASE_URL_GENERATED="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
    ok "User '${DB_USER}' dibuat dengan password acak"
  fi

  # Buat database kalau belum ada
  db_exists="$($SUDO -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || true)"
  if [ "${db_exists}" = "1" ]; then
    ok "Database '${DB_NAME}' sudah ada"
  else
    $SUDO -u postgres psql -v ON_ERROR_STOP=1 <<SQL >/dev/null
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL
    ok "Database '${DB_NAME}' dibuat"
  fi
else
  warn "3/8 Install PostgreSQL dilewati (INSTALL_PG=0)"
fi

# -----------------------------------------------------------------------------
# 4. PM2
# -----------------------------------------------------------------------------
if [ "${INSTALL_PM2}" = "1" ]; then
  step "4/8 Install PM2 (process manager)"
  if command -v pm2 >/dev/null 2>&1; then
    ok "PM2 sudah terinstall: $(pm2 -v)"
  else
    $SUDO npm install -g pm2 >/dev/null
    ok "PM2 terinstall: $(pm2 -v)"
  fi
else
  warn "4/8 Install PM2 dilewati (INSTALL_PM2=0)"
fi

# -----------------------------------------------------------------------------
# 5. Buat template .env
# -----------------------------------------------------------------------------
step "5/8 Buat template .env"

if [ -f "${ENV_FILE}" ]; then
  ok ".env sudah ada di ${ENV_FILE} — tidak ditimpa"
  if [ -n "${DATABASE_URL_GENERATED}" ]; then
    warn "Database baru dibuat tapi .env lama dipakai. DATABASE_URL untuk koneksi baru:"
    echo "      ${DATABASE_URL_GENERATED}"
  fi
else
  SESSION_SECRET_GEN="$(openssl rand -base64 48 | tr -d '\n')"
  ADMIN_PASSWORD_GEN="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  DATABASE_URL_FOR_ENV="${DATABASE_URL_GENERATED:-postgresql://${DB_USER}:GANTI_PASSWORD@localhost:5432/${DB_NAME}}"

  cat > "${ENV_FILE}" <<ENV
# === Wajib ===
DATABASE_URL=${DATABASE_URL_FOR_ENV}
SESSION_SECRET=${SESSION_SECRET_GEN}
NODE_ENV=production

# === Admin Login (ganti default!) ===
ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD_GEN}

# === URL publik (untuk sitemap.xml, RSS feed, JSON-LD) ===
PUBLIC_BASE_URL=https://domain-anda.com

# === Shopee Affiliate API (opsional — fallback ke mock kalau kosong) ===
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=

# === Gemini AI untuk generate review (opsional) ===
GEMINI_API_KEY=

# === Port internal (jangan diubah kecuali bentrok) ===
API_PORT=8080
WEB_PORT=25500
ENV
  chmod 600 "${ENV_FILE}"
  ok ".env dibuat di ${ENV_FILE} (chmod 600)"
  info "  - SESSION_SECRET   : auto-generated (48 byte)"
  info "  - ADMIN_PASSWORD   : auto-generated — lihat dengan ${C_BOLD}sudo grep ADMIN_PASSWORD ${ENV_FILE}${C_RESET}"
  if [ -n "${DATABASE_URL_GENERATED}" ]; then
    info "  - DATABASE_URL     : terisi otomatis dengan password yang baru dibuat"
  else
    warn "DATABASE_URL pakai placeholder — edit manual di ${ENV_FILE}"
  fi
fi

# -----------------------------------------------------------------------------
# 6. pnpm install + push schema database
# -----------------------------------------------------------------------------
step "6/8 pnpm install + push schema database"

cd "${PROJECT_ROOT}"
info "Menjalankan pnpm install (3-5 menit pertama kali)…"
pnpm install --frozen-lockfile
ok "Dependencies terinstall"

if [ "${RUN_DB_PUSH}" = "1" ]; then
  # Load .env supaya drizzle-kit dapat DATABASE_URL
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a

  if [[ "${DATABASE_URL:-}" == *"GANTI_PASSWORD"* ]]; then
    warn "DATABASE_URL masih placeholder — skip drizzle push. Edit .env dulu lalu jalankan:"
    echo "      pnpm --filter @workspace/db run push"
  else
    info "Push schema Drizzle ke PostgreSQL…"
    if pnpm --filter @workspace/db run push; then
      ok "Schema database terpasang"
    else
      warn "Drizzle push gagal — coba manual: pnpm --filter @workspace/db run push"
    fi
  fi
else
  warn "Drizzle push dilewati (RUN_DB_PUSH=0)"
fi

# -----------------------------------------------------------------------------
# 7. Build production
# -----------------------------------------------------------------------------
if [ "${AUTO_BUILD}" = "1" ]; then
  step "7/8 Build production (pnpm run build)"
  if pnpm run build; then
    ok "Build sukses (artifacts/api-server/dist + artifacts/shopee-affiliate/dist)"
  else
    fail "Build gagal — perbaiki error lalu jalankan: pnpm run build"
  fi
else
  warn "7/8 Build dilewati (AUTO_BUILD=0)"
fi

# -----------------------------------------------------------------------------
# 8. Start dengan PM2
# -----------------------------------------------------------------------------
APP_STARTED=0
if [ "${AUTO_START}" = "1" ] && [ "${AUTO_BUILD}" = "1" ] && command -v pm2 >/dev/null 2>&1; then
  step "8/8 Start aplikasi dengan PM2"

  ECOSYSTEM_FILE="${PROJECT_ROOT}/ecosystem.config.cjs"
  if [ ! -f "${ECOSYSTEM_FILE}" ]; then
    warn "ecosystem.config.cjs tidak ditemukan — skip pm2 start"
  else
    mkdir -p "${PROJECT_ROOT}/logs"

    # Cek port bentrok sebelum start
    if ss -tlnp 2>/dev/null | grep -qE ':8080\s' && ! pm2 describe shopee-api >/dev/null 2>&1; then
      warn "Port 8080 sudah dipakai proses lain — pm2 mungkin gagal start shopee-api"
    fi

    # Start atau reload kalau sudah ada
    if pm2 describe shopee-api >/dev/null 2>&1 || pm2 describe shopee-web >/dev/null 2>&1; then
      info "App sudah ter-register di PM2 — reload…"
      pm2 reload "${ECOSYSTEM_FILE}" --update-env >/dev/null
    else
      pm2 start "${ECOSYSTEM_FILE}" >/dev/null
    fi

    pm2 save >/dev/null 2>&1 || true
    APP_STARTED=1
    ok "Aplikasi jalan via PM2"
    echo
    pm2 status || true

    # Tawarkan setup auto-start saat reboot
    info "Untuk auto-start saat reboot, jalankan perintah berikut (sekali saja):"
    echo "      ${C_BOLD}pm2 startup systemd${C_RESET}"
    echo "      (lalu copy & jalankan baris 'sudo env PATH=...' yang muncul)"
  fi
elif [ "${AUTO_START}" = "1" ]; then
  warn "8/8 PM2 start dilewati (PM2 atau build tidak siap)"
else
  warn "8/8 PM2 start dilewati (AUTO_START=0)"
fi

# -----------------------------------------------------------------------------
# Selesai
# -----------------------------------------------------------------------------
echo
echo "${C_BOLD}${C_GREEN}╔══════════════════════════════════════════════════════════════╗${C_RESET}"
if [ "${APP_STARTED}" = "1" ]; then
  echo "${C_BOLD}${C_GREEN}║  Instalasi selesai — aplikasi sudah JALAN via PM2!           ║${C_RESET}"
else
  echo "${C_BOLD}${C_GREEN}║  Instalasi dasar selesai!                                    ║${C_RESET}"
fi
echo "${C_BOLD}${C_GREEN}╚══════════════════════════════════════════════════════════════╝${C_RESET}"
echo

if [ "${APP_STARTED}" = "1" ]; then
  echo "${C_BOLD}Akses lokal (test di VPS):${C_RESET}"
  echo "  curl http://localhost:8080/api/healthz"
  echo "  curl -I http://localhost:25500/"
  echo
  echo "${C_BOLD}Langkah berikutnya:${C_RESET}"
  echo "  1. Edit ${C_BOLD}PUBLIC_BASE_URL${C_RESET} di .env ke domain Anda → ${C_BOLD}pm2 restart all${C_RESET}"
  echo "  2. Setup Nginx + SSL    :  lihat INSTALL.md §10–§11"
  echo "  3. Auto-start on boot   :  ${C_BOLD}pm2 startup systemd${C_RESET}  (ikuti instruksi yang muncul)"
  echo "  4. Login admin          :  https://domain-anda.com/admin"
else
  echo "${C_BOLD}Langkah berikutnya (manual):${C_RESET}"
  echo "  1. Cek isi .env           :  cat ${ENV_FILE}"
  echo "  2. Build production       :  ${C_BOLD}pnpm run build${C_RESET}"
  echo "  3. Start via PM2          :  ${C_BOLD}pm2 start ecosystem.config.cjs${C_RESET}"
  echo "  4. Auto-start saat reboot :  ${C_BOLD}pm2 save && pm2 startup systemd${C_RESET}"
  echo "  5. Setup Nginx + SSL      :  lihat INSTALL.md §10–§11"
fi

if [ -f "${ENV_FILE}" ]; then
  echo
  echo "${C_BOLD}Kredensial admin tersimpan di .env (chmod 600).${C_RESET}"
  echo "  Lihat dengan : ${C_BOLD}sudo grep -E '^ADMIN_(USERNAME|PASSWORD)=' ${ENV_FILE}${C_RESET}"
fi
echo
