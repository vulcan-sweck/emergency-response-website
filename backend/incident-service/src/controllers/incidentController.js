/**
 * Incident Controller — Incident Service
 * Business logic for all /incidents endpoints.
 */

const IncidentModel = require('../models/incidentModel');
const { publish }   = require('../services/rabbitPublisher');

const IncidentController = {

  /**
   * POST /incidents
   * Creates a new emergency incident.
   * Body: { citizenName, incidentType, latitude, longitude, notes, region }
   */
  createIncident: async (req, res, next) => {
    try {
      const { citizenName, incidentType, latitude, longitude, notes, region } = req.body;

      if (!citizenName || !incidentType || latitude == null || longitude == null) {
        return res.status(400).json({ error: 'citizenName, incidentType, latitude, longitude are required.' });
      }

      const incident = await IncidentModel.create({
        citizenName,
        incidentType,
        latitude,
        longitude,
        notes,
        createdByAdmin: req.user.userId,
        region: region || 'Unknown',
      });

      // Notify other services via RabbitMQ
      publish('incident.created', { incidentId: incident.incident_id, incidentType, latitude, longitude });

      return res.status(201).json({ message: 'Incident created.', incident });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /incidents/:id
   * Returns a single incident by ID.
   */
  getIncident: async (req, res, next) => {
    try {
      const incident = await IncidentModel.findById(req.params.id);
      if (!incident) return res.status(404).json({ error: 'Incident not found.' });
      return res.json({ incident });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /incidents/open
   * Returns all active (non-resolved) incidents.
   */
  getOpenIncidents: async (req, res, next) => {
    try {
      const incidents = await IncidentModel.findOpen();
      return res.json({ incidents });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /incidents/:id/status
   * Updates the lifecycle status of an incident.
   * Body: { status } — one of: created, dispatched, in_progress, resolved
   */
  updateStatus: async (req, res, next) => {
    try {
      const { status } = req.body;
      const VALID = ['created', 'dispatched', 'in_progress', 'resolved'];

      if (!VALID.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${VALID.join(', ')}` });
      }

      const incident = await IncidentModel.updateStatus(req.params.id, status);
      if (!incident) return res.status(404).json({ error: 'Incident not found.' });

      // Publish status change event for analytics/dispatch services
      publish(`incident.${status}`, { incidentId: incident.incident_id, status });

      return res.json({ message: 'Status updated.', incident });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /incidents/:id/assign
   * Assigns a vehicle unit to an incident.
   * Body: { unitId }
   */
  assignUnit: async (req, res, next) => {
    try {
      const { unitId } = req.body;

      if (!unitId) {
        return res.status(400).json({ error: 'unitId is required.' });
      }

      const incident = await IncidentModel.assignUnit(req.params.id, unitId);
      if (!incident) return res.status(404).json({ error: 'Incident not found.' });

      publish('incident.dispatched', {
        incidentId: incident.incident_id,
        unitId,
        latitude:  incident.latitude,
        longitude: incident.longitude,
      });

      return res.json({ message: 'Unit assigned.', incident });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = IncidentController;
