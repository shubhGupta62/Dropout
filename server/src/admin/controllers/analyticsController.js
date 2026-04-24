const { sendSuccess } = require('../../utils/response');
const analyticsService = require('../services/analyticsService');

async function getStats(_req, res, next) {
  try {
    const stats = await analyticsService.getAdminStats();
    return sendSuccess(res, 'Admin stats retrieved successfully', stats);
  } catch (err) {
    return next(err);
  }
}

async function getOverview(_req, res, next) {
  try {
    const overview = await analyticsService.getPlatformOverview();
    return sendSuccess(res, 'Admin overview retrieved successfully', overview);
  } catch (err) {
    return next(err);
  }
}

async function getDailyAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getDailyGrowth(req.query.days);
    return sendSuccess(res, 'Admin analytics retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function getEngagement(_req, res, next) {
  try {
    const data = await analyticsService.getEngagementMetrics();
    return sendSuccess(res, 'Admin engagement metrics retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getStats,
  getOverview,
  getDailyAnalytics,
  getEngagement,
};
