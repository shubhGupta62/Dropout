/**
 * admin/services/analyticsService.js — Analytics computations.
 */

const prisma = require('../../lib/prisma');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function buildDailySeries(days, sources) {
  const now = new Date();
  const labels = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (days - 1 - i));
    return formatDayKey(d);
  });

  const metrics = labels.reduce((acc, label) => {
    acc[label] = { date: label };
    for (const key of Object.keys(sources)) acc[label][key] = 0;
    return acc;
  }, {});

  for (const [key, rows] of Object.entries(sources)) {
    for (const row of rows) {
      const label = formatDayKey(row.createdAt);
      if (metrics[label]) metrics[label][key] += 1;
    }
  }
  return labels.map((label) => metrics[label]);
}

async function getAdminStats() {
  const [totalUsers, totalDrops, totalLikes, totalComments, totalBrands] = await Promise.all([
    prisma.user.count({ where: { isBanned: false } }),
    prisma.drop.count(),
    prisma.like.count(),
    prisma.comment.count(),
    prisma.brand.count(),
  ]);

  return {
    totalUsers,
    totalDrops,
    totalLikes,
    totalComments,
    totalBrands,
  };
}

async function getPlatformOverview() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 3600000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);

  const [
    totalUsers, totalBrands, totalDrops, totalLikes,
    totalComments, totalSaves, totalEntries, totalFollows,
    pendingFlags, viewsAgg, dau, wau, mau,
    newUsersToday, newUsersWeek, bannedUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.brand.count(),
    prisma.drop.count(),
    prisma.like.count(),
    prisma.comment.count(),
    prisma.savedDrop.count(),
    prisma.dropEntry.count(),
    prisma.follow.count(),
    prisma.contentFlag.count({ where: { status: 'pending' } }),
    prisma.drop.aggregate({ _sum: { views: true } }),
    prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { isBanned: true } }),
  ]);

  return {
    totals: {
      users: totalUsers, brands: totalBrands, drops: totalDrops,
      views: viewsAgg._sum.views || 0, likes: totalLikes,
      comments: totalComments, saves: totalSaves,
      entries: totalEntries, follows: totalFollows,
    },
    activeUsers: { dau, wau, mau },
    newUsers: { today: newUsersToday, thisWeek: newUsersWeek },
    moderation: { pendingFlags, bannedUsers },
  };
}

async function getDailyGrowth(days = 30) {
  const rangeStart = startOfDay(new Date());
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  const [users, drops, likes, comments, brands, entries] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.drop.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.like.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.brand.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
    prisma.dropEntry.findMany({ where: { createdAt: { gte: rangeStart } }, select: { createdAt: true } }),
  ]);

  return {
    range: { from: rangeStart.toISOString(), to: new Date().toISOString(), days },
    daily: buildDailySeries(days, { users, drops, likes, comments, brands, entries }),
  };
}

async function getEngagementMetrics() {
  const drops = await prisma.drop.findMany({
    select: {
      id: true, title: true, category: true, views: true,
      hypeScore: true, imageUrl: true,
      _count: { select: { likes: true, comments: true, saves: true, entries: true } },
    },
    orderBy: { hypeScore: 'desc' },
  });

  const withEng = drops.map((d) => {
    const interactions = d._count.likes + d._count.comments + d._count.saves + d._count.entries;
    return { ...d, engagementRate: +(interactions / Math.max(d.views, 1) * 100).toFixed(2), interactions };
  });

  const totalInteractions = withEng.reduce((s, d) => s + d.interactions, 0);
  const totalViews = withEng.reduce((s, d) => s + d.views, 0);

  const topByEngagement = withEng
    .filter((d) => d.views >= 5)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 5)
    .map(({ id, title, category, views, interactions, engagementRate, hypeScore }) =>
      ({ id, title, category, views, interactions, engagementRate, hypeScore }));

  const topByHype = withEng.slice(0, 5).map(({ id, title, category, hypeScore, views, engagementRate }) =>
    ({ id, title, category, hypeScore, views, engagementRate }));

  const cats = {};
  for (const d of withEng) {
    if (!cats[d.category]) cats[d.category] = { category: d.category, dropCount: 0, totalViews: 0, totalInteractions: 0, totalHype: 0 };
    const c = cats[d.category];
    c.dropCount++; c.totalViews += d.views; c.totalInteractions += d.interactions; c.totalHype += d.hypeScore;
  }

  const categoryPerformance = Object.values(cats)
    .map((c) => ({
      ...c,
      avgEngagementRate: +((c.totalInteractions / Math.max(c.totalViews, 1)) * 100).toFixed(2),
      avgHypeScore: +(c.totalHype / c.dropCount).toFixed(1),
    }))
    .sort((a, b) => b.dropCount - a.dropCount);

  return {
    overall: { totalDrops: drops.length, totalViews, totalInteractions, avgEngagementRate: +(totalInteractions / Math.max(totalViews, 1) * 100).toFixed(2) },
    topByEngagement, topByHype, categoryPerformance,
  };
}

module.exports = {
  getAdminStats,
  getPlatformOverview,
  getDailyGrowth,
  getEngagementMetrics,
};
