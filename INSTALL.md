# Panduan Instalasi VPS — ShopeeRecommend

Panduan lengkap untuk men-deploy platform Shopee Affiliate ini ke VPS sendiri (Ubuntu 22.04 / 24.04 / Debian 12).

> **Ringkasan stack:** Node.js 24 · pnpm · PostgreSQL 16 · Express 5 (API, port `8080`) · Vite + React (frontend, port `25500`) · Nginx (reverse proxy + SSL) · PM2 (process manager).

---

## Daftar Isi

**🚀 Jalur Cepat (Recommended)**
- [A. One-Click Install dengan `install.sh`](#a-one-click-install-dengan-installsh)
- [B. Setelah Install — Nginx + SSL](#b-setelah-install--nginx--ssl)

**🔧 Jalur Manual (Step-by-Step)**
1. [Spesifikasi VPS Minimum](#1-spesifikasi-vps-minimum)
2. [Persiapan Sistem & User](#2-persiapan-sistem--user)
3. [Install Node.js 24 + pnpm](#3-install-nodejs-24--pnpm)
4. [Install PostgreSQL 16](#4-install-postgresql-16)
5. [Clone Repository](#5-clone-repository)
6. [Konfigurasi Environment Variables](#6-konfigurasi-environment-variables)
7. [Setup Database (Migrasi)](#7-setup-database-migrasi)
8. [Build Production](#8-build-production)
9. [Jalankan dengan PM2](#9-jalankan-dengan-pm2)
10. [Setup Nginx sebagai Reverse Proxy](#10-setup-nginx-sebagai-reverse-proxy)
11. [Pasang SSL dengan Let's Encrypt](#11-pasang-ssl-dengan-lets-encrypt)
12. [Firewall (UFW)](#12-firewall-ufw)
13. [Auto-Start Saat Reboot](#13-auto-start-saat-reboot)

**🔄 Operasional**
14. [Maintenance & Update](#14-maintenance--update)
15. [Troubleshooting Umum](#15-troubleshooting-umum)
16. [Checklist Pasca-Deploy](#16-checklist-pasca-deploy)

**📎 Lampiran**
- [A. Perintah PM2 Berguna](#lampiran-a--perintah-pm2-berguna)
- [B. Struktur Direktori](#lampiran-b--struktur-direktori)
- [C. Default Port](#lampiran-c--default-port)
- [D. Variabel Environment install.sh](#lampiran-d--variabel-environment-installsh)

---

# 🚀 Jalur Cepat (Recommended)

## A. One-Click Install dengan `install.sh`

Repo ini menyediakan `install.sh` yang mengotomatisasi langkah 2–9 (paket sistem, Node, PostgreSQL, PM2, `.env`, build, PM2 start). Habis script jalan, app sudah hidup di `localhost:8080` (API) + `localhost:25500` (frontend).

### Langkah

1. **Login ke VPS sebagai user dengan sudo** (root juga boleh):

   ```bash
   ssh deploy@IP-VPS-ANDA
   ```

2. **Clone repository:**

   ```bash
   cd ~
   git clone https://github.com/USERNAME/REPO.git shopee-affiliate
   cd shopee-affiliate
   ```

3. **Jalankan installer:**

   ```bash
   chmod +x install.sh
   ./install.sh
   ```

   Total waktu: **±5–10 menit** (tergantung kecepatan VPS).

4. **Test lokal di VPS:**

   ```bash
   curl http://localhost:8080/api/healthz       # → 200 OK
   curl -I http://localhost:25500/              # → 200 OK
   pm2 status                                   # shopee-api & shopee-web online
   ```

5. **Lihat kredensial admin** yang tersimpan otomatis di `.env` (password sengaja **tidak** di-print ke layar demi keamanan):

   ```bash
   sudo grep -E '^ADMIN_(USERNAME|PASSWORD)=' .env
   ```

   Username default `admin`, password auto-generated 20 karakter. Simpan baik-baik untuk login ke `/admin`.

### Apa yang dilakukan `install.sh`

| Step | Aksi                                                                              | Idempotent? |
| ---- | --------------------------------------------------------------------------------- | ----------- |
| 1/8  | `apt update` + paket dasar (curl, git, build-essential, openssl)                  | ✅          |
| 2/8  | Install Node.js 24 (NodeSource) + aktifkan pnpm via corepack                      | ✅ skip kalau Node ≥ 24 |
| 3/8  | Install PostgreSQL 16, buat user `shopee_user` + database `shopee_affiliate`      | ✅ skip kalau sudah ada |
| 4/8  | Install PM2 global                                                                | ✅          |
| 5/8  | Generate `.env` dengan `SESSION_SECRET` (48-byte) + `ADMIN_PASSWORD` acak + `DATABASE_URL` terisi otomatis | ✅ tidak menimpa `.env` lama |
| 6/8  | `pnpm install` + `pnpm --filter @workspace/db run push`                           | ✅          |
| 7/8  | `pnpm run build` (typecheck + bundle API + build frontend)                        | ✅          |
| 8/8  | `mkdir -p logs/`, `pm2 start ecosystem.config.cjs`, `pm2 save`, **auto-setup `pm2 startup systemd`** (auto-start saat reboot) | ✅ reload kalau sudah running |

> **Aman dijalankan ulang.** Re-run akan mendeteksi state existing dan skip/update sesuai kebutuhan.

### Override perilaku via env var

Lihat [Lampiran D](#lampiran-d--variabel-environment-installsh) untuk daftar lengkap. Contoh:

```bash
# Pakai PostgreSQL existing (mis. dari managed DB), skip build & start
INSTALL_PG=0 AUTO_BUILD=0 AUTO_START=0 ./install.sh

# Ganti nama database & user
DB_NAME=mydb DB_USER=myuser ./install.sh
```

---

## B. Setelah Install — Nginx + SSL

Selesai `install.sh`, app sudah jalan di **port internal 8080 & 25500**. Untuk akses publik via domain + HTTPS, lanjut ke:

- **Bagian 10** — [Setup Nginx](#10-setup-nginx-sebagai-reverse-proxy)
- **Bagian 11** — [Pasang SSL dengan Let's Encrypt](#11-pasang-ssl-dengan-lets-encrypt)
- **Bagian 12** — [Firewall (UFW)](#12-firewall-ufw)
- **Bagian 13** — [Auto-Start Saat Reboot](#13-auto-start-saat-reboot)

Lalu update `PUBLIC_BASE_URL` di `.env` ke domain final dan restart:

```bash
nano .env
# ubah: PUBLIC_BASE_URL=https://domain-anda.com
pm2 restart all
```

---

# 🔧 Jalur Manual (Step-by-Step)

Pakai jalur ini kalau Anda ingin kontrol penuh, sudah punya stack existing (mis. PostgreSQL managed), atau butuh debugging step-by-step.

## 1. Spesifikasi VPS Minimum

| Komponen   | Minimum            | Disarankan         |
| ---------- | ------------------ | ------------------ |
| OS         | Ubuntu 22.04 LTS   | Ubuntu 24.04 LTS   |
| CPU        | 1 vCPU             | 2 vCPU             |
| RAM        | 1 GB (+ 1 GB swap) | 2 GB               |
| Disk       | 15 GB SSD          | 25 GB SSD          |
| Bandwidth  | 1 TB/bulan         | Unmetered          |
| Domain     | (opsional)         | Wajib untuk SSL    |

Provider yang umum dipakai: DigitalOcean, Vultr, Hetzner, Contabo, Biznet Gio, IDCloudHost.

---

## 2. Persiapan Sistem & User

Login ke VPS via SSH sebagai `root`, lalu update sistem:

```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential ufw nano htop
```

### Buat user non-root

```bash
adduser deploy                  # ikuti prompt password
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
su - deploy
```

> Mulai sekarang semua perintah dijalankan sebagai user `deploy`. Pakai `sudo` saat perlu hak root.

### Tambah swap (jika RAM ≤ 1 GB)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Install Node.js 24 + pnpm

```bash
# Node.js 24 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node -v       # harus v24.x
npm -v

# Install pnpm via corepack (sudah tersedia di Node 24)
sudo corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

---

## 4. Install PostgreSQL 16

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### Buat database & user aplikasi

```bash
sudo -u postgres psql <<'SQL'
CREATE USER shopee_user WITH PASSWORD 'GANTI_PASSWORD_KUAT_DI_SINI';
CREATE DATABASE shopee_affiliate OWNER shopee_user;
GRANT ALL PRIVILEGES ON DATABASE shopee_affiliate TO shopee_user;
\q
SQL
```

Test koneksi:

```bash
psql "postgresql://shopee_user:GANTI_PASSWORD_KUAT_DI_SINI@localhost:5432/shopee_affiliate" -c '\conninfo'
```

> **PENTING:** Jangan pakai password lemah. Generate dengan `openssl rand -base64 24`.

---

## 5. Clone Repository

```bash
cd ~
git clone https://github.com/USERNAME/REPO.git shopee-affiliate
cd shopee-affiliate

# Install semua dependencies (bisa 3-5 menit)
pnpm install
```

> Jika repo bersifat privat, setup SSH key dulu: `ssh-keygen -t ed25519` lalu tambahkan `~/.ssh/id_ed25519.pub` ke GitHub.

---

## 6. Konfigurasi Environment Variables

Buat file `.env` di root project:

```bash
nano ~/shopee-affiliate/.env
```

Isi dengan:

```env
# === Wajib ===
DATABASE_URL=postgresql://shopee_user:GANTI_PASSWORD_KUAT_DI_SINI@localhost:5432/shopee_affiliate
SESSION_SECRET=GANTI_DENGAN_HASIL_OPENSSL_RAND_BASE64_48
NODE_ENV=production

# === Admin Login (ganti default!) ===
ADMIN_USERNAME=admin
ADMIN_PASSWORD=GANTI_PASSWORD_ADMIN_KUAT

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

# === Tuning PostgreSQL pool (opsional) ===
# Jumlah koneksi maksimum ke DB per proses Node.
PG_POOL_MAX=10
# Berapa lama (ms) koneksi idle ditutup.
PG_IDLE_TIMEOUT_MS=30000
# Timeout (ms) saat connect ke DB.
PG_CONNECT_TIMEOUT_MS=5000
```

Generate `SESSION_SECRET`:

```bash
openssl rand -base64 48
```

Amankan permission:

```bash
chmod 600 ~/shopee-affiliate/.env
```

---

## 7. Setup Database (Migrasi)

```bash
cd ~/shopee-affiliate

# Push schema Drizzle ke PostgreSQL
pnpm --filter @workspace/db run push

# Jika muncul prompt konflik kolom, jalankan:
# pnpm --filter @workspace/db run push-force
```

Verifikasi tabel sudah dibuat:

```bash
psql $DATABASE_URL -c '\dt'
```

---

## 8. Build Production

```bash
cd ~/shopee-affiliate

# Typecheck + build seluruh workspace (API + frontend)
pnpm run build
```

Output:

- `artifacts/api-server/dist/index.mjs` — bundle backend
- `artifacts/shopee-affiliate/dist/public/` — file statis frontend

Jika build gagal, cek log error dan pastikan semua dependency sudah ter-install.

---

## 9. Jalankan dengan PM2

PM2 menjaga aplikasi tetap hidup, restart otomatis kalau crash, dan menulis log.

```bash
sudo npm install -g pm2
```

Repo ini sudah menyediakan **`ecosystem.config.cjs`** di root project (path otomatis lewat `__dirname`, jadi tidak perlu edit absolute path).

Buat folder log dan start:

```bash
cd ~/shopee-affiliate
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs --lines 30
```

Test lokal:

```bash
curl http://localhost:8080/api/healthz
curl -I http://localhost:25500/
```

Kedua harus balas `200 OK`.

---

## 10. Setup Nginx sebagai Reverse Proxy

Nginx menerima trafik dari port 80/443, lalu meneruskan ke aplikasi internal.

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Buat konfigurasi site:

```bash
sudo nano /etc/nginx/sites-available/shopee-affiliate
```

Isi (ganti `domain-anda.com` dengan domain Anda):

```nginx
# Redirect www -> non-www (opsional)
server {
    listen 80;
    server_name www.domain-anda.com;
    return 301 http://domain-anda.com$request_uri;
}

server {
    listen 80;
    server_name domain-anda.com;

    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/shopee-access.log;
    error_log  /var/log/nginx/shopee-error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml image/svg+xml;

    # API server (Express) — semua /api/*
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host  $host;
        proxy_read_timeout 60s;
    }

    # SEO endpoints — diserve langsung dari API server
    location = /sitemap.xml { proxy_pass http://127.0.0.1:8080/api/sitemap.xml; proxy_set_header X-Forwarded-Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
    location = /robots.txt  { proxy_pass http://127.0.0.1:8080/api/robots.txt;  proxy_set_header X-Forwarded-Host $host; proxy_set_header X-Forwarded-Proto $scheme; }
    location = /feed.xml    { proxy_pass http://127.0.0.1:8080/api/feed.xml;    proxy_set_header X-Forwarded-Host $host; proxy_set_header X-Forwarded-Proto $scheme; }

    # Frontend (Vite preview)
    location / {
        proxy_pass         http://127.0.0.1:25500;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan dan reload:

```bash
sudo ln -s /etc/nginx/sites-available/shopee-affiliate /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t                 # validasi konfigurasi
sudo systemctl reload nginx
```

Test dari browser: `http://domain-anda.com` harus membuka homepage.

---

## 11. Pasang SSL dengan Let's Encrypt

Wajib agar situs HTTPS dan cocok untuk SEO.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

Ikuti prompt:
- Email untuk renewal notice
- Setuju ToS
- Pilih **redirect HTTP → HTTPS** (opsi 2)

Auto-renewal sudah aktif via systemd timer. Test dengan:

```bash
sudo certbot renew --dry-run
```

Setelah SSL terpasang, **update `.env`**:

```env
PUBLIC_BASE_URL=https://domain-anda.com
```

Lalu restart aplikasi:

```bash
pm2 restart all
```

---

## 12. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

> Port 8080 dan 25500 **tidak** di-expose ke internet — hanya diakses lewat Nginx.

---

## 13. Auto-Start Saat Reboot

> **Catatan:** Kalau Anda pakai `install.sh`, langkah `pm2 save` + `pm2 startup systemd` sudah **otomatis dijalankan**. Anda hanya perlu enable nginx & postgresql:

```bash
sudo systemctl enable nginx
sudo systemctl enable postgresql
```

Hanya kalau install manual (atau pakai `AUTO_START=0`):

```bash
pm2 save
pm2 startup systemd
# Salin & jalankan perintah `sudo env PATH=...` yang muncul
```

Test reboot:

```bash
sudo reboot
# tunggu 30 detik, login lagi:
pm2 status
```

Semua harus `online`.

---

# 🔄 Operasional

## 14. Maintenance & Update

### Update kode dari Git (recommended)

Pakai script `scripts/deploy.sh` — otomatis: install → push schema → build → `pm2 reload` (zero-downtime).

```bash
cd ~/shopee-affiliate
git pull
./scripts/deploy.sh
```

### Manual (kalau butuh kontrol per langkah)

```bash
cd ~/shopee-affiliate
git pull
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push    # jika ada perubahan schema
pnpm run build
pm2 reload all                          # zero-downtime restart
```

> Alternatif: jalankan `./install.sh` lagi — sama-sama idempotent, tapi `deploy.sh` lebih ringan karena skip apt/Postgres/PM2 install.

### Backup database harian (cron)

```bash
mkdir -p ~/backups
crontab -e
```

Tambahkan baris:

```cron
0 2 * * * pg_dump $DATABASE_URL | gzip > /home/deploy/backups/db-$(date +\%Y\%m\%d).sql.gz && find /home/deploy/backups -name "db-*.sql.gz" -mtime +14 -delete
```

(Backup harian jam 2 pagi, simpan 14 hari terakhir.)

### Restore database

```bash
gunzip -c ~/backups/db-20260101.sql.gz | psql $DATABASE_URL
```

### Lihat log

```bash
pm2 logs shopee-api --lines 100
pm2 logs shopee-web --lines 100
sudo tail -f /var/log/nginx/shopee-error.log
```

### Monitor resource

```bash
pm2 monit
htop
```

---

## 15. Troubleshooting Umum

### `502 Bad Gateway` di browser
- Cek `pm2 status` — pastikan kedua proses `online`
- `pm2 logs` — lihat error startup
- Cek port: `ss -tlnp | grep -E '8080|25500'`

### `Cannot connect to PostgreSQL`
- `sudo systemctl status postgresql`
- Cek `DATABASE_URL` di `.env` (password, host, db name)
- Test manual: `psql $DATABASE_URL`

### `pnpm install` error / out of memory
- Tambah swap (lihat bagian 2)
- Coba `pnpm install --no-optional`

### Sitemap/robots URL masih `localhost`
- Pastikan `PUBLIC_BASE_URL` di `.env` sudah di-set
- Restart: `pm2 restart shopee-api`
- Pastikan Nginx forward `X-Forwarded-Host` (sudah ada di config di atas)

### Build frontend error "out of memory"
```bash
NODE_OPTIONS="--max-old-space-size=2048" pnpm run build
```

### Vite preview tidak terima request dari domain
Buka `artifacts/shopee-affiliate/vite.config.ts`, pastikan ada:
```ts
preview: { allowedHosts: true }
```
Sudah ada di repo ini secara default.

### SSL renewal gagal
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Reset password admin
Karena password admin disimpan di env, cukup edit `.env` lalu `pm2 restart shopee-api`.

### `install.sh` gagal di tengah jalan
Script idempotent — perbaiki masalahnya (mis. koneksi internet, izin sudo) lalu jalankan ulang. Step yang sudah selesai akan dilewati otomatis.

### Port 8080 atau 25500 sudah dipakai
```bash
ss -tlnp | grep -E '8080|25500'    # cari proses pemakai
sudo kill <PID>                     # atau ganti port di .env + ecosystem.config.cjs
```

---

## 16. Checklist Pasca-Deploy

- [ ] Homepage terbuka di `https://domain-anda.com`
- [ ] Login admin berhasil di `/admin` dengan kredensial baru
- [ ] `https://domain-anda.com/sitemap.xml` balas XML dengan URL domain Anda (bukan `localhost`)
- [ ] `https://domain-anda.com/robots.txt` balas plain text
- [ ] `https://domain-anda.com/feed.xml` balas RSS valid
- [ ] HTTPS aktif, sertifikat valid (cek di [SSL Labs](https://www.ssllabs.com/ssltest/))
- [ ] PM2 auto-start setelah reboot (`pm2 status` setelah `sudo reboot`)
- [ ] Backup database otomatis terjadwal (`crontab -l`)
- [ ] Firewall UFW aktif (`sudo ufw status`)
- [ ] Submit `sitemap.xml` ke [Google Search Console](https://search.google.com/search-console) & [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Setup [Cloudflare](https://cloudflare.com) (opsional, untuk CDN + DDoS protection gratis)
- [ ] Pasang Google Analytics 4 / Plausible / Umami untuk tracking

---

# 📎 Lampiran

## Lampiran A — Perintah PM2 Berguna

```bash
pm2 status                 # status semua proses
pm2 restart all            # restart semua
pm2 restart shopee-api     # restart hanya API
pm2 stop shopee-web        # stop frontend
pm2 delete shopee-web      # hapus dari PM2
pm2 logs                   # log realtime semua
pm2 logs shopee-api        # log realtime hanya API
pm2 flush                  # bersihkan semua log
pm2 reload all             # zero-downtime restart
pm2 save                   # simpan state untuk auto-startup
pm2 monit                  # monitor CPU/RAM realtime
```

---

## Lampiran B — Struktur Direktori

```
/home/deploy/shopee-affiliate/
├── install.sh                  ← one-click installer
├── ecosystem.config.cjs        ← konfigurasi PM2 (path otomatis)
├── .env                        ← rahasia, chmod 600 (DI-GENERATE)
├── package.json
├── pnpm-workspace.yaml
├── INSTALL.md                  ← dokumen ini
├── replit.md                   ← project overview
├── artifacts/
│   ├── api-server/             ← Express backend
│   │   ├── src/
│   │   └── dist/index.mjs      ← hasil build (DI-GENERATE)
│   └── shopee-affiliate/       ← React + Vite frontend
│       ├── src/
│       ├── vite.config.ts
│       └── dist/public/        ← hasil build statis (DI-GENERATE)
├── lib/
│   ├── db/                     ← Drizzle schema
│   ├── api-spec/               ← OpenAPI spec
│   ├── api-client-react/       ← generated React Query hooks
│   └── api-zod/                ← generated Zod schemas
├── scripts/                    ← utility scripts
├── logs/                       ← log PM2 (DI-GENERATE)
│   ├── shopee-api.out.log
│   ├── shopee-api.err.log
│   ├── shopee-web.out.log
│   └── shopee-web.err.log
└── ~/backups/                  ← dump PostgreSQL (cron)
```

---

## Lampiran C — Default Port

| Service              | Port internal | Akses publik             |
| -------------------- | ------------- | ------------------------ |
| Nginx                | 80, 443       | ✅ Internet (UFW)        |
| API server (Express) | 8080          | ❌ Localhost only        |
| Frontend (Vite)      | 25500         | ❌ Localhost only        |
| PostgreSQL           | 5432          | ❌ Localhost only        |
| SSH                  | 22            | ✅ (batasi IP jika bisa) |

---

## Lampiran D — Variabel Environment `install.sh`

Semua bisa di-override dengan prefix di depan command. Contoh: `DB_NAME=mydb ./install.sh`.

| Variabel       | Default              | Fungsi                                                       |
| -------------- | -------------------- | ------------------------------------------------------------ |
| `DB_NAME`      | `shopee_affiliate`   | Nama database PostgreSQL yang dibuat                         |
| `DB_USER`      | `shopee_user`        | Nama user PostgreSQL yang dibuat                             |
| `NODE_MAJOR`   | `24`                 | Versi mayor Node.js yang di-install                          |
| `INSTALL_PG`   | `1`                  | Set `0` untuk skip install PostgreSQL (pakai DB existing)    |
| `INSTALL_PM2`  | `1`                  | Set `0` untuk skip install PM2                               |
| `RUN_DB_PUSH`  | `1`                  | Set `0` untuk skip `drizzle-kit push`                        |
| `AUTO_BUILD`   | `1`                  | Set `0` untuk skip `pnpm run build`                          |
| `AUTO_START`   | `1`                  | Set `0` untuk skip `pm2 start` (cuma siap-siap dependencies) |

### Contoh skenario

**Pakai PostgreSQL managed (Supabase/Neon/RDS):**
```bash
INSTALL_PG=0 RUN_DB_PUSH=0 ./install.sh
# lalu edit .env, isi DATABASE_URL ke connection string managed DB
nano .env
pnpm --filter @workspace/db run push
pm2 restart all
```

**Cuma siap-siap dependencies, jangan jalan dulu:**
```bash
AUTO_BUILD=0 AUTO_START=0 ./install.sh
# nanti jalankan manual:
pnpm run build
pm2 start ecosystem.config.cjs
```

**Re-run setelah update kode:**
```bash
git pull
./install.sh    # otomatis pnpm install, drizzle push, build, pm2 reload
```

---

**Selamat! Platform ShopeeRecommend Anda sudah live di production. 🎉**

Pertanyaan/issue: buka issue di repo GitHub atau cek `pm2 logs` lebih dulu.
