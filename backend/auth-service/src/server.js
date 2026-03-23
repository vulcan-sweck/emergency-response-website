/**
 * Auth Service — Entry Point
 * Emergency Response Coordination Platform
 *
 * Starts the Express server that handles all authentication
 * operations: registration, login, token refresh, profile.
 */

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const authRoutes = require('./routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[AUTH-SERVICE ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[AUTH-SERVICE] Running on port ${PORT}`);
});

module.exports = app;
