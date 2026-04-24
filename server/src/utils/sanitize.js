/**
 * sanitize.js — Input sanitization helpers.
 *
 * These strip dangerous characters from user-supplied strings
 * before they reach Prisma or get echoed in responses.
 *
 * Rules:
 *   1. Strip HTML tags to prevent stored XSS.
 *   2. Trim leading/trailing whitespace.
 *   3. Collapse multiple consecutive spaces into one.
 *   4. Remove null bytes (\0) which can confuse databases.
 */

/**
 * Sanitize a single string value.
 * Returns the cleaned string, or the original value if it's not a string.
 *
 * @param {*} value — the value to sanitize
 * @returns {*}
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;

  return value
    .replace(/\0/g, '')             // Remove null bytes
    .replace(/<[^>]*>/g, '')        // Strip HTML tags
    .replace(/\s+/g, ' ')          // Collapse whitespace
    .trim();                        // Trim edges
}

/**
 * Deep-sanitize an entire object (req.body, req.query, etc.).
 * Walks every key recursively and sanitizes all string values.
 *
 * @param {Object} obj — the object to sanitize
 * @returns {Object}   — a new sanitized copy (original is not mutated)
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj !== 'object') return obj;

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    clean[key] = sanitizeObject(value);
  }
  return clean;
}

module.exports = { sanitizeString, sanitizeObject };
