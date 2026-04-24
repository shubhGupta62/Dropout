/**
 * @file routes/drops.js
 * @summary Drop CRUD, likes, comments, views, raffle entry.
 * @models Drop, Like, Comment, SavedDrop, DropEntry, Follow
 * @endpoints GET /api/drops, GET /api/drops/trending, GET /api/drops/:id,
 *            POST /api/drops, PUT /api/drops/:id/like, PUT /api/drops/:id/unlike,
 *            POST /api/drops/:id/comments, PUT /api/drops/:id/view, POST /api/drops/:id/enter
 * @dependencies lib/prisma, middleware/auth, utils/hypeScore
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { recordActivity } = require('../middleware/activityLogger');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { recalculateHypeScore } = require('../utils/hypeScore');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const {
  listDropsSchema,
  dropIdParamSchema,
  createDropSchema,
  commentSchema,
} = require('../utils/schemas');

const router = express.Router();

// ─── Helpers ───────────────────────────────────────────────────────

/** Standard Prisma include for drop list queries. */
function dropInclude() {
  return {
    brand: { include: { _count: { select: { followers: true } } } },
    _count: { select: { comments: true, saves: true, likes: true, entries: true } },
  };
}

/**
 * Batch-enrich a list of drops with user interaction flags.
 * Uses 4 queries total instead of 4×N (fixes N+1 problem).
 */
async function batchEnrichDrops(drops, userId) {
  if (!userId || drops.length === 0) {
    return drops.map((d) => ({ ...d, isLiked: false, isSaved: false, isEntered: false, isFollowingBrand: false }));
  }

  const dropIds = drops.map((d) => d.id);
  const brandIds = [...new Set(drops.map((d) => d.brandId))];

  const [likes, saves, entries, follows] = await Promise.all([
    prisma.like.findMany({ where: { userId, dropId: { in: dropIds } }, select: { dropId: true } }),
    prisma.savedDrop.findMany({ where: { userId, dropId: { in: dropIds } }, select: { dropId: true } }),
    prisma.dropEntry.findMany({ where: { userId, dropId: { in: dropIds } }, select: { dropId: true } }),
    prisma.follow.findMany({ where: { userId, brandId: { in: brandIds } }, select: { brandId: true } }),
  ]);

  const likedSet = new Set(likes.map((l) => l.dropId));
  const savedSet = new Set(saves.map((s) => s.dropId));
  const enteredSet = new Set(entries.map((e) => e.dropId));
  const followedSet = new Set(follows.map((f) => f.brandId));

  return drops.map((d) => ({
    ...d,
    isLiked: likedSet.has(d.id),
    isSaved: savedSet.has(d.id),
    isEntered: enteredSet.has(d.id),
    isFollowingBrand: followedSet.has(d.brandId),
  }));
}

// ─── GET /api/drops ────────────────────────────────────────────────
router.get('/', optionalAuth, validate(listDropsSchema), async (req, res, next) => {
  try {
    const { category, featured, sort } = req.query || {};
    const where = {};
    if (category && category !== 'all') where.category = category;
    if (featured === 'true') where.featured = true;

    const orderBy =
      sort === 'hype'  ? { hypeScore: 'desc' } :
      sort === 'date'  ? { dropTime: 'asc' }   :
                         { createdAt: 'desc' };

    const drops = await prisma.drop.findMany({ where, orderBy, include: dropInclude() });
    const enriched = await batchEnrichDrops(drops, req.user?.id);

    return sendSuccess(res, 'Drops retrieved successfully', enriched);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/drops/trending ───────────────────────────────────────
router.get('/trending', optionalAuth, async (req, res, next) => {
  try {
    const drops = await prisma.drop.findMany({
      orderBy: { hypeScore: 'desc' },
      take: 10,
      include: dropInclude(),
    });

    const enriched = await batchEnrichDrops(drops, req.user?.id);

    return sendSuccess(res, 'Trending drops retrieved successfully', enriched);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/drops/:id ───────────────────────────────────────────
router.get('/:id', optionalAuth, validate(dropIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    const drop = await prisma.drop.findUnique({
      where: { id },
      include: {
        brand: { include: { _count: { select: { followers: true } } } },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: { select: { comments: true, saves: true, likes: true, entries: true } },
      },
    });

    if (!drop) {
      throw ApiError.notFound('Drop not found');
    }

    const [enriched] = await batchEnrichDrops([drop], req.user?.id);

    return sendSuccess(res, 'Drop retrieved successfully', enriched);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/drops ──────────────────────────────────────────────
router.post('/', requireAuth, requireRole('brand'), validate(createDropSchema), async (req, res, next) => {
  try {
    const {
      title, description, imageUrl, price, category,
      dropTime, featured, website, brandId, accessType, maxQuantity,
    } = req.body;

    const drop = await prisma.drop.create({
      data: {
        title,
        description,
        imageUrl,
        price,
        category,
        hypeScore: 0,
        dropTime: new Date(dropTime),
        featured: featured || false,
        website: website || null,
        brandId,
        accessType: accessType || 'open',
        maxQuantity: maxQuantity ? parseInt(maxQuantity, 10) : null,
      },
      include: { brand: true },
    });

    await recordActivity({
      action: 'create_drop',
      entity: 'drop',
      entityId: drop.id,
      userId: req.user.id,
      metadata: {
        title: drop.title,
        category: drop.category,
        brandId: drop.brandId,
      },
    });

    return sendSuccess(res, 'Drop created successfully', drop, 201);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/drops/:id/like ──────────────────────────────────────
router.put('/:id/like', requireAuth, validate(dropIdParamSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dropId = req.params.id;

    const existing = await prisma.like.findUnique({
      where: { userId_dropId: { userId, dropId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({ data: { userId, dropId } });
    }

    const newScore = await recalculateHypeScore(dropId);
    const likeCount = await prisma.like.count({ where: { dropId } });

    await recordActivity({
      action: existing ? 'unlike_drop' : 'like_drop',
      entity: 'drop',
      entityId: dropId,
      userId,
      metadata: {
        likes: likeCount,
        hypeScore: newScore,
      },
    });

    return sendSuccess(res, existing ? 'Drop unliked' : 'Drop liked', {
      liked: !existing,
      likes: likeCount,
      hypeScore: newScore,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/drops/:id/unlike (backward compat) ──────────────────
router.put('/:id/unlike', requireAuth, validate(dropIdParamSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dropId = req.params.id;

    const existing = await prisma.like.findUnique({
      where: { userId_dropId: { userId, dropId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    }

    const newScore = await recalculateHypeScore(dropId);
    const likeCount = await prisma.like.count({ where: { dropId } });

    return sendSuccess(res, 'Drop unliked', {
      liked: false,
      likes: likeCount,
      hypeScore: newScore,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/drops/:id/comments ─────────────────────────────────
router.post('/:id/comments', requireAuth, validate(commentSchema), async (req, res, next) => {
  try {
    const { text } = req.body;
    const dropId = req.params.id;

    const comment = await prisma.comment.create({
      data: { text: text.trim(), userId: req.user.id, dropId },
      include: { user: true },
    });

    await recalculateHypeScore(dropId);

    await recordActivity({
      action: 'comment_drop',
      entity: 'comment',
      entityId: comment.id,
      userId: req.user.id,
      metadata: {
        dropId,
      },
    });

    return sendSuccess(res, 'Comment added successfully', comment, 201);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/drops/:id/view ──────────────────────────────────────
router.put('/:id/view', validate(dropIdParamSchema), async (req, res, next) => {
  try {
    const drop = await prisma.drop.update({
      where: { id: req.params.id },
      data: { views: { increment: 1 } },
    });

    await recalculateHypeScore(req.params.id);

    if (req.user?.id) {
      await recordActivity({
        action: 'view_drop',
        entity: 'drop',
        entityId: req.params.id,
        userId: req.user.id,
        metadata: {
          views: drop.views,
        },
      });
    }

    return sendSuccess(res, 'View recorded', { views: drop.views });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/drops/:id/enter ────────────────────────────────────
router.post('/:id/enter', requireAuth, validate(dropIdParamSchema), async (req, res, next) => {
  try {
    const dropId = req.params.id;
    const userId = req.user.id;

    // Step 1: Fetch the drop to check access rules.
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      select: { accessType: true, maxQuantity: true, _count: { select: { entries: true } } },
    });

    if (!drop) {
      throw ApiError.notFound('Drop not found');
    }

    // Step 2: Enforce access-type restrictions.
    if (drop.accessType === 'open') {
      throw ApiError.badRequest('This is an open drop — no entry needed');
    }
    if (drop.accessType === 'invite') {
      throw ApiError.forbidden('This drop is invite-only');
    }

    // Step 3: Check if already entered.
    const existing = await prisma.dropEntry.findUnique({
      where: { userId_dropId: { userId, dropId } },
    });
    if (existing) {
      return sendSuccess(res, 'Already entered', { entered: true, status: existing.status });
    }

    // Step 4: Check capacity.
    if (drop.maxQuantity && drop._count.entries >= drop.maxQuantity) {
      throw ApiError.badRequest('This drop is full');
    }

    // Step 5: Create the entry.
    const entry = await prisma.dropEntry.create({ data: { userId, dropId } });
    await recalculateHypeScore(dropId);

    await recordActivity({
      action: 'enter_drop',
      entity: 'drop_entry',
      entityId: entry.id,
      userId,
      metadata: {
        dropId,
        status: entry.status,
      },
    });

    return sendSuccess(res, 'Successfully entered drop', {
      entered: true,
      status: entry.status,
      entryId: entry.id,
    }, 201);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
