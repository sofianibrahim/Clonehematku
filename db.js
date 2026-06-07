const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // WAJIB ADA: Mengizinkan serverless Vercel terhubung aman ke cloud Supabase
    rejectUnauthorized: false
  }
});

// Fungsi inisialisasi untuk memastikan tabel database siap digunakan
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
    await pool.query(queryText);
    console.log('Table "expenses" verified or created successfully.');
  } catch (err) {
    console.error('Error initializing database table:', err);
    throw err;
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb
};
