require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  console.log('Connecting to PostgreSQL database...');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Diperlukan untuk penyedia cloud DB gratis seperti Supabase/Neon
    }
  });
} else {
  console.log('Connecting to local SQLite database...');
  const dbPath = path.resolve(__dirname, 'expenses.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err.message);
    }
  });
}

/**
 * Menjalankan SQL query secara universal untuk SQLite dan PostgreSQL.
 * Placeholder parameter dalam SQL ditulis dalam gaya PostgreSQL ($1, $2, dst.).
 * Wrapper ini akan otomatis merubahnya menjadi ? jika menggunakan SQLite.
 */
async function query(sql, params = []) {
  if (isPostgres) {
    let pgSql = sql;
    // Tambahkan RETURNING id secara otomatis pada query INSERT jika belum ada
    if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }
    const res = await pgPool.query(pgSql, params);
    return {
      rows: res.rows,
      rowsAffected: res.rowCount,
      insertId: res.rows[0]?.id || null
    };
  } else {
    // Ubah placeholder $1, $2, ... menjadi ? untuk SQLite
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    return new Promise((resolve, reject) => {
      const sqlUpper = sql.trim().toUpperCase();
      if (sqlUpper.startsWith('SELECT')) {
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows, rowsAffected: rows.length, insertId: null });
        });
      } else {
        sqliteDb.run(sqliteSql, params, function(err) {
          if (err) return reject(err);
          resolve({ rows: [], rowsAffected: this.changes, insertId: this.lastID });
        });
      }
    });
  }
}

/**
 * Membuat tabel expenses jika belum ada.
 */
async function initDb() {
  const createTableSql = isPostgres
    ? `CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    : `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`;

  try {
    await query(createTableSql);
    console.log('Database table "expenses" checked/created successfully.');
  } catch (err) {
    console.error('Failed to initialize database table:', err.message);
    throw err;
  }
}

module.exports = {
  query,
  initDb,
  isPostgres
};
