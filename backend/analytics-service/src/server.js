/**
 * Analytics Service — Entry Point
 * Emergency Response Coordination Platform
 *
 * Serves aggregated statistics for the admin dashboard.
 * Also consumes RabbitMQ 'incident.resolved' events to record analytics.
 */

require('dotenv').config();
const express           = require('express');
const cors              = require('cors');
const swaggerUi         = require('swagger-ui-express');
const YAML              = require('yamljs');
const path              = require('path');
const analyticsRoutes   = require('./routes/analyticsRoutes');
const rabbitConsumer    = require('./services/rabbitConsumer');

const app  = express();
const PORT = process.env.PORT || 3004;

// ── Swagger UI — interactive API docs at /api-docs ───────────
const swaggerDoc = YAML.load(path.join(__dirname, '../swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customSiteTitle: 'Analytics Service API Docs',
}));

app.use(cors());
app.use(express.json());

app.use('/analytics', analyticsRoutes);
app.use('/hospitals', require('./routes/hospitalRoutes'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'analytics-service' }));

app.use((err, req, res, next) => {
  console.error('[ANALYTICS-SERVICE ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start consuming resolved incident events
rabbitConsumer.start();

app.listen(PORT, () => {
  console.log(`[ANALYTICS-SERVICE] Running on port ${PORT}`);
});

module.exports = app;
