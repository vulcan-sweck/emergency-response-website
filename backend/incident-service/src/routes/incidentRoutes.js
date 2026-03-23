/**
 * Incident Routes — Incident Service
 * Maps HTTP verbs + paths to controller methods.
 * All routes require a valid JWT access token.
 */

const express              = require('express');
const IncidentController   = require('../controllers/incidentController');
const { authenticate }     = require('../middleware/authMiddleware');

const router = express.Router();

// All incident routes require authentication
router.use(authenticate);

// Create a new incident
router.post('/',                IncidentController.createIncident);

// Get all open (non-resolved) incidents — must come BEFORE /:id to avoid conflict
router.get('/open',             IncidentController.getOpenIncidents);

// Get a single incident by ID
router.get('/:id',              IncidentController.getIncident);

// Update incident lifecycle status
router.put('/:id/status',       IncidentController.updateStatus);

// Assign a vehicle unit to an incident
router.put('/:id/assign',       IncidentController.assignUnit);

module.exports = router;
