const { z, ZodError } = require('zod');

try {
  z.object({ body: z.object({ name: z.string() }) }).parse({ body: {} });
} catch (e) {
  console.log('is ZodError:', e instanceof ZodError);
  console.log('has .errors:', Array.isArray(e.errors));
  console.log('has .issues:', Array.isArray(e.issues));
  console.log('errors:', JSON.stringify(e.errors, null, 2));
}
