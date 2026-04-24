const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/response');
const actionService = require('../services/actionService');

async function listDrops(req, res, next) {
  try {
    const data = await actionService.findDrops(req.query || {});
    return sendSuccess(res, 'Drops retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function deleteDrop(req, res, next) {
  try {
    const deletedDrop = await actionService.deleteDrop(
      req.params.id,
      req.user.id,
      req.body?.reason
    );

    if (!deletedDrop) {
      throw ApiError.notFound('Drop not found');
    }

    return sendSuccess(res, 'Drop deleted successfully', deletedDrop);
  } catch (err) {
    return next(err);
  }
}

async function listAdminActions(req, res, next) {
  try {
    const data = await actionService.findAdminActions(req.query || {});
    return sendSuccess(res, 'Admin actions retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function listFlags(req, res, next) {
  try {
    const data = await actionService.findFlags(req.query || {});
    return sendSuccess(res, 'Content flags retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function createFlag(req, res, next) {
  try {
    const flag = await actionService.createFlag({
      ...req.body,
      flaggedById: req.user.id,
    });
    return sendSuccess(res, 'Content flagged successfully', flag, 201);
  } catch (err) {
    return next(err);
  }
}

async function reviewFlag(req, res, next) {
  try {
    const flag = await actionService.reviewFlag({
      id: req.params.id,
      status: req.body.status,
      notes: req.body.notes,
      reviewedById: req.user.id,
    });

    if (!flag) {
      throw ApiError.notFound('Content flag not found');
    }

    return sendSuccess(res, 'Content flag reviewed successfully', flag);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listDrops,
  deleteDrop,
  listAdminActions,
  listFlags,
  createFlag,
  reviewFlag,
};
