/**
 * response.js — Reusable JSON response helpers.
 *
 * Every API response leaves the server in the same shape:
 *
 *   {
 *     success: true | false,
 *     message: "Human-readable summary",
 *     data:    { … }            // present when success === true
 *     error:   "error detail"   // present when success === false
 *   }
 *
 * This makes life much easier for front-end consumers — they can always
 * check `res.data.success` instead of guessing the shape of each endpoint.
 */

/**
 * Send a successful response.
 *
 * @param {import('express').Response} res
 * @param {string}  message  - Human-readable description of what happened.
 * @param {*}       data     - Payload to include under the `data` key.
 * @param {number}  [statusCode=200] - HTTP status (200, 201, etc.).
 */
function sendSuccess(res, message, data = null, statusCode = 200) {
  const body = {
    success: true,
    message,
  };

  // Only attach `data` when there is something to send — keeps 204-style
  // responses clean while still using a 200 status.
  if (data !== null && data !== undefined) {
    body.data = data;
  }

  return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 *
 * @param {import('express').Response} res
 * @param {string}  message     - Human-readable error description.
 * @param {number}  [statusCode=500] - HTTP status (400, 401, 403, 404, 500…).
 * @param {string}  [errorDetail]    - Technical detail (shown only in dev).
 */
function sendError(res, message, statusCode = 500, errorDetail = null) {
  const body = {
    success: false,
    message,
  };

  // In development, expose the raw error string for easier debugging.
  // In production the client only sees the sanitized `message`.
  if (errorDetail && process.env.NODE_ENV !== 'production') {
    body.error = errorDetail;
  }

  return res.status(statusCode).json(body);
}

module.exports = { sendSuccess, sendError };
