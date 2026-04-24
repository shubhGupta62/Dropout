/**
 * ApiError — Custom error class for operational (expected) errors.
 *
 * Usage:
 *   throw new ApiError(404, 'Drop not found');
 *   throw new ApiError(400, 'Title is required');
 *
 * The global error-handler middleware catches these and returns
 * a consistent JSON envelope to the client.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 500…)
   * @param {string} message    - Human-readable error description
   */
  constructor(statusCode, message) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;

    // isOperational = true means this is an *expected* error (bad input, auth
    // failure, missing record) as opposed to a genuine bug. The error handler
    // uses this flag to decide how much detail to expose.
    this.isOperational = true;

    // Capture a clean stack trace excluding the constructor frame itself.
    Error.captureStackTrace(this, this.constructor);
  }

  // ─── Factory helpers ─────────────────────────────────────────────
  // These read better at the call-site than `new ApiError(400, '…')`.

  /** 400 — the client sent invalid / missing data. */
  static badRequest(message = 'Bad request') {
    return new ApiError(400, message);
  }

  /** 401 — no token, expired token, or invalid credentials. */
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  /** 403 — token is valid but the user lacks permission. */
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  /** 404 — the requested resource does not exist. */
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  /** 409 — duplicate / conflict (e.g. email already registered). */
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  /** 500 — something unexpected went wrong on our side. */
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
