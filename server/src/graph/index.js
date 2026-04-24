/**
 * @file graph/index.js
 * @summary Graph routes + initialization entry-point.
 * @endpoints GET /api/graph, GET /api/graph/:entity, POST /api/graph/rebuild
 * @dependencies graph/graphMemory, graph/buildGraph, utils/response
 *
 * Usage in server/src/index.js:
 *   const graphRouter = require('./graph');
 *   app.use('/api/graph', graphRouter);
 */

const express = require('express');
const graphMemory = require('./graphMemory');
const buildGraph = require('./buildGraph');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

/* ── Initialise graph on first require ────────────────────────────────── */
try {
  buildGraph();
} catch (err) {
  console.error('❌ Failed to build graph:', err.message);
}

/* ── Routes ───────────────────────────────────────────────────────────── */

/**
 * GET /api/graph
 * Returns the full graph (all nodes + edges).
 */
router.get('/', (_req, res, next) => {
  try {
    const data = graphMemory.getGraph();
    return sendSuccess(res, 'Graph retrieved successfully', data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/graph/:entity
 * Returns the sub-graph context for a specific entity.
 */
router.get('/:entity', (req, res, next) => {
  try {
    const { entity } = req.params;
    const data = graphMemory.getContext(entity);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Entity "${entity}" not found in graph`,
      });
    }

    return sendSuccess(res, `Context for "${entity}" retrieved`, data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/graph/rebuild
 * Re-reads schema.prisma and rebuilds the graph.
 */
router.post('/rebuild', (_req, res, next) => {
  try {
    buildGraph();
    const data = graphMemory.getGraph();
    return sendSuccess(res, 'Graph rebuilt successfully', data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
