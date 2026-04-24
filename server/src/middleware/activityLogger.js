const prisma = require('../lib/prisma');

async function recordActivity({ action, entity, entityId, userId, metadata }) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entity: entity || null,
        entityId: entityId || null,
        userId: userId || null,
        metadata: metadata || null,
      },
    });
  } catch (err) {
    console.error('[ActivityLogger] Failed to record activity:', err.message);
  }
}

function logActivity(action, entity, idExtractor) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;

      const entityId = idExtractor
        ? idExtractor(req, res)
        : req.params?.id || null;

      recordActivity({
        action,
        entity: entity || null,
        entityId,
        userId: req.user?.id || null,
        metadata: {
          method: req.method,
          path: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          statusCode: res.statusCode,
        },
      });
    });

    next();
  };
}

module.exports = { logActivity, recordActivity };
