const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg'); // Driver PostgreSQL untuk Supabase

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis dari folder public (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

// 2. KONEKSI DATABASE (SUPABASE / POSTGRESQL)
// Vercel akan otomatis membaca variabel lingkungan POSTGRES_URL / DATABASE_URL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Wajib diaktifkan untuk koneksi aman cloud Supabase
  }
});

// Helper untuk query database agar kode API lebih rapi
const db = {
  query: (text, params) => pool.query(text, params)
};

// 3. API ENDPOINTS (CRUD EXPENSES)

// GET: Mengambil semua data pengeluaran
app.get('/api/expenses', async (req, res) => {
  try {
    const sql = 'SELECT * FROM expenses ORDER BY date DESC, id DESC';
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
  }
});

// POST: Menambah pengeluaran baru (Kebal Bug Angka)
app.post('/api/expenses', async (req, res) => {
  try {
    let { title, amount, category, date, description } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }

    // SANITASI ANGKA: Menghapus teks 'Rp', titik, spasi, atau simbol lain yang bukan angka/minus
    let cleanAmount = String(amount).replace(/[^0-9.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `
      INSERT INTO expenses (title, amount, category, date, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      title.trim(),
      parsedAmount,
      category.trim(),
      date,
      description ? description.trim() : ''
    ];

    const result = await db.query(sql, params);
    res.status(201).json({ 
      message: 'Pengeluaran berhasil ditambahkan', 
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error adding expense:', err);
    res.status(500).json({ error: 'Gagal menambahkan pengeluaran' });
  }
});

// PUT: Memperbarui pengeluaran yang sudah ada (Versi PostgreSQL Optimal)
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { title, amount, category, date, description } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }

    // SANITASI ANGKA
    let cleanAmount = String(amount).replace(/[^0-9.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `
      UPDATE expenses
      SET title = $1, amount = $2, category = $3, date = $4, description = $5
      WHERE id = $6
      RETURNING *
    `;
    const params = [
      title.trim(),
      parsedAmount,
      category.trim(),
      date,
      description ? description.trim() : '',
      id
    ];

    const result = await db.query(sql, params);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengeluaran tidak ditemukan atau gagal diperbarui' });
    }

    res.json({ 
      message: 'Pengeluaran berhasil diperbarui',
      data: result.rows[0] 
    });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran' });
  }
});

// DELETE: Menghapus pengeluaran berdasarkan ID
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM expenses WHERE id = $1 RETURNING *';
    const result = await db.query(sql, [id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengeluaran tidak ditemukan atau sudah dihapus' });
    }

    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran' });
  }
});

// 4. FALLBACK ROUTE (Mengatasi Error 404 pada Halaman Statis di Luar API)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. PENYALAAN SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

// WAJIB UNTUK VERCEL SERVERLESS DEPLOYMENT:
module.exports = app;
