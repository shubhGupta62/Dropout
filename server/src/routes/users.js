/**
 * @file routes/users.js
 * @summary User profiles, search, save drops.
 * @models User, SavedDrop, Brand
 * @endpoints GET /api/users/search, GET /api/users/:id, PUT /api/users/:id,
 *            PUT /api/users/:userId/save/:dropId, GET /api/users/:id/saved
 * @dependencies lib/prisma, middleware/auth, utils/hypeScore
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { recordActivity } = require('../middleware/activityLogger');
const { validate } = require('../middleware/validate');
const { recalculateHypeScore } = require('../utils/hypeScore');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const {
  userIdParamSchema,
  updateUserSchema,
  searchUsersSchema,
  saveDropParamsSchema,
} = require('../utils/schemas');

const router = express.Router();

// ─── GET /api/users/search?q=... ──────────────────────────────────
router.get('/search', validate(searchUsersSchema), async (req, res, next) => {
  try {
    const { q } = req.query;
    const searchTerm = q.trim();

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: searchTerm, mode: 'insensitive' } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, name: true, username: true, avatar: true, bio: true, role: true,
        _count: { select: { likes: true, follows: true } },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    // For brand users, look up their associated brand ID.
    const enriched = await Promise.all(
      users.map(async (u) => {
        if (u.role === 'brand') {
          const brand = await prisma.brand.findFirst({
            where: { name: u.name },
            select: { id: true },
          });
          return { ...u, brandId: brand?.id || null };
        }
        return u;
      }),
    );

    return sendSuccess(res, 'Search results retrieved', enriched);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/users/:id ──────────────────────────────────────────
router.get('/:id', validate(userIdParamSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, role: true, avatar: true, bio: true,
        username: true, website: true, instagramHandle: true, location: true,
        createdAt: true,
        _count: { select: { comments: true, savedDrops: true, likes: true, follows: true } },
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

// ─── PUT /api/users/:id ──────────────────────────────────────────
router.put('/:id', requireAuth, validate(updateUserSchema), async (req, res, next) => {
  try {
    // Ownership check — users can only update their own profile.
    if (req.user.id !== req.params.id) {
      throw ApiError.forbidden('You can only update your own profile');
    }

    const { name, bio, avatar, username, website, instagramHandle, location } = req.body;

    // Build update data from only the fields that were provided.
    const data = {};
    if (name !== undefined)            data.name = name;
    if (bio !== undefined)             data.bio = bio;
    if (avatar !== undefined)          data.avatar = avatar;
    if (username !== undefined)        data.username = username;
    if (website !== undefined)         data.website = website;
    if (instagramHandle !== undefined) data.instagramHandle = instagramHandle;
    if (location !== undefined)        data.location = location;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, email: true, name: true, role: true, avatar: true, bio: true,
        username: true, website: true, instagramHandle: true, location: true,
        createdAt: true,
        _count: { select: { comments: true, savedDrops: true, likes: true, follows: true } },
      },
    });

    await recordActivity({
      action: 'update_profile',
      entity: 'user',
      entityId: req.params.id,
      userId: req.user.id,
      metadata: {
        fields: Object.keys(data),
      },
    });

    return sendSuccess(res, 'Profile updated successfully', user);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/users/:userId/save/:dropId ──────────────────────────
router.put('/:userId/save/:dropId', requireAuth, validate(saveDropParamsSchema), async (req, res, next) => {
  try {
    const { userId, dropId } = req.params;

    // Ownership check — users can only save drops for themselves.
    if (req.user.id !== userId) {
      throw ApiError.forbidden('You can only save drops for yourself');
    }

    const existing = await prisma.savedDrop.findUnique({
      where: { userId_dropId: { userId, dropId } },
    });

    if (existing) {
      await prisma.savedDrop.delete({ where: { id: existing.id } });
      await recalculateHypeScore(dropId);
      await recordActivity({
        action: 'unsave_drop',
        entity: 'drop',
        entityId: dropId,
        userId,
      });
      return sendSuccess(res, 'Drop unsaved', { saved: false });
    }

    await prisma.savedDrop.create({ data: { userId, dropId } });
    await recalculateHypeScore(dropId);
    await recordActivity({
      action: 'save_drop',
      entity: 'drop',
      entityId: dropId,
      userId,
    });

    return sendSuccess(res, 'Drop saved', { saved: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/users/:id/saved ─────────────────────────────────────
router.get('/:id/saved', validate(userIdParamSchema), async (req, res, next) => {
  try {
    const saves = await prisma.savedDrop.findMany({
      where: { userId: req.params.id },
      include: {
        drop: {
          include: {
            brand: true,
            _count: { select: { likes: true, comments: true, saves: true, entries: true } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    return sendSuccess(res, 'Saved drops retrieved', saves.map((s) => s.drop));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
