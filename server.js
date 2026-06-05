require('dotenv').config();
const dns = require('dns');
// Mengatasi masalah jaringan lokal yang tidak mendukung IPv6 (ENETUNREACH)
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Format tanggal ke YYYY-MM-DD lokal
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// API: Get all expenses (with optional filters)
app.get('/api/expenses', async (req, res) => {
  try {
    const { search, category, startDate, endDate } = req.query;
    
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (title LIKE $${params.length} OR description LIKE $${params.length})`;
    }
    
    if (category) {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    
    if (startDate) {
      params.push(startDate);
      sql += ` AND date >= $${params.length}`;
    }
    
    if (endDate) {
      params.push(endDate);
      sql += ` AND date <= $${params.length}`;
    }
    
    sql += ' ORDER BY date DESC, id DESC';
    
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengeluaran' });
  }
});

// API: Get statistics for dashboard
app.get('/api/expenses/stats', async (req, res) => {
  try {
    const todayStr = getLocalDateString(new Date());
    
    // Tentukan awal dan akhir bulan ini
    const now = new Date();
    const startOfMonthStr = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonthStr = getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    
    // 30 hari yang lalu untuk tren harian
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = getLocalDateString(thirtyDaysAgo);

    // 1. Total Pengeluaran Keseluruhan
    const totalRes = await db.query('SELECT SUM(amount) as total FROM expenses');
    const totalExpense = parseFloat(totalRes.rows[0]?.total || 0);

    // 2. Pengeluaran Hari Ini
    const todayRes = await db.query('SELECT SUM(amount) as total FROM expenses WHERE date = $1', [todayStr]);
    const todayExpense = parseFloat(todayRes.rows[0]?.total || 0);

    // 3. Pengeluaran Bulan Ini
    const monthRes = await db.query('SELECT SUM(amount) as total FROM expenses WHERE date >= $1 AND date <= $2', [startOfMonthStr, endOfMonthStr]);
    const monthExpense = parseFloat(monthRes.rows[0]?.total || 0);

    // 4. Pengeluaran per Kategori
    const categoryRes = await db.query(
      'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses GROUP BY category ORDER BY total DESC'
    );
    const categoryData = categoryRes.rows.map(row => ({
      category: row.category,
      total: parseFloat(row.total || 0),
      count: parseInt(row.count || 0)
    }));

    // 5. Tren Harian (30 Hari Terakhir)
    const trendRes = await db.query(
      'SELECT date, SUM(amount) as total FROM expenses WHERE date >= $1 GROUP BY date ORDER BY date ASC',
      [thirtyDaysAgoStr]
    );
    const trendData = trendRes.rows.map(row => ({
      date: row.date,
      total: parseFloat(row.total || 0)
    }));

    res.json({
      totalExpense,
      todayExpense,
      monthExpense,
      categoryData,
      trendData
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Gagal mengambil data statistik' });
  }
});

// API: Create new expense
app.post('/api/expenses', async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;
    
    // Validasi sederhana
    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }
    
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `
      INSERT INTO expenses (title, amount, category, date, description)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const params = [
      title.trim(),
      parseFloat(amount),
      category.trim(),
      date,
      description ? description.trim() : ''
    ];

    const result = await db.query(sql, params);
    
    res.status(201).json({
      message: 'Pengeluaran berhasil ditambahkan',
      expenseId: result.insertId
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Gagal menambahkan pengeluaran' });
  }
});

// API: Update an expense
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, date, description } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `
      UPDATE expenses
      SET title = $1, amount = $2, category = $3, date = $4, description = $5
      WHERE id = $6
    `;
    const params = [
      title.trim(),
      parseFloat(amount),
      category.trim(),
      date,
      description ? description.trim() : '',
      id
    ];

    const result = await db.query(sql, params);
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
    }

    res.json({ message: 'Pengeluaran berhasil diperbarui' });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran' });
  }
});

// API: Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = 'DELETE FROM expenses WHERE id = $1';
    const result = await db.query(sql, [id]);
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
    }

    res.json({ message: 'Pengeluaran berhasil dihapus' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Gagal menghapus pengeluaran' });
  }
});

// Jalankan database init dan hidupkan server
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
  });
}).catch(err => {
  console.error('Database failed to initialize. Exiting...', err);
  process.exit(1);
});
