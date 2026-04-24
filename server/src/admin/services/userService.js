/**
 * admin/services/userService.js — User management business logic.
 *
 * All Prisma queries for listing, banning, deleting, and managing users.
 * Controllers call these functions — they never touch Prisma directly.
 */

const prisma = require('../../lib/prisma');
const ApiError = require('../../utils/ApiError');

/**
 * Find users with pagination, search, filtering, and sorting.
 *
 * @param {Object} opts
 * @param {number} opts.page    — 1-indexed page number
 * @param {number} opts.limit   — results per page (max 100)
 * @param {string} [opts.q]     — search by name, email, or username
 * @param {string} [opts.role]  — filter by role
 * @param {string} [opts.banned] — "true" or "false"
 * @param {string} [opts.sort]  — "newest", "oldest", "name"
 * @returns {{ users, total, page, limit, totalPages }}
 */
async function findUsers({ page = 1, limit = 20, q, role, banned, sort = 'newest' }) {
  const where = {};

  // Search across name, email, username.
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (banned === 'true') where.isBanned = true;
  if (banned === 'false') where.isBanned = false;

  const orderBy =
    sort === 'oldest' ? { createdAt: 'asc' } :
    sort === 'name'   ? { name: 'asc' } :
                         { createdAt: 'desc' };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        username: true,
        avatar: true,
        isBanned: true,
        bannedAt: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            savedDrops: true,
            follows: true,
            dropEntries: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single user's full detail including recent activity history.
 *
 * @param {string} id — user ID
 * @returns {Object} user data with activity logs and engagement stats
 */
async function findUserById(id) {
  const [user, recentActivity, engagementStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        bio: true,
        username: true,
        website: true,
        instagramHandle: true,
        location: true,
        isBanned: true,
        bannedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            savedDrops: true,
            follows: true,
            dropEntries: true,
            activityLogs: true,
          },
        },
      },
    }),

    // Last 50 activity entries for this user.
    prisma.activityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    }),

    // Engagement aggregations.
    Promise.all([
      prisma.like.count({ where: { userId: id } }),
      prisma.comment.count({ where: { userId: id } }),
      prisma.savedDrop.count({ where: { userId: id } }),
      prisma.dropEntry.count({ where: { userId: id } }),
      prisma.follow.count({ where: { userId: id } }),
    ]).then(([likes, comments, saves, entries, follows]) => ({
      likes, comments, saves, entries, follows,
    })),
  ]);

  return { user, recentActivity, engagementStats };
}

/**
 * Ban or unban a user.
 *
 * @param {string} id     — target user ID
 * @param {boolean} banned — true to ban, false to unban
 * @param {string} reason — why the action was taken
 * @param {string} adminId — the admin performing the action
 * @returns {Object} updated user
 */
async function toggleBan(id, banned, reason, adminId) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, email: true },
  });

  if (!existingUser) return null;

  // Prevent banning other admins.
  if (['admin', 'super_admin'].includes(existingUser.role)) {
    throw ApiError.forbidden('Admin users cannot be banned');
  }

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        isBanned: banned,
        bannedAt: banned ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        bannedAt: true,
        createdAt: true,
      },
    }),
    prisma.adminActionLog.create({
      data: {
        action: banned ? 'ban_user' : 'unban_user',
        targetType: 'user',
        targetId: id,
        reason,
        adminId,
        metadata: {
          userName: existingUser.name,
          userEmail: existingUser.email,
        },
      },
    }),
  ]);

  return user;
}

/**
 * Delete a user and cascade-remove all their data.
 *
 * @param {string} id      — target user ID
 * @param {string} adminId — the admin performing the action
 * @returns {Object} snapshot of what was deleted
 */
async function deleteUser(id, adminId) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      _count: {
        select: {
          likes: true, comments: true, savedDrops: true,
          follows: true, dropEntries: true,
        },
      },
    },
  });

  if (!existingUser) return null;

  // Prevent deleting other admins.
  if (['admin', 'super_admin'].includes(existingUser.role)) {
    throw ApiError.forbidden('Admin users cannot be deleted');
  }

  const snapshot = {
    id: existingUser.id,
    name: existingUser.name,
    email: existingUser.email,
    role: existingUser.role,
    createdAt: existingUser.createdAt,
    counts: existingUser._count,
  };

  // Transaction: delete all related records then the user.
  await prisma.$transaction([
    prisma.like.deleteMany({ where: { userId: id } }),
    prisma.comment.deleteMany({ where: { userId: id } }),
    prisma.savedDrop.deleteMany({ where: { userId: id } }),
    prisma.dropEntry.deleteMany({ where: { userId: id } }),
    prisma.follow.deleteMany({ where: { userId: id } }),
    prisma.activityLog.deleteMany({ where: { userId: id } }),
    prisma.contentFlag.deleteMany({ where: { flaggedById: id } }),
    prisma.contentFlag.deleteMany({ where: { reviewedById: id } }),
    prisma.adminActionLog.deleteMany({ where: { adminId: id } }),
    prisma.user.delete({ where: { id } }),
    prisma.adminActionLog.create({
      data: {
        action: 'delete_user',
        targetType: 'user',
        targetId: id,
        reason: 'Admin deletion',
        adminId,
        metadata: snapshot,
      },
    }),
  ]);

  return snapshot;
}

/**
 * Change a user's role (super_admin only).
 *
 * @param {string} id       — target user ID
 * @param {string} newRole  — "user", "brand", "admin"
 * @param {string} adminId  — the super_admin performing the action
 * @returns {Object} updated user
 */
async function changeRole(id, newRole, adminId) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!existingUser) return null;

  // Prevent changing super_admin roles.
  if (existingUser.role === 'super_admin') {
    throw ApiError.forbidden('Cannot change super_admin role');
  }

  const oldRole = existingUser.role;

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true, name: true, email: true, role: true,
        isBanned: true, createdAt: true,
      },
    }),
    prisma.adminActionLog.create({
      data: {
        action: 'change_role',
        targetType: 'user',
        targetId: id,
        reason: `Role changed from ${oldRole} to ${newRole}`,
        adminId,
        metadata: { oldRole, newRole, userName: existingUser.name },
      },
    }),
  ]);

  return user;
}

module.exports = {
  findUsers,
  findUserById,
  toggleBan,
  deleteUser,
  changeRole,
};
