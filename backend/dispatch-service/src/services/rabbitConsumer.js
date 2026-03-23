/**
 * RabbitMQ Consumer — Dispatch Service
 *
 * Subscribes to incident events from the incident-service exchange.
 * When a new incident is created, automatically finds and dispatches
 * the nearest available vehicle.
 *
 * Routing keys consumed:
 *   incident.created    → auto-dispatch nearest unit
 *   incident.resolved   → mark vehicle as available again
 */

const amqp         = require('amqplib');
const VehicleModel = require('../models/vehicleModel');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'emergency_events';
const QUEUE        = 'dispatch_queue';

/**
 * Map incident type to required service type.
 */
const incidentTypeToService = (incidentType) => {
  const map = {
    fire:             'fire',
    medical:          'ambulance',
    crime:            'police',
    accident:         'ambulance',
    natural_disaster: 'rescue',
    other:            'ambulance',
  };
  return map[incidentType] || 'ambulance';
};

/**
 * Start consuming messages from RabbitMQ.
 * @param {import('socket.io').Server} io  Socket.IO server for broadcasting updates
 */
const start = async (io) => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel    = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    const q = await channel.assertQueue(QUEUE, { durable: true });

    // Subscribe to all incident.* events
    await channel.bindQueue(q.queue, EXCHANGE, 'incident.*');

    console.log('[RABBITMQ-CONSUMER] Waiting for incident events...');

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;

      const routingKey = msg.fields.routingKey;
      const payload    = JSON.parse(msg.content.toString());

      console.log(`[RABBITMQ-CONSUMER] Received ${routingKey}:`, payload);

      try {
        if (routingKey === 'incident.created') {
          // Find nearest available unit for this incident type
          const serviceType = incidentTypeToService(payload.incidentType);
          const nearest = await VehicleModel.findNearestAvailable(
            payload.latitude,
            payload.longitude,
            serviceType
          );

          if (nearest) {
            await VehicleModel.updateStatus(nearest.vehicle_id, 'dispatched', payload.incidentId);
            console.log(`[AUTO-DISPATCH] ${nearest.vehicle_id} dispatched to incident ${payload.incidentId}`);

            // Notify connected clients of vehicle status change
            io.emit('vehicle:status_update', {
              vehicleId: nearest.vehicle_id,
              status: 'dispatched',
              incidentId: payload.incidentId,
            });
          } else {
            console.warn(`[AUTO-DISPATCH] No available ${serviceType} unit for incident ${payload.incidentId}`);
          }
        }

        if (routingKey === 'incident.resolved') {
          // Free up the vehicle that was assigned to this incident
          // (lookup by assigned_incident field)
          const vehicles = await VehicleModel.findAll();
          const assigned = vehicles.find(v => v.assigned_incident === payload.incidentId);

          if (assigned) {
            await VehicleModel.updateStatus(assigned.vehicle_id, 'returning', null);
            io.emit('vehicle:status_update', {
              vehicleId: assigned.vehicle_id,
              status: 'returning',
            });
          }
        }
      } catch (err) {
        console.error('[RABBITMQ-CONSUMER] Handler error:', err.message);
      }

      channel.ack(msg);
    });

  } catch (err) {
    console.warn('[RABBITMQ-CONSUMER] Connection failed, retrying in 5s...', err.message);
    setTimeout(() => start(io), 5000);
  }
};

module.exports = { start };
