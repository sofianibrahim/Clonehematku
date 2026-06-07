const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 2. KONEKSI DATABASE SUPABASE
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = {
  query: (text, params) => pool.query(text, params)
};

// 3. API ENDPOINTS (CRUD)

// GET: Ambil semua data pengeluaran (Mendukung filter pencarian frontend)
app.get('/api/expenses', async (req, res) => {
  try {
    const { search, category, startDate, endDate } = req.query;
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    if (startDate) {
      sql += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      sql += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ' ORDER BY date DESC, id DESC';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
  }
});

// GET: API STATS & GRAPH DATA (Kunci Utama Penghilang Loading Selamanya)
app.get('/api/expenses/stats', async (req, res) => {
  try {
    // Kueri 1: Hitung Hari ini, Bulan ini, dan Total Pengeluaran
    const summarySql = `
      SELECT 
        COALESCE(SUM(CASE WHEN date = CURRENT_DATE THEN amount ELSE 0 END), 0) as today_expense,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) as month_expense,
        COALESCE(SUM(amount), 0) as total_expense
      FROM expenses
    `;
    const summaryRes = await db.query(summarySql);
    const { today_expense, month_expense, total_expense } = summaryRes.rows[0];

    // Kueri 2: Data Grafik Donat (Kategori)
    const categorySql = `
      SELECT category, SUM(amount) as total 
      FROM expenses 
      GROUP BY category 
      ORDER BY total DESC
    `;
    const categoryRes = await db.query(categorySql);
    const categoryData = categoryRes.rows.map(r => ({
      category: r.category,
      total: parseFloat(r.total)
    }));

    // Kueri 3: Data Grafik Garis (Tren Pengeluaran 30 Hari Terakhir)
    const trendSql = `
      SELECT TO_CHAR(date, 'YYYY-MM-DD') as trend_date, SUM(amount) as total
      FROM expenses
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    const trendRes = await db.query(trendSql);
    const trendData = trendRes.rows.map(r => ({
      date: r.trend_date,
      total: parseFloat(r.total)
    }));

    // Kirim objek data sesuai format ekspektasi file public/script.js kamu
    res.json({
      todayExpense: parseFloat(today_expense),
      monthExpense: parseFloat(month_expense),
      totalExpense: parseFloat(total_expense),
      categoryData,
      trendData
    });
  } catch (err) {
    console.error('Error generating stats:', err);
    res.status(500).json({ error: 'Gagal memuat statistik database' });
  }
});

// POST: Tambah Baru
app.post('/api/expenses', async (req, res) => {
  try {
    let { title, amount, category, date, description } = req.body;
    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }
    let cleanAmount = String(amount).replace(/[^0-9.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `INSERT INTO expenses (title, amount, category, date, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await db.query(sql, [title.trim(), parsedAmount, category.trim(), date, description ? description.trim() : '']);
    res.status(201).json({ message: 'Pengeluaran berhasil ditambahkan', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambahkan pengeluaran' });
  }
});

// PUT: Edit Data
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { title, amount, category, date, description } = req.body;
    let cleanAmount = String(amount).replace(/[^0-9.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);

    const sql = `UPDATE expenses SET title = $1, amount = $2, category = $3, date = $4, description = $5 WHERE id = $6 RETURNING *`;
    const result = await db.query(sql, [title.trim(), parsedAmount, category.trim(), date, description ? description.trim() : '', id]);
    
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Pengeluaran berhasil diperbarui', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran' });
  }
});

// DELETE: Hapus Data
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran' });
  }
});

// FALLBACK ROUTE
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// LISTEN
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server aktif pada port ${PORT}`));

module.exports = app;
