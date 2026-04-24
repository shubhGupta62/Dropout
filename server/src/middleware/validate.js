/**
 * validate.js — Reusable Zod validation middleware factory.
 *
 * Usage in a route file:
 *
 *   const { validate } = require('../middleware/validate');
 *   const { z } = require('zod');
 *
 *   const createDropSchema = z.object({
 *     body: z.object({ title: z.string().min(1), ... }),
 *     params: z.object({ id: z.string().cuid() }).optional(),
 *     query:  z.object({ sort: z.enum(['hype','date']).optional() }).optional(),
 *   });
 *
 *   router.post('/', validate(createDropSchema), handler);
 *
 * How it works:
 *   1. Parses req.body, req.params, and req.query against the schema.
 *   2. On success, replaces req.body/params/query with the parsed (sanitized) values.
 *   3. On failure, returns a 400 JSON response listing all validation errors.
 */

const { ZodError } = require('zod');
const { sanitizeObject } = require('../utils/sanitize');

/**
 * Create an Express middleware that validates the request against a Zod schema.
 *
 * @param {import('zod').ZodObject} schema — a Zod object with optional
 *   `body`, `params`, and `query` keys.
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, _res, next) => {
    try {
      // Step 1: Sanitize all incoming strings before validation.
      // Default to empty objects so Zod can produce field-level errors
      // instead of rejecting the entire body/params/query as 'undefined'.
      const sanitized = {
        body: sanitizeObject(req.body || {}),
        params: sanitizeObject(req.params || {}),
        query: sanitizeObject(req.query || {}),
      };

      // Step 2: Parse against the Zod schema (strict — unknown keys rejected).
      const result = schema.parse(sanitized);

      // Step 3: Replace the Express request objects with validated + sanitized data.
      if (result.body) req.body = result.body;
      if (result.params) req.params = result.params;
      if (result.query) req.query = result.query;

      // Step 4: Continue to the route handler.
      return next();
    } catch (err) {
      // Step 5: If Zod threw, format the errors into a readable 400 response.
      if (err instanceof ZodError) {
        const errors = err.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        return _res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }

      // Anything else passes to the global error handler.
      return next(err);
    }
  };
}

module.exports = { validate };
