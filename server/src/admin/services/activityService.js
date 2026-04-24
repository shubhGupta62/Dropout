/**
 * admin/services/activityService.js — Activity log queries.
 *
 * Read-side operations for browsing and filtering the ActivityLog table.
 * Write-side operations live in middleware/activityLogger.js.
 */

const prisma = require('../../lib/prisma');

/**
 * Find activity logs with pagination and filtering.
 *
 * @param {Object} opts
 * @param {number} opts.page    — 1-indexed page number
 * @param {number} opts.limit   — results per page
 * @param {string} [opts.action] — filter by action type
 * @param {string} [opts.userId] — filter by user
 * @param {string} [opts.entity] — filter by entity type
 * @param {string} [opts.from]   — ISO date string (start of range)
 * @param {string} [opts.to]     — ISO date string (end of range)
 * @returns {{ logs, total, page, limit, totalPages }}
 */
async function findLogs({ page = 1, limit = 20, action, userId, entity, from, to }) {
  const where = {};

  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
          },
        },
      },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get the most recent activity entries (for live feed).
 *
 * @param {number} [count=50] — number of entries to return
 * @returns {Array} recent activity log entries
 */
async function getRecentLogs(count = 50) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: count,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Get distinct action types for filter dropdowns.
 *
 * @returns {Array<string>} unique action names
 */
async function getActionTypes() {
  const results = await prisma.activityLog.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
  });

  return results.map((r) => r.action);
}

module.exports = {
  findLogs,
  getRecentLogs,
  getActionTypes,
};
