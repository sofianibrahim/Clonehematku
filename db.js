const { Pool } = require('pg');

// Membuat koneksi database menggunakan Environment Variable dari Vercel
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // WAJIB ADA: Mengizinkan Vercel Serverless terhubung ke cloud Supabase
    rejectUnauthorized: false 
  }
});

// Fungsi inisialisasi untuk membuat tabel otomatis jika belum ada
async function initDb() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      description TEXT
    );
  `;
  try {
    // Di Vercel serverless, kita langsung eksekusi query tanpa perlu memanggil pool.connect() lama
    await pool.query(queryText);
    console.log('Table "expenses" verified or created successfully.');
  } catch (err) {
    console.error('Error initializing database table:', err);
    // Agar tidak mematikan fungsi serverless secara total, kita log saja error-nya
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb
};
