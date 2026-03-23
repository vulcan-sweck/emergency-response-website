/**
 * Database Configuration — Dispatch Service
 */
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'dispatch_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.connect((err, client, release) => {
  if (err) console.error('[DISPATCH-DB] Connection failed:', err.message);
  else { console.log('[DISPATCH-DB] Connected to PostgreSQL'); release(); }
});

module.exports = pool;
