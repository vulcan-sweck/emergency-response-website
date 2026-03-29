/**
 * Database Configuration — Auth Service
 * Initialises a PostgreSQL connection pool using environment variables.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'auth_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[AUTH-DB] Connection failed:', err.message);
  } else {
    console.log('[AUTH-DB] Connected to PostgreSQL');
    release();
  }
});

module.exports = pool;
