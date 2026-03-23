/**
 * RabbitMQ Publisher — Incident Service
 *
 * Publishes incident lifecycle events to the 'emergency_events' exchange.
 * The dispatch service subscribes to these events to trigger vehicle assignments.
 *
 * Exchange: emergency_events (topic)
 * Routing keys:
 *   incident.created   — new incident logged
 *   incident.dispatched — unit assigned
 *   incident.resolved  — incident closed
 */

const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'emergency_events';

let channel = null;

/**
 * Connect to RabbitMQ and assert the topic exchange.
 * Called once on service startup. Retries after 5s on failure.
 */
const connect = async () => {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log('[RABBITMQ] Publisher connected to exchange:', EXCHANGE);
  } catch (err) {
    console.warn('[RABBITMQ] Connection failed, retrying in 5s...', err.message);
    setTimeout(connect, 5000);
  }
};

/**
 * Publish an event message to the exchange.
 * @param {string} routingKey  e.g. 'incident.created'
 * @param {object} payload     JSON-serialisable event data
 */
const publish = (routingKey, payload) => {
  if (!channel) {
    console.warn('[RABBITMQ] Channel not ready — dropping event:', routingKey);
    return;
  }
  const message = Buffer.from(JSON.stringify(payload));
  channel.publish(EXCHANGE, routingKey, message, { persistent: true });
  console.log(`[RABBITMQ] Published ${routingKey}:`, payload);
};

// Attempt connection on module load
connect();

module.exports = { publish };
