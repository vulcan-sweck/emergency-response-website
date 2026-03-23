/**
 * Dispatch Service — Entry Point
 * Emergency Response Coordination Platform
 *
 * Manages vehicle GPS tracking and real-time location broadcasting via Socket.IO.
 * Also consumes RabbitMQ events from the incident service.
 *
 * Socket.IO events:
 *   EMIT   → 'vehicle:location_update'  — sent to all connected clients on GPS change
 *   LISTEN → 'vehicle:update_location'  — received from mobile clients / GPS devices
 */

require('dotenv').config();
const express          = require('express');
const http             = require('http');
const cors             = require('cors');
const { Server }       = require('socket.io');
const vehicleRoutes    = require('./routes/vehicleRoutes');
const rabbitConsumer   = require('./services/rabbitConsumer');

const app    = express();
const server = http.createServer(app);  // Wrap Express in HTTP server for Socket.IO
const PORT   = process.env.PORT || 3003;

// ── Socket.IO setup ─────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Make io accessible in route handlers via req.app.get('io')
app.set('io', io);

// ── Socket.IO connection handler ─────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET.IO] Client connected: ${socket.id}`);

  /**
   * Mobile/GPS device pushes a location update.
   * Payload: { vehicleId, latitude, longitude }
   * We broadcast it to all connected dashboard clients.
   */
  socket.on('vehicle:update_location', async (data) => {
    const { vehicleId, latitude, longitude } = data;

    if (!vehicleId || latitude == null || longitude == null) return;

    try {
      const VehicleModel = require('./models/vehicleModel');
      await VehicleModel.updateLocation(vehicleId, latitude, longitude);

      // Broadcast updated location to all connected clients
      io.emit('vehicle:location_update', { vehicleId, latitude, longitude, timestamp: new Date() });
    } catch (err) {
      console.error('[SOCKET.IO] Location update error:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET.IO] Client disconnected: ${socket.id}`);
  });
});

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── REST Routes ──────────────────────────────────────────────
app.use('/vehicles', vehicleRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'dispatch-service' }));

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[DISPATCH-SERVICE ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start RabbitMQ consumer ──────────────────────────────────
rabbitConsumer.start(io);

server.listen(PORT, () => {
  console.log(`[DISPATCH-SERVICE] Running on port ${PORT} (HTTP + WebSocket)`);
});

module.exports = { app, io };
