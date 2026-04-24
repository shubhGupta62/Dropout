/**
 * roleCheck.js — Role-based authorization middleware.
 *
 * Usage:
 *   // Allow only brand accounts:
 *   router.post('/drops', requireAuth, requireRole('brand'), handler);
 *
 *   // Allow both admin and brand:
 *   router.delete('/drops/:id', requireAuth, requireRole('admin', 'brand'), handler);
 *
 * IMPORTANT: Must be placed AFTER requireAuth in the middleware chain,
 * because it reads `req.user.role` which requireAuth sets.
 */

const ApiError = require('../utils/ApiError');

/**
 * Factory that returns middleware enforcing one or more allowed roles.
 *
 * @param  {...string} allowedRoles — role values that are permitted (e.g. 'brand', 'admin')
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    // Step 1: Defensive check — requireAuth should have run first.
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // Step 2: Check if the user's role is in the allowed list.
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      ));
    }

    // Step 3: User has the right role — continue.
    next();
  };
}

module.exports = { requireRole };
