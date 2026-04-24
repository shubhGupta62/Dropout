/**
 * admin/controllers/authController.js — Admin login controller.
 *
 * Handles POST /api/admin/login
 * Delegates to authService, returns JWT + admin info.
 */

const authService = require('../services/authService');
const { sendSuccess } = require('../../utils/response');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginAdmin(email, password, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    return sendSuccess(res, 'Admin login successful', result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const admin = await authService.getAdminProfile(req.user.id);
    return sendSuccess(res, 'Admin profile retrieved', admin);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
