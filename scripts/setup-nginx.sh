#!/usr/bin/env bash
# =============================================================================
# setup-nginx.sh — One-liner Nginx + Let's Encrypt SSL untuk ShopeeRecommend
# =============================================================================
# Pemakaian (dari root project, sebagai user dengan sudo):
#   ./scripts/setup-nginx.sh <domain> <email> [--no-www]
#
# Contoh:
#   ./scripts/setup-nginx.sh domain-anda.com admin@domain-anda.com
#   ./scripts/setup-nginx.sh sub.domain-anda.com admin@domain-anda.com --no-www
#
# Yang dilakukan:
#   1. Install nginx + certbot (apt) kalau belum ada
#   2. Generate Nginx site config (reverse proxy: /api → :8080, / → :25500)
#   3. Aktifkan site, disable site default, validate, reload nginx
#   4. Jalankan certbot --nginx (auto SSL + auto-redirect HTTP→HTTPS)
#   5. Update PUBLIC_BASE_URL di .env jadi https://<domain>, restart pm2
#
# Aman dijalankan ulang (idempotent): config di-overwrite, certbot skip kalau
# sertifikat masih valid, .env hanya di-update kalau key sudah ada.
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Helper output
# -----------------------------------------------------------------------------
if [ -t 1 ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'
  C_BLUE=$'\033[34m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'
else
  C_RESET=""; C_BOLD=""; C_BLUE=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi
step() { echo "${C_BOLD}${C_BLUE}==>${C_RESET} ${C_BOLD}$*${C_RESET}"; }
ok()   { echo "    ${C_GREEN}✓${C_RESET} $*"; }
warn() { echo "    ${C_YELLOW}!${C_RESET} $*"; }
fail() { echo "${C_RED}✗ $*${C_RESET}" >&2; exit 1; }

# -----------------------------------------------------------------------------
# Parse args
# -----------------------------------------------------------------------------
DOMAIN="${1:-}"
EMAIL="${2:-}"
WWW_FLAG="${3:-}"

if [ -z "${DOMAIN}" ] || [ -z "${EMAIL}" ]; then
  cat <<USAGE >&2
Pemakaian: $0 <domain> <email> [--no-www]

Contoh:
  $0 domain-anda.com admin@domain-anda.com
  $0 sub.domain-anda.com admin@domain-anda.com --no-www
USAGE
  exit 1
fi

# Validasi sederhana
[[ "${DOMAIN}" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] || fail "Format domain tidak valid: ${DOMAIN}"
[[ "${EMAIL}"  =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || fail "Format email tidak valid: ${EMAIL}"

# Sertakan www-variant kecuali user pakai --no-www atau domain sudah subdomain
INCLUDE_WWW=1
if [ "${WWW_FLAG}" = "--no-www" ]; then
  INCLUDE_WWW=0
elif [ "$(echo "${DOMAIN}" | tr -cd '.' | wc -c)" -gt 1 ]; then
  # Domain seperti sub.example.com (≥2 titik) — anggap subdomain, skip www
  INCLUDE_WWW=0
fi

# -----------------------------------------------------------------------------
# Sudo wrapper
# -----------------------------------------------------------------------------
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  command -v sudo >/dev/null 2>&1 || fail "Bukan root dan 'sudo' tidak terinstall."
  SUDO="sudo"
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

# Sanity check — backend ports harus listening, kalau tidak nginx jadi proxy ke
# port mati (502 Bad Gateway). Cuma warning, lanjut tetap.
if command -v ss >/dev/null 2>&1; then
  if ! ss -tln 2>/dev/null | grep -qE ':8080[[:space:]]'; then
    warn "Port 8080 (api-server) belum listening — site bakal 502. Jalankan ./install.sh dulu."
  fi
  if ! ss -tln 2>/dev/null | grep -qE ':25500[[:space:]]'; then
    warn "Port 25500 (frontend) belum listening — site bakal 502. Jalankan ./install.sh dulu."
  fi
fi

# -----------------------------------------------------------------------------
# 1. Install nginx + certbot
# -----------------------------------------------------------------------------
step "1/5 Install nginx + certbot"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y >/dev/null
$SUDO apt-get install -y nginx certbot python3-certbot-nginx >/dev/null
$SUDO systemctl enable --now nginx >/dev/null 2>&1 || true
ok "nginx & certbot siap"

# -----------------------------------------------------------------------------
# 2. Generate Nginx site config
# -----------------------------------------------------------------------------
step "2/5 Generate Nginx site config untuk ${DOMAIN}"

SITE_NAME="shopee-affiliate"
SITE_FILE="/etc/nginx/sites-available/${SITE_NAME}"

# Build server_name dengan/tanpa www
SERVER_NAMES="${DOMAIN}"
WWW_REDIRECT_BLOCK=""
if [ "${INCLUDE_WWW}" -eq 1 ]; then
  WWW_REDIRECT_BLOCK=$(cat <<NGINX
server {
    listen 80;
    server_name www.${DOMAIN};
    return 301 http://${DOMAIN}\$request_uri;
}

NGINX
)
fi

$SUDO tee "${SITE_FILE}" >/dev/null <<NGINX
${WWW_REDIRECT_BLOCK}server {
    listen 80;
    server_name ${SERVER_NAMES};

    client_max_body_size 10M;

    access_log /var/log/nginx/shopee-access.log;
    error_log  /var/log/nginx/shopee-error.log;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml image/svg+xml;

    # API server (Express)
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   X-Forwarded-Host  \$host;
        proxy_read_timeout 60s;
    }

    # SEO endpoints (proxy ke API)
    location = /sitemap.xml { proxy_pass http://127.0.0.1:8080/api/sitemap.xml; proxy_set_header X-Forwarded-Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
    location = /robots.txt  { proxy_pass http://127.0.0.1:8080/api/robots.txt;  proxy_set_header X-Forwarded-Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
    location = /feed.xml    { proxy_pass http://127.0.0.1:8080/api/feed.xml;    proxy_set_header X-Forwarded-Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }

    # Frontend (Vite preview)
    location / {
        proxy_pass         http://127.0.0.1:25500;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
NGINX

$SUDO ln -sf "${SITE_FILE}" "/etc/nginx/sites-enabled/${SITE_NAME}"
$SUDO rm -f /etc/nginx/sites-enabled/default
ok "Site config dibuat: ${SITE_FILE}"

# -----------------------------------------------------------------------------
# 3. Validate & reload nginx
# -----------------------------------------------------------------------------
step "3/5 Validate & reload nginx"
if ! $SUDO nginx -t 2>&1 | tail -3; then
  fail "Konfigurasi nginx invalid — cek output di atas."
fi
$SUDO systemctl reload nginx
ok "nginx reloaded"

# -----------------------------------------------------------------------------
# 4. Pasang SSL dengan certbot
# -----------------------------------------------------------------------------
step "4/5 Pasang SSL dengan Let's Encrypt"
CERTBOT_DOMAINS=("-d" "${DOMAIN}")
[ "${INCLUDE_WWW}" -eq 1 ] && CERTBOT_DOMAINS+=("-d" "www.${DOMAIN}")

if $SUDO certbot --nginx --non-interactive --agree-tos --redirect \
     -m "${EMAIL}" "${CERTBOT_DOMAINS[@]}"; then
  ok "SSL terpasang & auto-redirect HTTP→HTTPS aktif"
else
  warn "certbot gagal — periksa: (1) DNS A record sudah arah ke VPS ini, (2) port 80/443 terbuka, (3) tidak ada rate-limit Let's Encrypt"
  warn "Coba ulang manual: sudo certbot --nginx -d ${DOMAIN}$([ ${INCLUDE_WWW} -eq 1 ] && echo " -d www.${DOMAIN}")"
fi

# -----------------------------------------------------------------------------
# 5. Update PUBLIC_BASE_URL di .env + restart pm2
# -----------------------------------------------------------------------------
step "5/5 Update PUBLIC_BASE_URL di .env + restart aplikasi"

if $SUDO test -f "${ENV_FILE}"; then
  # Pakai $SUDO untuk grep juga — .env biasanya chmod 600, kalau dimiliki user
  # lain maka grep tanpa sudo gagal silent → branch else jalan → APPEND duplikat
  if $SUDO grep -qE '^PUBLIC_BASE_URL=' "${ENV_FILE}"; then
    # Delimiter | biar URL dengan / tidak konflik dengan sed
    $SUDO sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=https://${DOMAIN}|" "${ENV_FILE}"
    ok "PUBLIC_BASE_URL di-set ke https://${DOMAIN}"
  else
    echo "PUBLIC_BASE_URL=https://${DOMAIN}" | $SUDO tee -a "${ENV_FILE}" >/dev/null
    ok "PUBLIC_BASE_URL ditambahkan ke .env"
  fi

  if command -v pm2 >/dev/null 2>&1 && pm2 describe shopee-api >/dev/null 2>&1; then
    pm2 restart all --update-env >/dev/null
    ok "pm2 restart all (env baru ter-load)"
  else
    warn "pm2 belum register apps — jalankan ./install.sh atau ./scripts/deploy.sh dulu"
  fi
else
  warn ".env tidak ditemukan di ${ENV_FILE} — skip update PUBLIC_BASE_URL"
  warn "Setelah .env dibuat, set: PUBLIC_BASE_URL=https://${DOMAIN}"
fi

# -----------------------------------------------------------------------------
# Selesai
# -----------------------------------------------------------------------------
echo
echo "${C_BOLD}${C_GREEN}╔══════════════════════════════════════════════════════════════╗${C_RESET}"
echo "${C_BOLD}${C_GREEN}║  Nginx + SSL siap!                                           ║${C_RESET}"
echo "${C_BOLD}${C_GREEN}╚══════════════════════════════════════════════════════════════╝${C_RESET}"
echo
echo "  Akses : ${C_BOLD}https://${DOMAIN}${C_RESET}"
echo "  Admin : ${C_BOLD}https://${DOMAIN}/admin${C_RESET}"
echo
echo "  Sertifikat auto-renew via systemd timer. Test dengan:"
echo "    ${C_BOLD}sudo certbot renew --dry-run${C_RESET}"
echo
