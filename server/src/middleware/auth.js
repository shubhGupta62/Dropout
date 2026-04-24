/**
 * middleware/auth.js — JWT authentication middleware.
 *
 * Two flavors:
 *   • requireAuth  — blocks the request if there is no valid JWT.
 *   • optionalAuth — attaches the user if a valid JWT is present, continues regardless.
 *
 * Both look up the user in the database to ensure the account still exists,
 * and attach { id, email, name, role } to req.user.
 */

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const JWT_SECRET = process.env.JWT_SECRET || 'dropspace-secret-key-change-in-production';

/**
 * requireAuth — block the request if no valid JWT token is present.
 * Throws ApiError.unauthorized() which the global error handler catches.
 */
async function requireAuth(req, _res, next) {
  try {
    // Step 1: Extract the Authorization header.
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required — no token provided');
    }

    // Step 2: Verify the token signature and expiration.
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw ApiError.unauthorized('Invalid or expired token');
    }

    // Step 3: Look up the user — the account may have been deleted since the token was issued.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, isBanned: true },
    });

    if (!user) {
      throw ApiError.unauthorized('Account no longer exists');
    }

    if (user.isBanned) {
      throw ApiError.forbidden('Account is banned');
    }

    // Step 4: Attach user to request and continue.
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * optionalAuth — attach the user if a valid JWT is present.
 * If no token or an invalid token is provided, req.user is set to null
 * and the request continues without error.
 */
async function optionalAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, isBanned: true },
    });

    req.user = user && !user.isBanned ? user : null;
    next();
  } catch {
    // Invalid token is fine for optional auth — just proceed unauthenticated.
    req.user = null;
    next();
  }
}

module.exports = { requireAuth, optionalAuth };
