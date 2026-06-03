# HematKu - Catatan Pengeluaran Harian Full-Stack

Aplikasi full-stack premium untuk mencatat pengeluaran sehari-hari. Aplikasi ini didesain agar responsif, modern, dan sangat hemat sumber daya. Menggunakan **Node.js + Express** di backend, **Vanilla HTML/CSS/JS** di frontend, serta mendukung **SQLite** (lokal) dan **PostgreSQL** (VPS/Production).

## Fitur Utama
- **Dashboard Ringkasan:** Pengeluaran hari ini, akumulasi bulan ini, dan total pengeluaran keseluruhan.
- **Grafik Interaktif:** Visualisasi pengeluaran berdasarkan kategori (Doughnut Chart) dan Tren Harian 30 Hari Terakhir (Line Chart dengan gradient fill) menggunakan Chart.js.
- **Manajemen Catatan (CRUD):** Tambah, edit, dan hapus transaksi secara instan tanpa reload halaman.
- **Pencarian & Filter Dinamis:** Pencarian teks deskripsi dan filter kategori/tanggal secara real-time.
- **Notifikasi Toast:** Umpan balik visual yang modern dan interaktif untuk setiap aksi sukses/gagal.
- **Tema Gelap/Terang:** Sistem tema gelap dan terang premium yang persisten (tersimpan di lokal browser).

---

## 1. Uji Coba Lokal

### Prasyarat
- Pastikan Anda sudah menginstal **Node.js** (Versi 18 ke atas direkomendasikan).

### Cara Menjalankan
1. Clone atau letakkan semua file project ini di folder komputer Anda.
2. Buka terminal (CMD / PowerShell / Terminal VS Code) di folder tersebut.
3. Instal semua dependensi:
   ```bash
   npm install
   ```
4. Jalankan aplikasi dalam mode pengembangan:
   ```bash
   npm run dev
   ```
   *Catatan: Mode dev menggunakan flag `--watch` bawaan Node.js 22 untuk reload otomatis saat kode diubah.*
5. Buka browser dan akses alamat:
   ```text
   http://localhost:3000
   ```
Aplikasi akan mendeteksi bahwa tidak ada `DATABASE_URL` di file `.env`, sehingga secara otomatis membuat file database SQLite lokal bernama `expenses.db` di folder project Anda.

---

## 2. Pilihan VPS & Cloud Database 100% Gratis

Agar data Anda aman dan aplikasi dapat diakses di seluruh internet secara gratis, Anda memerlukan **Database PostgreSQL gratis** dan **Host Server gratis**.

### A. Mendapatkan Database Cloud PostgreSQL Gratis
Pilihan terbaik untuk database cloud gratis:
1. **Supabase (supabase.com):** Menyediakan database PostgreSQL gratis lengkap dengan UI dashboard yang intuitif.
2. **Neon (neon.tech):** Menyediakan database serverless PostgreSQL gratis yang sangat cepat.

**Langkah Setup Database:**
1. Daftar di Supabase atau Neon menggunakan akun GitHub.
2. Buat project baru (misal: "HematKu DB").
3. Cari menu **Database Connection String** (format URI). Contohnya akan terlihat seperti ini:
   ```text
   postgresql://postgres:password-anda@db-project-id.supabase.co:5432/postgres
   ```
4. Simpan URI tersebut. Anda akan membutuhkannya untuk konfigurasi di server/VPS.

---

### B. Deployment Menggunakan PaaS Gratis (Paling Mudah)
Jika Anda tidak ingin mengonfigurasi Linux VPS secara manual, Anda bisa menggunakan **Render (render.com)** atau **Fly.io** untuk men-host web app secara gratis.

**Langkah Deployment di Render:**
1. Buat akun di **Render** (render.com) dan hubungkan dengan akun GitHub Anda.
2. Upload kode aplikasi HematKu ini ke sebuah repositori GitHub (pribadi atau publik).
3. Di dashboard Render, klik **New > Web Service**.
4. Pilih repositori GitHub HematKu.
5. Konfigurasikan detail berikut:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Buka bagian **Environment Variables** (Envs) dan tambahkan:
   - `PORT` = `3000` (atau biarkan default Render)
   - `DATABASE_URL` = *[Isi dengan URI database PostgreSQL Anda dari Supabase/Neon]*
7. Klik **Deploy Web Service**. Render akan otomatis mem-build dan memberikan link URL internet gratis (misal: `https://hematku.onrender.com`).

---

### C. Deployment Manual di VPS Linux Gratis (Oracle / AWS Free Tier)
Jika Anda memilih menggunakan Linux VPS gratis (seperti **Oracle Cloud Infrastructure Free Tier** yang menyediakan VM Ubuntu gratis selamanya, atau **AWS EC2 Micro instance** gratis 1 tahun):

#### Langkah 1: Hubungkan ke VPS Anda melalui SSH
```bash
ssh ubuntu@alamat-ip-vps-anda
```

#### Langkah 2: Instal Node.js dan NPM menggunakan NVM
Jalankan perintah ini di dalam VPS Anda:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
```

#### Langkah 3: Clone Project & Konfigurasi Env
1. Pindahkan file aplikasi ke VPS (bisa dengan clone dari GitHub).
2. Masuk ke folder project:
   ```bash
   cd dua
   ```
3. Buat file `.env` di VPS:
   ```bash
   nano .env
   ```
   Isi file `.env` dengan:
   ```text
   PORT=3000
   DATABASE_URL=postgres://user:password@host:port/database
   ```
   *(Ganti isi DATABASE_URL sesuai URI database PostgreSQL dari Supabase/Neon yang Anda miliki. Jika Anda ingin menggunakan SQLite lokal di VPS saja tanpa DB eksternal, kosongkan variabel DATABASE_URL).*

#### Langkah 4: Jalankan Aplikasi di Background Menggunakan PM2
PM2 memastikan aplikasi Anda tetap berjalan meskipun terminal SSH ditutup atau server melakukan restart.
```bash
# Instal PM2 secara global
npm install -g pm2

# Install dependensi project
npm install

# Jalankan server.js dengan PM2
pm2 start server.js --name "hematku"

# Konfigurasikan agar PM2 otomatis menyala saat VPS restart
pm2 startup
pm2 save
```

#### Langkah 5: Hubungkan ke Port Publik (Setup Nginx Reverse Proxy)
Secara default, aplikasi berjalan di port `3000`. Kita ingin mem-forward lalu lintas dari port standard web (`80` untuk HTTP atau `443` untuk HTTPS) ke port `3000`.

1. Instal Nginx:
   ```bash
   sudo apt update
   sudo apt install nginx -y
   ```
2. Buat konfigurasi proxy baru:
   ```bash
   sudo nano /etc/nginx/sites-available/hematku
   ```
3. Rekatkan konfigurasi berikut (ganti `domain-anda.com` dengan domain Anda, atau alamat IP publik VPS jika belum memiliki domain):
   ```nginx
   server {
       listen 80;
       server_name domain-anda.com alamat-ip-vps;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
4. Aktifkan konfigurasi tersebut dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/hematku /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```
5. Buka port firewall di VPS Anda (terutama di panel Oracle Cloud / AWS console) untuk mengizinkan trafik HTTP (port 80) dan HTTPS (port 443).

#### Langkah 6: Tambahkan SSL Gratis (HTTPS)
Jika Anda menggunakan domain, Anda bisa dengan mudah mengaktifkan HTTPS gratis menggunakan Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d domain-anda.com
```
Ikuti petunjuk di layar, dan Certbot akan otomatis mengubah konfigurasi Nginx Anda ke HTTPS gratis yang diperbarui secara otomatis.
