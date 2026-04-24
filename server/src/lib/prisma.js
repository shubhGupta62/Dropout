/**
 * @file lib/prisma.js
 * @summary Shared PrismaClient singleton — all files import from here.
 *
 * Why a singleton?
 *   Each `new PrismaClient()` opens its own connection pool. With 8+
 *   files each creating their own instance, the server exhausts
 *   Supabase's PgBouncer connection limit under load.
 *
 * Usage:
 *   const prisma = require('../lib/prisma');
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
});

// Graceful shutdown — release DB connections when the process exits.
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
