/**
 * Analytics Routes — Analytics Service
 */

const express               = require('express');
const AnalyticsController   = require('../controllers/analyticsController');
const { authenticate }      = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/response-times',       AnalyticsController.getResponseTimes);
router.get('/incidents-by-region',  AnalyticsController.getIncidentsByRegion);
router.get('/resource-utilization', AnalyticsController.getResourceUtilization);

module.exports = router;
