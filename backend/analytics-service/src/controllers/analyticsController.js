/**
 * Analytics Controller — Analytics Service
 * Serves aggregated statistics for the admin dashboard.
 */

const AnalyticsModel = require('../models/analyticsModel');

const AnalyticsController = {

  /**
   * GET /analytics/response-times
   * Returns average response time per service type.
   * Query: ?days=30  (default 30)
   */
  getResponseTimes: async (req, res, next) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsModel.getResponseTimes(days);
      return res.json({ period_days: days, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /analytics/incidents-by-region
   * Returns incident count per region for map/bar charts.
   * Query: ?days=30
   */
  getIncidentsByRegion: async (req, res, next) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsModel.getIncidentsByRegion(days);
      return res.json({ period_days: days, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /analytics/resource-utilization
   * Returns how heavily each service type has been utilised.
   * Query: ?days=30
   */
  getResourceUtilization: async (req, res, next) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await AnalyticsModel.getResourceUtilization(days);
      return res.json({ period_days: days, data });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AnalyticsController;
