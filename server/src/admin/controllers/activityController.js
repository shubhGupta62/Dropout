const { sendSuccess } = require('../../utils/response');
const activityService = require('../services/activityService');

async function listActivity(req, res, next) {
  try {
    const data = await activityService.findLogs(req.query || {});
    return sendSuccess(res, 'Activity logs retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function listRecentActivity(_req, res, next) {
  try {
    const logs = await activityService.getRecentLogs(50);
    return sendSuccess(res, 'Recent activity retrieved successfully', logs);
  } catch (err) {
    return next(err);
  }
}

async function listActivityTypes(_req, res, next) {
  try {
    const actions = await activityService.getActionTypes();
    return sendSuccess(res, 'Activity action types retrieved successfully', actions);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listActivity,
  listRecentActivity,
  listActivityTypes,
};
