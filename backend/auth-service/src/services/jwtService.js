/**
 * JWT Service — Auth Service
 * Utility functions for creating and verifying JSON Web Tokens.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET          = process.env.JWT_SECRET || 'dev_secret';
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN  = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const JwtService = {

  /**
   * Generate a short-lived access token (default 15 minutes).
   */
  generateAccessToken: (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  /**
   * Generate a long-lived refresh token (default 7 days).
   */
  generateRefreshToken: (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  },

  /**
   * Verify and decode any JWT.
   * Throws if token is invalid or expired.
   */
  verify: (token) => {
    return jwt.verify(token, JWT_SECRET);
  },

  /**
   * Calculate absolute expiry Date for refresh token DB record.
   */
  refreshTokenExpiry: () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  },
};

module.exports = JwtService;
