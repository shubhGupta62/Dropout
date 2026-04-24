/**
 * schemas.js — Centralized Zod validation schemas for the entire API.
 *
 * Each schema validates { body?, params?, query? } and is consumed
 * by the validate() middleware. Keeping them in one file makes it
 * easy to audit every field the API accepts.
 */

const { z } = require('zod');

// ─── Shared primitives ────────────────────────────────────────────

/** CUID param — validates :id style route params. */
const cuidParam = z.string().min(1, 'ID is required').max(30);

/** Pagination query params (reusable across list endpoints). */
const paginationQuery = z.object({
  page:  z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).optional();

// ─── Auth Schemas ──────────────────────────────────────────────────

const signupSchema = z.object({
  body: z.object({
    email:    z.string().email('Invalid email address').max(255),
    name:     z.string().min(1, 'Name is required').max(100),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128),
    role:     z.enum(['user', 'brand']).optional().default('user'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email:    z.string().email('Invalid email address').max(255),
    password: z.string().min(1, 'Password is required').max(128),
  }),
});

// ─── Drop Schemas ──────────────────────────────────────────────────

const listDropsSchema = z.object({
  query: z.object({
    category: z.string().max(50).optional(),
    featured: z.enum(['true', 'false']).optional(),
    sort:     z.enum(['hype', 'date', 'newest']).optional(),
  }).optional(),
});

const dropIdParamSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
});

const createDropSchema = z.object({
  body: z.object({
    title:       z.string().min(1, 'Title is required').max(200),
    description: z.string().min(1, 'Description is required').max(5000),
    imageUrl:    z.string().url('Invalid image URL').max(2048),
    price:       z.string().min(1, 'Price is required').max(50),
    category:    z.string().min(1, 'Category is required').max(50),
    dropTime:    z.string().min(1, 'Drop time is required'),
    featured:    z.boolean().optional().default(false),
    website:     z.string().url('Invalid website URL').max(2048).optional().nullable(),
    brandId:     z.string().min(1, 'Brand ID is required').max(30),
    accessType:  z.enum(['open', 'raffle', 'waitlist', 'invite']).optional().default('open'),
    maxQuantity: z.coerce.number().int().positive().optional().nullable(),
  }),
});

const commentSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
  body: z.object({
    text: z.string().min(1, 'Comment text is required').max(2000),
  }),
});

// ─── Brand Schemas ─────────────────────────────────────────────────

const brandIdParamSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
});

const createBrandSchema = z.object({
  body: z.object({
    name:    z.string().min(1, 'Brand name is required').max(100),
    logo:    z.string().url('Invalid logo URL').max(2048),
    website: z.string().url('Invalid website URL').max(2048).optional().nullable(),
  }),
});

// ─── User Schemas ──────────────────────────────────────────────────

const userIdParamSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: cuidParam,
  }),
  body: z.object({
    name:            z.string().min(1).max(100).optional(),
    bio:             z.string().max(500).optional().nullable(),
    avatar:          z.string().url('Invalid avatar URL').max(2048).optional().nullable(),
    username:        z.string().min(1).max(30).regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, underscores, dots, and hyphens').optional(),
    website:         z.string().url('Invalid website URL').max(2048).optional().nullable(),
    instagramHandle: z.string().max(30).optional().nullable(),
    location:        z.string().max(100).optional().nullable(),
  }),
});

const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(100),
  }),
});

const saveDropParamsSchema = z.object({
  params: z.object({
    userId: cuidParam,
    dropId: cuidParam,
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
  }),
});

// ─── Upload Schemas ────────────────────────────────────────────────

const deleteUploadSchema = z.object({
  params: z.object({
    publicId: z.string().min(1, 'Public ID is required').max(255),
  }),
});

const uploadBodySchema = z.object({
  body: z.object({
    folder: z.string().max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Folder name may only contain letters, numbers, underscores, and hyphens').optional(),
  }).optional(),
});

// ─── Export everything ─────────────────────────────────────────────

module.exports = {
  // Auth
  signupSchema,
  loginSchema,
  // Drops
  listDropsSchema,
  dropIdParamSchema,
  createDropSchema,
  commentSchema,
  // Brands
  brandIdParamSchema,
  createBrandSchema,
  // Users
  userIdParamSchema,
  updateUserSchema,
  searchUsersSchema,
  saveDropParamsSchema,
  adminUserIdParamSchema,
  adminBanUserSchema,
  // Upload
  deleteUploadSchema,
  uploadBodySchema,
};
