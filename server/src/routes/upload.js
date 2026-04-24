/**
 * routes/upload.js — Image upload and deletion via Cloudinary.
 *
 * Upload is protected by requireAuth. Deletion validates the
 * publicId param via Zod. Multer handles file size and MIME filtering.
 */

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { deleteUploadSchema } = require('../utils/schemas');

const router = express.Router();

// ─── Cloudinary config ────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Multer config — memory storage, 10 MB max, images only ──────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Only image files are allowed'), false);
    }
  },
});

// ─── POST /api/upload ─────────────────────────────────────────────
router.post('/', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    // Step 1: Ensure a file was actually uploaded.
    if (!req.file) {
      throw ApiError.badRequest('No image file provided');
    }

    // Step 2: Sanitize the folder name — only allow safe characters.
    const rawFolder = typeof req.body?.folder === 'string' ? req.body.folder.trim() : '';
    const folder = /^[a-zA-Z0-9_-]+$/.test(rawFolder) ? rawFolder : 'dropout';

    // Step 3: Stream the buffer to Cloudinary.
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1080, height: 1080, crop: 'limit', quality: 'auto', format: 'webp' },
          ],
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        },
      );
      stream.end(req.file.buffer);
    });

    return sendSuccess(res, 'Image uploaded successfully', {
      url:      result.secure_url,
      publicId: result.public_id,
      width:    result.width,
      height:   result.height,
      format:   result.format,
      bytes:    result.bytes,
    }, 201);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/upload/:publicId ─────────────────────────────────
router.delete('/:publicId', requireAuth, validate(deleteUploadSchema), async (req, res, next) => {
  try {
    await cloudinary.uploader.destroy(req.params.publicId);
    return sendSuccess(res, 'Image deleted successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
