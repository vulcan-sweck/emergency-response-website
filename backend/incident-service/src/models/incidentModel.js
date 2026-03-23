/**
 * Incident Model — Incident Service
 * Data-access layer for the incidents table.
 */

const db = require('../config/db');

const IncidentModel = {

  /** Create a new incident record */
  create: async ({ citizenName, incidentType, latitude, longitude, notes, createdByAdmin, region }) => {
    const result = await db.query(
      `INSERT INTO incidents
         (citizen_name, incident_type, latitude, longitude, notes, created_by_admin, region)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [citizenName, incidentType, latitude, longitude, notes, createdByAdmin, region]
    );
    return result.rows[0];
  },

  /** Retrieve a single incident by ID */
  findById: async (incidentId) => {
    const result = await db.query(
      'SELECT * FROM incidents WHERE incident_id = $1',
      [incidentId]
    );
    return result.rows[0] || null;
  },

  /** Retrieve all open (non-resolved) incidents, newest first */
  findOpen: async () => {
    const result = await db.query(
      `SELECT * FROM incidents
       WHERE status != 'resolved'
       ORDER BY created_at DESC`
    );
    return result.rows;
  },

  /** Update the status of an incident */
  updateStatus: async (incidentId, status) => {
    const resolvedAt = status === 'resolved' ? new Date() : null;
    const result = await db.query(
      `UPDATE incidents
       SET status = $1, resolved_at = $2, updated_at = NOW()
       WHERE incident_id = $3
       RETURNING *`,
      [status, resolvedAt, incidentId]
    );
    return result.rows[0] || null;
  },

  /** Assign a vehicle unit to an incident */
  assignUnit: async (incidentId, unitId) => {
    const result = await db.query(
      `UPDATE incidents
       SET assigned_unit = $1, status = 'dispatched', updated_at = NOW()
       WHERE incident_id = $2
       RETURNING *`,
      [unitId, incidentId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find the nearest available vehicles to an incident location.
   * Uses the Haversine formula approximated in SQL via the geographic coordinates.
   * Returns up to 5 closest vehicles from the dispatch service's perspective —
   * here we just return all open incidents sorted by distance for display purposes.
   *
   * @param {number} lat  Incident latitude
   * @param {number} lng  Incident longitude
   */
  findNearbyOpenIncidents: async (lat, lng) => {
    const result = await db.query(
      `SELECT *,
         (6371 * acos(
           cos(radians($1)) * cos(radians(latitude)) *
           cos(radians(longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(latitude))
         )) AS distance_km
       FROM incidents
       WHERE status != 'resolved'
       ORDER BY distance_km ASC
       LIMIT 10`,
      [lat, lng]
    );
    return result.rows;
  },
};

module.exports = IncidentModel;
