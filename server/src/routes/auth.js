/**
 * @file routes/auth.js
 * @summary Authentication endpoints (signup, login, me).
 * @models User
 * @endpoints POST /api/auth/signup, POST /api/auth/login, GET /api/auth/me
 * @dependencies lib/prisma, middleware/auth, bcryptjs, jsonwebtoken
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { recordActivity } = require('../middleware/activityLogger');
const { signupSchema, loginSchema } = require('../utils/schemas');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dropspace-secret-key-change-in-production';

/**
 * Build a URL-safe username from the user's display name.
 * Strips non-alphanumeric characters as a sanitization measure.
 */
function buildUsername(name, email) {
  const namePart = (name || email || 'dropout-user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
  return namePart || 'dropoutuser';
}

/**
 * Shape the user object for the client — never expose the password hash.
 */
function safeUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || null,
    username: user.username || null,
    website: user.website || null,
    instagramHandle: user.instagramHandle || null,
    location: user.location || null,
  };
}

// ─── POST /api/auth/signup ─────────────────────────────────────────
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;

    // Step 1: Check if the email is already registered.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }

    // Step 2: Hash the password (cost factor 10).
    const hashedPassword = await bcrypt.hash(password, 10);

    // Step 3: Create the user.
    const userRole = role === 'brand' ? 'brand' : 'user';
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: userRole,
        username: buildUsername(name, email),
      },
    });

    await recordActivity({
      action: 'signup',
      entity: 'user',
      entityId: user.id,
      userId: user.id,
      metadata: {
        role: user.role,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Step 4: Issue a JWT.
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    // Step 5: Return token + safe user payload.
    return sendSuccess(res, 'Account created successfully', {
      token,
      user: safeUserPayload(user),
    }, 201);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find the user by email.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Deliberately vague — don't reveal whether the email exists.
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Step 2: Compare the plaintext password against the hash.
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.isBanned) {
      throw ApiError.forbidden('Account is banned');
    }

    // Step 3: Issue a JWT.
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await recordActivity({
      action: 'login',
      entity: 'user',
      entityId: user.id,
      userId: user.id,
      metadata: {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return sendSuccess(res, 'Logged in successfully', {
      token,
      user: safeUserPayload(updatedUser),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    // req.user is already authenticated by requireAuth.
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true, role: true,
        avatar: true, bio: true, username: true,
        website: true, instagramHandle: true, location: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return sendSuccess(res, 'User retrieved successfully', user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
