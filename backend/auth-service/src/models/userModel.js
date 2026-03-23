/**
 * User Model — Auth Service
 * Data-access layer for the users and refresh_tokens tables.
 */

const db = require('../config/db');

const UserModel = {

  /**
   * Find a user by their email address.
   * Used during login to retrieve password hash for comparison.
   */
  findByEmail: async (email) => {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by their primary key.
   * Used to populate the /auth/profile response.
   */
  findById: async (userId) => {
    const result = await db.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Insert a new user into the database.
   * Password must already be hashed before calling this method.
   */
  create: async ({ name, email, passwordHash, role }) => {
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    return result.rows[0];
  },

  /**
   * Store a refresh token linked to a user.
   */
  saveRefreshToken: async (userId, token, expiresAt) => {
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
  },

  /**
   * Look up a refresh token record.
   * Returns null if token doesn't exist or has expired.
   */
  findRefreshToken: async (token) => {
    const result = await db.query(
      `SELECT rt.*, u.role FROM refresh_tokens rt
       JOIN users u ON u.user_id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] || null;
  },

  /**
   * Delete a refresh token (logout / revoke).
   */
  deleteRefreshToken: async (token) => {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  },
};

module.exports = UserModel;
