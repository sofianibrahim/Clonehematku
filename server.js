// API: Create new expense (VERSI SANGAT AMAN & KEBAL BUG ANGKA)
app.post('/api/expenses', async (req, res) => {
  try {
    let { title, amount, category, date, description } = req.body;
    
    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }

    // PROSES SANITASI: Mengonversi amount ke string, lalu hapus teks 'Rp', titik, atau spasi jika ada
    let cleanAmount = String(amount).replace(/[^0-9.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);
    
    // Validasi angka setelah dibersihkan
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `
      INSERT INTO expenses (title, amount, category, date, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
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
      expenseId: result.rows[0]?.id
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Gagal menambahkan pengeluaran' });
  }
});
