const prisma = require('../../lib/prisma');

async function findDrops({ page = 1, limit = 20, q, category, sort = 'newest' }) {
  const where = {};

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { brand: { is: { name: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  if (category) {
    where.category = category;
  }

  const orderBy =
    sort === 'oldest' ? { createdAt: 'asc' } :
    sort === 'views' ? { views: 'desc' } :
    sort === 'hype' ? { hypeScore: 'desc' } :
    { createdAt: 'desc' };

  const [drops, total] = await Promise.all([
    prisma.drop.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        brand: { select: { id: true, name: true, logo: true } },
        _count: { select: { likes: true, comments: true, saves: true, entries: true } },
      },
    }),
    prisma.drop.count({ where }),
  ]);

  return {
    drops: drops.map((drop) => ({
      id: drop.id,
      title: drop.title,
      category: drop.category,
      imageUrl: drop.imageUrl,
      views: drop.views,
      hypeScore: drop.hypeScore,
      createdAt: drop.createdAt,
      dropTime: drop.dropTime,
      brand: drop.brand,
      stats: {
        likes: drop._count.likes,
        comments: drop._count.comments,
        saves: drop._count.saves,
        entries: drop._count.entries,
      },
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function deleteDrop(id, adminId, reason) {
  const existingDrop = await prisma.drop.findUnique({
    where: { id },
    include: {
      brand: { select: { name: true } },
      _count: { select: { likes: true, comments: true, saves: true, entries: true } },
    },
  });

  if (!existingDrop) return null;

  const snapshot = {
    id: existingDrop.id,
    title: existingDrop.title,
    category: existingDrop.category,
    brandName: existingDrop.brand?.name || null,
    views: existingDrop.views,
    counts: existingDrop._count,
  };

  await prisma.$transaction([
    prisma.like.deleteMany({ where: { dropId: id } }),
    prisma.comment.deleteMany({ where: { dropId: id } }),
    prisma.savedDrop.deleteMany({ where: { dropId: id } }),
    prisma.dropEntry.deleteMany({ where: { dropId: id } }),
    prisma.contentFlag.deleteMany({ where: { targetType: 'drop', targetId: id } }),
    prisma.drop.delete({ where: { id } }),
    prisma.adminActionLog.create({
      data: {
        action: 'delete_drop',
        targetType: 'drop',
        targetId: id,
        reason: reason || 'Admin deletion',
        adminId,
        metadata: snapshot,
      },
    }),
  ]);

  return snapshot;
}

async function findAdminActions({ page = 1, limit = 20, action, targetType, adminId, from, to }) {
  const where = {};

  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (adminId) where.adminId = adminId;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [actions, total] = await Promise.all([
    prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.adminActionLog.count({ where }),
  ]);

  return {
    actions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function findFlags({ page = 1, limit = 20, status, targetType }) {
  const where = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;

  const [flags, total] = await Promise.all([
    prisma.contentFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        flaggedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.contentFlag.count({ where }),
  ]);

  return {
    flags,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function createFlag({ targetType, targetId, reason, notes, flaggedById }) {
  return prisma.contentFlag.create({
    data: {
      targetType,
      targetId,
      reason,
      notes: notes || null,
      flaggedById,
    },
  });
}

async function reviewFlag({ id, status, notes, reviewedById }) {
  const existingFlag = await prisma.contentFlag.findUnique({
    where: { id },
    select: { id: true, targetType: true, targetId: true, reason: true },
  });

  if (!existingFlag) return null;

  const [flag] = await prisma.$transaction([
    prisma.contentFlag.update({
      where: { id },
      data: {
        status,
        notes: notes || null,
        reviewedById,
        reviewedAt: new Date(),
      },
      include: {
        flaggedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.adminActionLog.create({
      data: {
        action: 'review_flag',
        targetType: existingFlag.targetType,
        targetId: existingFlag.targetId,
        reason: notes || `Flag ${status}`,
        adminId: reviewedById,
        metadata: {
          flagId: existingFlag.id,
          flagReason: existingFlag.reason,
          status,
        },
      },
    }),
  ]);

  return flag;
}

module.exports = {
  findDrops,
  deleteDrop,
  findAdminActions,
  findFlags,
  createFlag,
  reviewFlag,
};
