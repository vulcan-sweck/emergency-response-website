/**
 * Vehicle Controller — Dispatch Service
 * Handles REST operations for vehicle registration and location queries.
 */

const VehicleModel = require('../models/vehicleModel');

const VehicleController = {

  /**
   * POST /vehicles/register
   * Registers a new emergency vehicle.
   * Body: { vehicleId, name, serviceType }
   */
  register: async (req, res, next) => {
    try {
      const { vehicleId, name, serviceType } = req.body;

      if (!vehicleId || !name || !serviceType) {
        return res.status(400).json({ error: 'vehicleId, name, and serviceType are required.' });
      }

      const VALID_TYPES = ['fire', 'ambulance', 'police', 'rescue'];
      if (!VALID_TYPES.includes(serviceType)) {
        return res.status(400).json({ error: `serviceType must be one of: ${VALID_TYPES.join(', ')}` });
      }

      const vehicle = await VehicleModel.register({ vehicleId, name, serviceType });
      return res.status(201).json({ message: 'Vehicle registered.', vehicle });
    } catch (err) {
      // Handle duplicate vehicle_id gracefully
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Vehicle ID already exists.' });
      }
      next(err);
    }
  },

  /**
   * GET /vehicles
   * Returns all vehicles, optionally filtered by service type.
   * Query: ?serviceType=fire
   */
  getAllVehicles: async (req, res, next) => {
    try {
      const { serviceType } = req.query;
      const vehicles = serviceType
        ? await VehicleModel.findByType(serviceType)
        : await VehicleModel.findAll();

      return res.json({ vehicles });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /vehicles/:id/location
   * Returns the current GPS location and status of a specific vehicle.
   */
  getLocation: async (req, res, next) => {
    try {
      const vehicle = await VehicleModel.findById(req.params.id);

      if (!vehicle) {
        return res.status(404).json({ error: 'Vehicle not found.' });
      }

      return res.json({
        vehicleId:  vehicle.vehicle_id,
        name:       vehicle.name,
        serviceType: vehicle.service_type,
        latitude:   vehicle.current_latitude,
        longitude:  vehicle.current_longitude,
        status:     vehicle.status,
        lastUpdated: vehicle.last_updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /vehicles/nearest
   * Finds the nearest available vehicle to a given coordinate.
   * Query: ?lat=5.6037&lng=-0.1870&serviceType=ambulance
   */
  findNearest: async (req, res, next) => {
    try {
      const { lat, lng, serviceType } = req.query;

      if (!lat || !lng || !serviceType) {
        return res.status(400).json({ error: 'lat, lng, and serviceType query params are required.' });
      }

      const vehicle = await VehicleModel.findNearestAvailable(
        parseFloat(lat),
        parseFloat(lng),
        serviceType
      );

      if (!vehicle) {
        return res.status(404).json({ error: 'No available vehicles of this type nearby.' });
      }

      return res.json({ vehicle });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = VehicleController;
