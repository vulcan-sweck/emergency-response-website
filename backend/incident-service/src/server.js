/**
 * Incident Service — Entry Point
 * Emergency Response Coordination Platform
 *
 * Handles creation, retrieval, and status management of emergency incidents.
 * Publishes events to RabbitMQ so the dispatch service can react in real-time.
 */

require('dotenv').config();
const express          = require('express');
const cors             = require('cors');
const incidentRoutes   = require('./routes/incidentRoutes');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use('/incidents', incidentRoutes);

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'incident-service' }));

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[INCIDENT-SERVICE ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`[INCIDENT-SERVICE] Running on port ${PORT}`);
});

module.exports = app;
