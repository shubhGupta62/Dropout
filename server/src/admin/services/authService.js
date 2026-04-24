/**
 * admin/services/authService.js — Admin authentication business logic.
 *
 * Validates credentials, enforces admin role, issues JWT, logs activity.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');
const ApiError = require('../../utils/ApiError');
const { recordActivity } = require('../../middleware/activityLogger');
const { ADMIN_ROLES } = require('../../middleware/admin');

const JWT_SECRET = process.env.JWT_SECRET || 'dropspace-secret-key-change-in-production';

/**
 * Authenticate an admin user and return a signed JWT.
 *
 * @param {string} email
 * @param {string} password
 * @param {{ ip: string, userAgent: string }} meta — request metadata for logging
 * @returns {{ token: string, admin: object }}
 */
async function loginAdmin(email, password, meta = {}) {
  // Step 1: Find user by email.
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Step 2: Verify password.
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Step 3: Ensure admin role.
  if (!ADMIN_ROLES.includes(user.role)) {
    throw ApiError.forbidden('Admin access required — insufficient privileges');
  }

  // Step 4: Check ban status.
  if (user.isBanned) {
    throw ApiError.forbidden('Account is banned');
  }

  // Step 5: Issue JWT.
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' },
  );

  // Step 6: Update last login.
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Step 7: Log the admin login activity.
  await recordActivity({
    action: 'admin_login',
    entity: 'user',
    entityId: user.id,
    userId: user.id,
    metadata: {
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  return {
    token,
    admin: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || null,
    },
  };
}

/**
 * Get admin profile by ID (for the /me endpoint).
 */
async function getAdminProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('Admin not found');
  }

  return user;
}

module.exports = { loginAdmin, getAdminProfile };
