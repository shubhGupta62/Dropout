/**
 * middleware/admin.js — Admin authorization middleware.
 *
 * Two levels:
 *   • requireAdmin      — allows 'admin' OR 'super_admin'
 *   • requireSuperAdmin — allows only 'super_admin'
 *
 * Must be placed AFTER requireAuth in the middleware chain.
 */

const ApiError = require('../utils/ApiError');

const ADMIN_ROLES = ['admin', 'super_admin'];

/**
 * requireAdmin — block the request unless the user is an admin or super_admin.
 */
function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!ADMIN_ROLES.includes(req.user.role)) {
    return next(ApiError.forbidden('Admin access required'));
  }

  return next();
}

/**
 * requireSuperAdmin — block the request unless the user is a super_admin.
 * Used for sensitive operations like role changes and audit log access.
 */
function requireSuperAdmin(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (req.user.role !== 'super_admin') {
    return next(ApiError.forbidden('Super admin access required'));
  }

  return next();
}

module.exports = { requireAdmin, requireSuperAdmin, ADMIN_ROLES };
