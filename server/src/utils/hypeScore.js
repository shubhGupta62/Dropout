const prisma = require('../lib/prisma');

/**
 * Recalculate and update hype score for a drop.
 * Formula weights: likes×2 + saves×3 + comments×4 + views×0.01 + entries×5
 * Normalized to 0–99 range using logarithmic scaling.
 */
async function recalculateHypeScore(dropId) {
  try {
    const counts = await prisma.drop.findUnique({
      where: { id: dropId },
      select: {
        views: true,
        _count: {
          select: {
            likes: true,
            saves: true,
            comments: true,
            entries: true,
          },
        },
      },
    });

    if (!counts) return 0;

    const raw =
      (counts._count.likes * 2) +
      (counts._count.saves * 3) +
      (counts._count.comments * 4) +
      (counts.views * 0.01) +
      (counts._count.entries * 5);

    // Logarithmic scaling: log(1 + raw) * 15, capped at 99
    const score = Math.min(99, Math.floor(Math.log(1 + raw) * 15));

    await prisma.drop.update({
      where: { id: dropId },
      data: { hypeScore: score },
    });

    return score;
  } catch (err) {
    console.error('Failed to recalculate hype score:', err);
    return 0;
  }
}

module.exports = { recalculateHypeScore };
