/**
 * Auth Routes — Auth Service
 * Defines all /auth/* endpoints and applies JWT middleware where required.
 */

const express        = require('express');
const AuthController = require('../controllers/authController');
const JwtService     = require('../services/jwtService');

const router = express.Router();

// ── JWT authentication middleware ─────────────────────────────
/**
 * Verifies the Bearer token in the Authorization header.
 * On success, attaches decoded payload to req.user.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token missing.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = JwtService.verify(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token.' });
  }
};

// ── Public routes ─────────────────────────────────────────────
router.post('/register',      AuthController.register);
router.post('/login',         AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// ── Protected routes ──────────────────────────────────────────
router.get('/profile', authenticate, AuthController.getProfile);

module.exports = router;
