const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/response');
const userService = require('../services/userService');

async function listUsers(req, res, next) {
  try {
    const data = await userService.findUsers(req.query || {});
    return sendSuccess(res, 'Users retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const data = await userService.findUserById(req.params.id);
    if (!data.user) {
      throw ApiError.notFound('User not found');
    }
    return sendSuccess(res, 'User retrieved successfully', data);
  } catch (err) {
    return next(err);
  }
}

async function toggleBan(req, res, next) {
  try {
    const user = await userService.toggleBan(
      req.params.id,
      req.body.banned,
      req.body.reason,
      req.user.id
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return sendSuccess(
      res,
      req.body.banned ? 'User banned successfully' : 'User unbanned successfully',
      user
    );
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const deletedUser = await userService.deleteUser(req.params.id, req.user.id);
    if (!deletedUser) {
      throw ApiError.notFound('User not found');
    }
    return sendSuccess(res, 'User deleted successfully', deletedUser);
  } catch (err) {
    return next(err);
  }
}

async function changeRole(req, res, next) {
  try {
    const user = await userService.changeRole(req.params.id, req.body.role, req.user.id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return sendSuccess(res, 'User role updated successfully', user);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsers,
  getUser,
  toggleBan,
  deleteUser,
  changeRole,
};
