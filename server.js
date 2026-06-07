// API: Update an expense (VERSI SANGAT AMAN & KEBAL BUG ANGKA)
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { title, amount, category, date, description } = req.body;

    if (!title || !amount || !category || !date) {
      return res.status(400).json({ error: 'Judul, Jumlah, Kategori, dan Tanggal wajib diisi' });
    }

    // PROSES SANITASI: Menghapus teks 'Rp', titik, atau spasi jika ada pada proses edit
    let cleanAmount = String(amount).replace(/[^0-9.-]/g, '');
    const parsedAmount = parseFloat(cleanAmount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah pengeluaran harus berupa angka positif' });
    }

    const sql = `
      UPDATE expenses
      SET title = $1, amount = $2, category = $3, date = $4, description = $5
      WHERE id = $6
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
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pengeluaran tidak ditemukan' });
    }

    res.json({ message: 'Pengeluaran berhasil diperbarui' });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Gagal memperbarui pengeluaran' });
  }
});
