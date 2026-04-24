/**
 * @file routes/brands.js
 * @summary Brand listing, details, follow toggle, analytics.
 * @models Brand, Follow, Drop
 * @endpoints GET /api/brands, GET /api/brands/:id, POST /api/brands,
 *            PUT /api/brands/:id/follow, GET /api/brands/:id/analytics
 * @dependencies lib/prisma, middleware/auth, middleware/roleCheck
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { recordActivity } = require('../middleware/activityLogger');
const { requireRole } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { brandIdParamSchema, createBrandSchema } = require('../utils/schemas');

const router = express.Router();

// ─── GET /api/brands ──────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const brands = await prisma.brand.findMany({
      include: { _count: { select: { drops: true, followers: true } } },
      orderBy: { name: 'asc' },
    });

    // Add isFollowing flag if user is logged in.
    if (req.user) {
      const follows = await prisma.follow.findMany({
        where: { userId: req.user.id },
        select: { brandId: true },
      });
      const followedIds = new Set(follows.map((f) => f.brandId));
      const enriched = brands.map((b) => ({ ...b, isFollowing: followedIds.has(b.id) }));
      return sendSuccess(res, 'Brands retrieved successfully', enriched);
    }

    return sendSuccess(
      res,
      'Brands retrieved successfully',
      brands.map((b) => ({ ...b, isFollowing: false })),
    );
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/brands/:id ─────────────────────────────────────────
router.get('/:id', optionalAuth, validate(brandIdParamSchema), async (req, res, next) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id },
      include: {
        drops: {
          orderBy: { dropTime: 'asc' },
          include: { _count: { select: { comments: true, likes: true, saves: true, entries: true } } },
        },
        _count: { select: { followers: true, drops: true } },
      },
    });

    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    // Check follow status for authenticated users.
    let isFollowing = false;
    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: { userId_brandId: { userId: req.user.id, brandId: brand.id } },
      });
      isFollowing = !!follow;
    }

    return sendSuccess(res, 'Brand retrieved successfully', { ...brand, isFollowing });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/brands ─────────────────────────────────────────────
router.post('/', requireAuth, validate(createBrandSchema), async (req, res, next) => {
  try {
    const { name, logo, website } = req.body;

    // Find-or-create: if the brand already exists by name, return it.
    let brand = await prisma.brand.findUnique({ where: { name } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { name, logo, website: website || null } });
    }

    await recordActivity({
      action: 'create_brand',
      entity: 'brand',
      entityId: brand.id,
      userId: req.user.id,
      metadata: {
        name: brand.name,
      },
    });

    return sendSuccess(res, 'Brand created successfully', brand, 201);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/brands/:id/follow ───────────────────────────────────
router.put('/:id/follow', requireAuth, validate(brandIdParamSchema), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const brandId = req.params.id;

    // Step 1: Ensure the brand exists.
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    // Step 2: Toggle the follow.
    const existing = await prisma.follow.findUnique({
      where: { userId_brandId: { userId, brandId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
    } else {
      await prisma.follow.create({ data: { userId, brandId } });
    }

    const followerCount = await prisma.follow.count({ where: { brandId } });

    await recordActivity({
      action: existing ? 'unfollow_brand' : 'follow_brand',
      entity: 'brand',
      entityId: brandId,
      userId,
      metadata: {
        followers: followerCount,
      },
    });

    return sendSuccess(res, existing ? 'Unfollowed brand' : 'Following brand', {
      following: !existing,
      followers: followerCount,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/brands/:id/analytics ────────────────────────────────
router.get('/:id/analytics', requireAuth, requireRole('brand'), validate(brandIdParamSchema), async (req, res, next) => {
  try {
    // Step 1: Fetch all drops for this brand.
    const drops = await prisma.drop.findMany({
      where: { brandId: req.params.id },
      include: {
        _count: { select: { likes: true, comments: true, saves: true, entries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Step 2: Aggregate totals.
    const totals = drops.reduce(
      (acc, drop) => ({
        totalViews:    acc.totalViews    + drop.views,
        totalLikes:    acc.totalLikes    + drop._count.likes,
        totalComments: acc.totalComments + drop._count.comments,
        totalSaves:    acc.totalSaves    + drop._count.saves,
        totalEntries:  acc.totalEntries  + drop._count.entries,
      }),
      { totalViews: 0, totalLikes: 0, totalComments: 0, totalSaves: 0, totalEntries: 0 },
    );

    const followerCount = await prisma.follow.count({ where: { brandId: req.params.id } });

    // Step 3: Per-drop breakdown.
    const dropStats = drops.map((d) => ({
      id: d.id,
      title: d.title,
      imageUrl: d.imageUrl,
      category: d.category,
      hypeScore: d.hypeScore,
      accessType: d.accessType,
      dropTime: d.dropTime,
      views: d.views,
      likes: d._count.likes,
      comments: d._count.comments,
      saves: d._count.saves,
      entries: d._count.entries,
    }));

    return sendSuccess(res, 'Analytics retrieved successfully', {
      brandId: req.params.id,
      followers: followerCount,
      totalDrops: drops.length,
      ...totals,
      drops: dropStats,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
