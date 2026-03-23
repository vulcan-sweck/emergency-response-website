/**
 * Analytics Model — Analytics Service
 * Data-access layer for all reporting queries against analytics_events.
 */

const db = require('../config/db');

const AnalyticsModel = {

  /**
   * Average and min/max response times, optionally grouped by service type.
   * Returns an array of { service_type, avg_seconds, min_seconds, max_seconds, event_count }
   */
  getResponseTimes: async (days = 30) => {
    const result = await db.query(
      `SELECT
         service_type,
         ROUND(AVG(response_time))::int   AS avg_seconds,
         MIN(response_time)               AS min_seconds,
         MAX(response_time)               AS max_seconds,
         COUNT(*)::int                    AS event_count
       FROM analytics_events
       WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY service_type
       ORDER BY avg_seconds ASC`,
      [days]
    );
    return result.rows;
  },

  /**
   * Incident count grouped by region, for the heat-map chart.
   * Returns { region, incident_count }[]
   */
  getIncidentsByRegion: async (days = 30) => {
    const result = await db.query(
      `SELECT
         region,
         COUNT(*)::int AS incident_count
       FROM analytics_events
       WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY region
       ORDER BY incident_count DESC`,
      [days]
    );
    return result.rows;
  },

  /**
   * Resource utilisation — how many events per service type.
   * Returns { service_type, total_events, avg_resolution_minutes }[]
   */
  getResourceUtilization: async (days = 30) => {
    const result = await db.query(
      `SELECT
         service_type,
         COUNT(*)::int                                         AS total_events,
         ROUND(AVG(resolution_time) / 60.0, 1)               AS avg_resolution_minutes
       FROM analytics_events
       WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY service_type
       ORDER BY total_events DESC`,
      [days]
    );
    return result.rows;
  },

  /**
   * Store a new analytics event (called by the RabbitMQ consumer when an
   * incident resolves).
   */
  recordEvent: async ({ incidentId, responseTime, resolutionTime, region, serviceType, incidentType }) => {
    const result = await db.query(
      `INSERT INTO analytics_events
         (incident_id, response_time, resolution_time, region, service_type, incident_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [incidentId, responseTime, resolutionTime, region, serviceType, incidentType]
    );
    return result.rows[0];
  },
};

module.exports = AnalyticsModel;
