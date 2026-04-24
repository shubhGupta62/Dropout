/**
 * @file routes/analytics.js
 * @summary Drop analytics: platform overview, per-drop deep dives,
 *          category breakdowns, trending insights, engagement timelines,
 *          and graph-aware entity context.
 * @models Drop, Like, Comment, SavedDrop, DropEntry, Follow, User, Brand
 * @endpoints GET /api/analytics/overview, GET /api/analytics/drops/top,
 *            GET /api/analytics/drops/:id, GET /api/analytics/categories,
 *            GET /api/analytics/trending, GET /api/analytics/users/me,
 *            GET /api/analytics/brands/:id, GET /api/analytics/graph/:entity
 * @dependencies lib/prisma, middleware/auth, graph/graphMemory
 */

const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const graphMemory = require('../graph/graphMemory');

const router = express.Router();

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Build a time-series histogram for a list of timestamped records.
 * Returns an array of { date, count } grouped by calendar date.
 */
function toTimeSeries(records, dateField = 'createdAt') {
  const buckets = {};
  for (const r of records) {
    const day = new Date(r[dateField]).toISOString().slice(0, 10);
    buckets[day] = (buckets[day] || 0) + 1;
  }
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

/**
 * Calculate engagement rate for a drop.
 * engagement = (likes + comments + saves + entries) / max(views, 1)
 */
function engagementRate(drop) {
  const interactions =
    drop._count.likes +
    drop._count.comments +
    drop._count.saves +
    drop._count.entries;
  return +(interactions / Math.max(drop.views, 1) * 100).toFixed(2);
}

// ═══════════════════════════════════════════════════════════════════
// 1. PLATFORM OVERVIEW
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/overview
 *
 * Returns platform-wide aggregate metrics.
 */
router.get('/overview', async (_req, res, next) => {
  try {
    const [
      totalDrops,
      totalUsers,
      totalBrands,
      totalLikes,
      totalComments,
      totalSaves,
      totalEntries,
      totalFollows,
    ] = await Promise.all([
      prisma.drop.count(),
      prisma.user.count(),
      prisma.brand.count(),
      prisma.like.count(),
      prisma.comment.count(),
      prisma.savedDrop.count(),
      prisma.dropEntry.count(),
      prisma.follow.count(),
    ]);

    const viewsAgg = await prisma.drop.aggregate({ _sum: { views: true } });

    return sendSuccess(res, 'Platform overview retrieved', {
      totalDrops,
      totalUsers,
      totalBrands,
      totalViews: viewsAgg._sum.views || 0,
      totalLikes,
      totalComments,
      totalSaves,
      totalEntries,
      totalFollows,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. DROPS — LEADERBOARD / RANKINGS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/drops/top
 *
 * Query params:
 *   ?sort=hype|likes|views|saves|comments|entries  (default: hype)
 *   ?limit=N  (default: 10, max: 50)
 */
router.get('/drops/top', async (req, res, next) => {
  try {
    const sortKey = req.query.sort || 'hype';
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    let orderBy;
    switch (sortKey) {
      case 'views': orderBy = { views: 'desc' }; break;
      case 'likes': orderBy = { likes: { _count: 'desc' } }; break;
      case 'saves': orderBy = { saves: { _count: 'desc' } }; break;
      case 'comments': orderBy = { comments: { _count: 'desc' } }; break;
      case 'entries': orderBy = { entries: { _count: 'desc' } }; break;
      default: orderBy = { hypeScore: 'desc' }; break;
    }

    const drops = await prisma.drop.findMany({
      orderBy,
      take: limit,
      include: {
        brand: { select: { id: true, name: true, logo: true } },
        _count: { select: { likes: true, comments: true, saves: true, entries: true } },
      },
    });

    const ranked = drops.map((d, i) => ({
      rank: i + 1,
      id: d.id,
      title: d.title,
      imageUrl: d.imageUrl,
      category: d.category,
      hypeScore: d.hypeScore,
      views: d.views,
      likes: d._count.likes,
      comments: d._count.comments,
      saves: d._count.saves,
      entries: d._count.entries,
      engagementRate: engagementRate(d),
      brand: d.brand,
      dropTime: d.dropTime,
    }));

    return sendSuccess(res, `Top ${limit} drops by ${sortKey}`, ranked);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. SINGLE DROP DEEP ANALYTICS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/drops/:id
 *
 * Full analytics for a single drop with engagement timeline,
 * funnel metrics, and graph context.
 */
router.get('/drops/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const drop = await prisma.drop.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
        likes: { select: { createdAt: true } },
        comments: { select: { createdAt: true, userId: true } },
        saves: { select: { userId: true } },
        entries: { select: { createdAt: true, status: true, userId: true } },
        _count: { select: { likes: true, comments: true, saves: true, entries: true } },
      },
    });

    if (!drop) {
      throw ApiError.notFound('Drop not found');
    }

    // ── Engagement timeline ──
    const likesTimeline = toTimeSeries(drop.likes);
    const commentsTimeline = toTimeSeries(drop.comments);
    const entriesTimeline = toTimeSeries(drop.entries);

    // ── Unique users who interacted ──
    const uniqueInteractors = new Set([
      ...drop.comments.map((c) => c.userId),
      ...drop.saves.map((s) => s.userId),
      ...drop.entries.map((e) => e.userId),
    ]);

    // ── Entry status breakdown ──
    const entryStatuses = {};
    for (const entry of drop.entries) {
      entryStatuses[entry.status] = (entryStatuses[entry.status] || 0) + 1;
    }

    // ── Funnel: views → likes → saves → entries ──
    const funnel = [
      { stage: 'views', count: drop.views },
      { stage: 'likes', count: drop._count.likes },
      { stage: 'saves', count: drop._count.saves },
      { stage: 'entries', count: drop._count.entries },
    ];

    // ── Graph context (neighbours from Graph Memory) ──
    const graphContext = graphMemory.getContext('drop');

    return sendSuccess(res, 'Drop analytics retrieved', {
      id: drop.id,
      title: drop.title,
      imageUrl: drop.imageUrl,
      category: drop.category,
      hypeScore: drop.hypeScore,
      accessType: drop.accessType,
      dropTime: drop.dropTime,
      brand: drop.brand,
      metrics: {
        views: drop.views,
        likes: drop._count.likes,
        comments: drop._count.comments,
        saves: drop._count.saves,
        entries: drop._count.entries,
        engagementRate: engagementRate(drop),
        uniqueInteractors: uniqueInteractors.size,
      },
      funnel,
      entryStatuses,
      timeline: {
        likes: likesTimeline,
        comments: commentsTimeline,
        entries: entriesTimeline,
      },
      graphContext,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. CATEGORY BREAKDOWN
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/categories
 *
 * Aggregate metrics per category.
 */
router.get('/categories', async (_req, res, next) => {
  try {
    const drops = await prisma.drop.findMany({
      select: {
        category: true,
        views: true,
        hypeScore: true,
        _count: { select: { likes: true, comments: true, saves: true, entries: true } },
      },
    });

    const cats = {};
    for (const d of drops) {
      if (!cats[d.category]) {
        cats[d.category] = {
          category: d.category,
          dropCount: 0,
          totalViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalSaves: 0,
          totalEntries: 0,
          avgHypeScore: 0,
          _hypeSum: 0,
        };
      }
      const c = cats[d.category];
      c.dropCount++;
      c.totalViews += d.views;
      c.totalLikes += d._count.likes;
      c.totalComments += d._count.comments;
      c.totalSaves += d._count.saves;
      c.totalEntries += d._count.entries;
      c._hypeSum += d.hypeScore;
    }

    const result = Object.values(cats)
      .map(({ _hypeSum, ...c }) => ({
        ...c,
        avgHypeScore: +((_hypeSum / c.dropCount) || 0).toFixed(1),
      }))
      .sort((a, b) => b.dropCount - a.dropCount);

    return sendSuccess(res, 'Category breakdown retrieved', result);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. TRENDING VELOCITY — fastest-growing drops by recent engagement
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/trending
 *
 * Query params:
 *   ?hours=N  (default: 24) — lookback window
 *   ?limit=N  (default: 10)
 */
router.get('/trending', async (req, res, next) => {
  try {
    const hours = parseInt(req.query.hours, 10) || 24;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Count recent likes, comments, and entries per drop within the window.
    const [recentLikes, recentComments, recentEntries] = await Promise.all([
      prisma.like.groupBy({
        by: ['dropId'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { dropId: 'desc' } },
        take: limit * 3,
      }),
      prisma.comment.groupBy({
        by: ['dropId'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { dropId: 'desc' } },
        take: limit * 3,
      }),
      prisma.dropEntry.groupBy({
        by: ['dropId'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { dropId: 'desc' } },
        take: limit * 3,
      }),
    ]);

    // Merge into a velocity score per drop.
    const velocity = {};
    for (const r of recentLikes) {
      velocity[r.dropId] = (velocity[r.dropId] || 0) + r._count * 2;
    }
    for (const r of recentComments) {
      velocity[r.dropId] = (velocity[r.dropId] || 0) + r._count * 4;
    }
    for (const r of recentEntries) {
      velocity[r.dropId] = (velocity[r.dropId] || 0) + r._count * 5;
    }

    const topIds = Object.entries(velocity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);

    if (topIds.length === 0) {
      return sendSuccess(res, 'No trending activity in window', []);
    }

    const drops = await prisma.drop.findMany({
      where: { id: { in: topIds } },
      include: {
        brand: { select: { id: true, name: true, logo: true } },
        _count: { select: { likes: true, comments: true, saves: true, entries: true } },
      },
    });

    const dropMap = Object.fromEntries(drops.map((d) => [d.id, d]));

    const ranked = topIds.map((id, i) => {
      const d = dropMap[id];
      if (!d) return null;
      return {
        rank: i + 1,
        velocityScore: velocity[id],
        id: d.id,
        title: d.title,
        imageUrl: d.imageUrl,
        category: d.category,
        hypeScore: d.hypeScore,
        views: d.views,
        likes: d._count.likes,
        comments: d._count.comments,
        saves: d._count.saves,
        entries: d._count.entries,
        brand: d.brand,
      };
    }).filter(Boolean);

    return sendSuccess(res, `Trending drops (last ${hours}h)`, ranked);
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 6. USER ENGAGEMENT PROFILE
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/users/me
 *
 * Authenticated user's personal engagement analytics.
 */
router.get('/users/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [
      likeCount,
      commentCount,
      saveCount,
      entryCount,
      followCount,
    ] = await Promise.all([
      prisma.like.count({ where: { userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.savedDrop.count({ where: { userId } }),
      prisma.dropEntry.count({ where: { userId } }),
      prisma.follow.count({ where: { userId } }),
    ]);

    // Recent activity timeline (last 30 days).
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentLikes, recentComments] = await Promise.all([
      prisma.like.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.comment.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Most engaged categories.
    const likedDrops = await prisma.like.findMany({
      where: { userId },
      select: { drop: { select: { category: true } } },
    });

    const catCounts = {};
    for (const l of likedDrops) {
      const cat = l.drop.category;
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    const topCategories = Object.entries(catCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Graph context for user entity.
    const graphContext = graphMemory.getContext('user');

    return sendSuccess(res, 'User analytics retrieved', {
      userId,
      totals: {
        likes: likeCount,
        comments: commentCount,
        saves: saveCount,
        entries: entryCount,
        follows: followCount,
      },
      timeline: {
        likes: toTimeSeries(recentLikes),
        comments: toTimeSeries(recentComments),
      },
      topCategories,
      graphContext,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 7. BRAND PERFORMANCE (graph-aware, follows brand→drop→* edges)
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/brands/:id
 *
 * Deep analytics for a specific brand.
 */
router.get('/brands/:id', async (req, res, next) => {
  try {
    const brandId = req.params.id;

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        drops: {
          include: {
            _count: { select: { likes: true, comments: true, saves: true, entries: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { followers: true, drops: true } },
      },
    });

    if (!brand) {
      throw ApiError.notFound('Brand not found');
    }

    // Aggregate totals across all brand drops.
    const totals = brand.drops.reduce(
      (acc, d) => ({
        totalViews: acc.totalViews + d.views,
        totalLikes: acc.totalLikes + d._count.likes,
        totalComments: acc.totalComments + d._count.comments,
        totalSaves: acc.totalSaves + d._count.saves,
        totalEntries: acc.totalEntries + d._count.entries,
        totalHype: acc.totalHype + d.hypeScore,
      }),
      { totalViews: 0, totalLikes: 0, totalComments: 0, totalSaves: 0, totalEntries: 0, totalHype: 0 },
    );

    // Per-drop stats.
    const dropStats = brand.drops.map((d) => ({
      id: d.id,
      title: d.title,
      imageUrl: d.imageUrl,
      category: d.category,
      hypeScore: d.hypeScore,
      views: d.views,
      likes: d._count.likes,
      comments: d._count.comments,
      saves: d._count.saves,
      entries: d._count.entries,
      engagementRate: engagementRate(d),
      dropTime: d.dropTime,
    }));

    // Best-performing drop.
    const bestDrop = dropStats.length
      ? dropStats.reduce((best, d) => (d.hypeScore > best.hypeScore ? d : best))
      : null;

    // Category distribution for this brand.
    const categoryDist = {};
    for (const d of brand.drops) {
      categoryDist[d.category] = (categoryDist[d.category] || 0) + 1;
    }

    // Graph context for brand entity.
    const graphContext = graphMemory.getContext('brand');

    return sendSuccess(res, 'Brand analytics retrieved', {
      brandId: brand.id,
      brandName: brand.name,
      logo: brand.logo,
      followers: brand._count.followers,
      totalDrops: brand._count.drops,
      avgHypeScore: +((totals.totalHype / (brand.drops.length || 1))).toFixed(1),
      ...totals,
      bestDrop,
      categoryDistribution: categoryDist,
      drops: dropStats,
      graphContext,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// 8. GRAPH ENTITY ANALYTICS — generic context via Graph Memory
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/graph/:entity
 *
 * Returns the graph context for any entity alongside
 * live counts from the database for that entity type.
 */
router.get('/graph/:entity', async (req, res, next) => {
  try {
    const { entity } = req.params;
    const context = graphMemory.getContext(entity);

    if (!context) {
      throw ApiError.notFound(`Entity "${entity}" not found in graph`);
    }

    // Attempt to fetch a live count for the entity model.
    let liveCount = null;
    const modelName = entity.toLowerCase();
    const modelMap = {
      user: () => prisma.user.count(),
      brand: () => prisma.brand.count(),
      drop: () => prisma.drop.count(),
      comment: () => prisma.comment.count(),
      saveddrop: () => prisma.savedDrop.count(),
      like: () => prisma.like.count(),
      follow: () => prisma.follow.count(),
      dropentry: () => prisma.dropEntry.count(),
    };

    if (modelMap[modelName]) {
      liveCount = await modelMap[modelName]();
    }

    return sendSuccess(res, `Analytics for entity "${entity}"`, {
      entity: context.node,
      totalRecords: liveCount,
      relationships: context.edges,
      relatedEntities: context.relatedNodes,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
