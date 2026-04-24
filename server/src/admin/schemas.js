const { z } = require('zod');

const cuidParam = z.string().min(1).max(30);

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const adminListUsersSchema = z.object({
  query: paginationQuery.extend({
    q: z.string().max(100).optional(),
    role: z.enum(['user', 'brand', 'admin', 'super_admin']).optional(),
    banned: z.enum(['true', 'false']).optional(),
    sort: z.enum(['newest', 'oldest', 'name']).optional(),
  }),
});

const adminUserIdParamSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
});

const adminBanUserSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
  body: z.object({
    banned: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
});

const adminChangeRoleSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
  body: z.object({
    role: z.enum(['user', 'brand', 'admin']),
  }),
});

const adminListDropsSchema = z.object({
  query: paginationQuery.extend({
    q: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    sort: z.enum(['newest', 'oldest', 'views', 'hype']).optional(),
  }),
});

const adminDeleteDropSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }).optional(),
});

const adminActivityQuerySchema = z.object({
  query: paginationQuery.extend({
    action: z.string().max(100).optional(),
    userId: cuidParam.optional(),
    entity: z.string().max(100).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

const adminActionQuerySchema = z.object({
  query: paginationQuery.extend({
    action: z.string().max(100).optional(),
    targetType: z.string().max(50).optional(),
    adminId: cuidParam.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

const adminFlagListSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['pending', 'reviewed', 'dismissed']).optional(),
    targetType: z.enum(['drop', 'comment']).optional(),
  }),
});

const adminCreateFlagSchema = z.object({
  body: z.object({
    targetType: z.enum(['drop', 'comment']),
    targetId: cuidParam,
    reason: z.enum(['spam', 'inappropriate', 'misleading', 'harassment', 'other']),
    notes: z.string().max(1000).optional(),
  }),
});

const adminReviewFlagSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
  body: z.object({
    status: z.enum(['reviewed', 'dismissed']),
    notes: z.string().max(1000).optional(),
  }),
});

const adminDailyAnalyticsQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().positive().max(365).optional().default(30),
  }),
});

module.exports = {
  adminLoginSchema,
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
};
