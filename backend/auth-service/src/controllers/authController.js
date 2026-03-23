/**
 * Auth Controller — Auth Service
 * Handles register, login, token refresh, and profile retrieval.
 */

const bcrypt     = require('bcryptjs');
const UserModel  = require('../models/userModel');
const JwtService = require('../services/jwtService');

const AuthController = {

  /**
   * POST /auth/register
   * Creates a new admin user account.
   * Body: { name, email, password, role }
   */
  register: async (req, res, next) => {
    try {
      const { name, email, password, role } = req.body;

      // Validate required fields
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      // Validate role
      const ALLOWED_ROLES = ['system_admin', 'hospital_admin', 'police_admin', 'fire_admin', 'ambulance_admin'];
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified.' });
      }

      // Check for duplicate email
      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered.' });
      }

      // Hash password with bcrypt (10 rounds)
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await UserModel.create({ name, email, passwordHash, role });

      return res.status(201).json({ message: 'User registered successfully.', user });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/login
   * Authenticates a user and returns access + refresh tokens.
   * Body: { email, password }
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      // Fetch user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Compare password against stored hash
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Build token payload (kept minimal — no sensitive data)
      const tokenPayload = {
        userId: user.user_id,
        role:   user.role,
      };

      const accessToken  = JwtService.generateAccessToken(tokenPayload);
      const refreshToken = JwtService.generateRefreshToken(tokenPayload);

      // Persist refresh token
      await UserModel.saveRefreshToken(
        user.user_id,
        refreshToken,
        JwtService.refreshTokenExpiry()
      );

      return res.json({
        accessToken,
        refreshToken,
        user: {
          userId: user.user_id,
          name:   user.name,
          email:  user.email,
          role:   user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /auth/refresh-token
   * Issues a new access token given a valid refresh token.
   * Body: { refreshToken }
   */
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required.' });
      }

      // Verify token signature and expiry
      let decoded;
      try {
        decoded = JwtService.verify(refreshToken);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      // Check token exists in DB (protects against revoked tokens)
      const storedToken = await UserModel.findRefreshToken(refreshToken);
      if (!storedToken) {
        return res.status(401).json({ error: 'Refresh token revoked or expired.' });
      }

      // Issue new access token
      const newAccessToken = JwtService.generateAccessToken({
        userId: decoded.userId,
        role:   decoded.role,
      });

      return res.json({ accessToken: newAccessToken });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /auth/profile
   * Returns the authenticated user's profile.
   * Requires Authorization: Bearer <access_token>
   */
  getProfile: async (req, res, next) => {
    try {
      // req.user is attached by the authenticate middleware
      const user = await UserModel.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      return res.json({ user });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
