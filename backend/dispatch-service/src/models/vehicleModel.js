/**
 * Vehicle Model — Dispatch Service
 * Data-access layer for the vehicles and location_history tables.
 */

const db = require('../config/db');

const VehicleModel = {

  /** Register a new vehicle in the fleet */
  register: async ({ vehicleId, name, serviceType }) => {
    const result = await db.query(
      `INSERT INTO vehicles (vehicle_id, name, service_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [vehicleId, name, serviceType]
    );
    return result.rows[0];
  },

  /** Retrieve all vehicles */
  findAll: async () => {
    const result = await db.query(
      'SELECT * FROM vehicles ORDER BY service_type, vehicle_id'
    );
    return result.rows;
  },

  /** Retrieve all vehicles of a specific service type */
  findByType: async (serviceType) => {
    const result = await db.query(
      'SELECT * FROM vehicles WHERE service_type = $1',
      [serviceType]
    );
    return result.rows;
  },

  /** Retrieve a single vehicle's current location */
  findById: async (vehicleId) => {
    const result = await db.query(
      'SELECT * FROM vehicles WHERE vehicle_id = $1',
      [vehicleId]
    );
    return result.rows[0] || null;
  },

  /**
   * Update a vehicle's GPS coordinates.
   * Also appends to location_history for breadcrumb trail.
   */
  updateLocation: async (vehicleId, latitude, longitude) => {
    // Update current position
    await db.query(
      `UPDATE vehicles
       SET current_latitude = $1, current_longitude = $2, last_updated = NOW()
       WHERE vehicle_id = $3`,
      [latitude, longitude, vehicleId]
    );

    // Record in history
    await db.query(
      `INSERT INTO location_history (vehicle_id, latitude, longitude)
       VALUES ($1, $2, $3)`,
      [vehicleId, latitude, longitude]
    );
  },

  /** Update a vehicle's dispatch status */
  updateStatus: async (vehicleId, status, assignedIncident = null) => {
    const result = await db.query(
      `UPDATE vehicles
       SET status = $1, assigned_incident = $2, last_updated = NOW()
       WHERE vehicle_id = $3
       RETURNING *`,
      [status, assignedIncident, vehicleId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find the nearest available vehicle of a given service type.
   * Uses the Haversine formula to compute approximate great-circle distance.
   *
   * @param {number} lat          Target latitude
   * @param {number} lng          Target longitude
   * @param {string} serviceType  'fire' | 'ambulance' | 'police' | 'rescue'
   */
  findNearestAvailable: async (lat, lng, serviceType) => {
    const result = await db.query(
      `SELECT *,
         (6371 * acos(
           cos(radians($1)) * cos(radians(current_latitude)) *
           cos(radians(current_longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(current_latitude))
         )) AS distance_km
       FROM vehicles
       WHERE service_type = $3
         AND status = 'available'
         AND current_latitude IS NOT NULL
       ORDER BY distance_km ASC
       LIMIT 1`,
      [lat, lng, serviceType]
    );
    return result.rows[0] || null;
  },
};

module.exports = VehicleModel;
