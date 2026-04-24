/**
 * errorHandler.js — Global Express error-handling middleware.
 *
 * Catches all errors that bubble up from route handlers, including:
 *   • ApiError   — operational errors with known status codes
 *   • ZodError   — validation failures (formatted as 400)
 *   • MulterError — file upload issues (formatted as 400)
 *   • Any other  — unexpected errors (logged in full, sent as 500)
 *
 * Register AFTER all routes:  app.use(errorHandler);
 */

const { ZodError } = require('zod');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { sendError } = require('../utils/response');

/**
 * Express error-handling middleware (4 parameters required by Express).
 */
function errorHandler(err, req, res, _next) {
  // ── 1. Zod validation errors → 400 ──────────────────────────────
  if (err instanceof ZodError) {
    const errors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    console.error(`[VALIDATION 400] ${req.method} ${req.originalUrl}`, errors);

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // ── 2. Multer file upload errors → 400 ──────────────────────────
  if (err instanceof multer.MulterError) {
    console.error(`[MULTER 400] ${req.method} ${req.originalUrl} — ${err.message}`);

    const message =
      err.code === 'LIMIT_FILE_SIZE'   ? 'File too large (max 10 MB)' :
      err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Unexpected file field' :
      err.message;

    return sendError(res, message, 400);
  }

  // ── 3. ApiError (operational) → its own statusCode ──────────────
  if (err instanceof ApiError && err.isOperational) {
    console.error(
      `[API ${err.statusCode}] ${req.method} ${req.originalUrl} — ${err.message}`
    );
    return sendError(res, err.message, err.statusCode);
  }

  // ── 4. Unexpected / unknown errors → 500 ────────────────────────
  console.error(
    `[UNHANDLED ERROR] ${req.method} ${req.originalUrl}`,
    err.stack || err,
  );

  // NEVER expose internal error details to the client.
  return sendError(
    res,
    'An unexpected error occurred. Please try again later.',
    500,
    process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  );
}

module.exports = errorHandler;
