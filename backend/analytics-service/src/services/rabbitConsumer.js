/**
 * RabbitMQ Consumer — Analytics Service
 *
 * Subscribes to 'incident.resolved' events and writes a row to
 * analytics_events so the dashboard has data to display.
 */

const amqp          = require('amqplib');
const AnalyticsModel = require('../models/analyticsModel');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'emergency_events';
const QUEUE        = 'analytics_queue';

/** Map incident_type → service_type for analytics grouping */
const incidentTypeToService = (type) => {
  const map = {
    fire: 'fire', medical: 'ambulance', crime: 'police',
    accident: 'ambulance', natural_disaster: 'rescue', other: 'ambulance',
  };
  return map[type] || 'ambulance';
};

const start = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel    = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    const q = await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(q.queue, EXCHANGE, 'incident.resolved');

    console.log('[ANALYTICS-CONSUMER] Listening for resolved incidents...');

    channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      const payload = JSON.parse(msg.content.toString());

      try {
        await AnalyticsModel.recordEvent({
          incidentId:     payload.incidentId,
          responseTime:   payload.responseTime   || 0,
          resolutionTime: payload.resolutionTime || null,
          region:         payload.region         || 'Unknown',
          serviceType:    incidentTypeToService(payload.incidentType),
          incidentType:   payload.incidentType   || 'other',
        });
        console.log('[ANALYTICS-CONSUMER] Event recorded for incident', payload.incidentId);
      } catch (err) {
        console.error('[ANALYTICS-CONSUMER] Record error:', err.message);
      }

      channel.ack(msg);
    });
  } catch (err) {
    console.warn('[ANALYTICS-CONSUMER] Connection failed, retrying in 5s...', err.message);
    setTimeout(start, 5000);
  }
};

module.exports = { start };
