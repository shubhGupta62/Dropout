const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/admin');
const { validate } = require('../middleware/validate');
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const activityController = require('./controllers/activityController');
const analyticsController = require('./controllers/analyticsController');
const actionController = require('./controllers/actionController');
const {
  adminListUsersSchema,
  adminUserIdParamSchema,
  adminBanUserSchema,
  adminChangeRoleSchema,
  adminListDropsSchema,
  adminDeleteDropSchema,
  adminActivityQuerySchema,
  adminActionQuerySchema,
  adminFlagListSchema,
  adminCreateFlagSchema,
  adminReviewFlagSchema,
  adminDailyAnalyticsQuerySchema,
  adminLoginSchema,
} = require('./schemas');

const router = express.Router();

// ── Public route — no auth required ─────────────────────────────────
router.post('/login', validate(adminLoginSchema), authController.login);

// ── Protected routes — all below require auth + admin role ──────────
router.use(requireAuth, requireAdmin);

// Admin profile
router.get('/me', authController.me);

router.get('/stats', analyticsController.getStats);
router.get('/analytics', validate(adminDailyAnalyticsQuerySchema), analyticsController.getDailyAnalytics);
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/engagement', analyticsController.getEngagement);

router.get('/users', validate(adminListUsersSchema), userController.listUsers);
router.get('/users/:id', validate(adminUserIdParamSchema), userController.getUser);
router.patch('/users/:id/ban', validate(adminBanUserSchema), userController.toggleBan);
router.delete('/users/:id', validate(adminUserIdParamSchema), userController.deleteUser);
router.patch('/users/:id/role', requireSuperAdmin, validate(adminChangeRoleSchema), userController.changeRole);

router.get('/activity', validate(adminActivityQuerySchema), activityController.listActivity);
router.get('/activity/recent', activityController.listRecentActivity);
router.get('/activity/types', activityController.listActivityTypes);

router.get('/actions', validate(adminActionQuerySchema), actionController.listAdminActions);
router.get('/flags', validate(adminFlagListSchema), actionController.listFlags);
router.post('/flags', validate(adminCreateFlagSchema), actionController.createFlag);
router.patch('/flags/:id/review', validate(adminReviewFlagSchema), actionController.reviewFlag);

router.get('/drops', validate(adminListDropsSchema), actionController.listDrops);
router.delete('/drops/:id', validate(adminDeleteDropSchema), actionController.deleteDrop);

module.exports = router;
