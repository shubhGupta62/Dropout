/**
 * Build Graph — parse prisma/schema.prisma and populate GraphMemory
 * with model nodes and relation edges.
 */

const fs = require('fs');
const path = require('path');
const graphMemory = require('./graphMemory');

/**
 * Resolve the absolute path to the schema file.
 * Walks up from this file → src → server → prisma/schema.prisma
 */
const SCHEMA_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'prisma',
  'schema.prisma',
);

/**
 * Parse schema.prisma and populate the in-memory graph.
 *
 * 1. Extracts every `model <Name>` block as a node.
 * 2. Detects `@relation(fields: [...], references: [...])` directives
 *    and creates directed edges.
 */
function buildGraph() {
  graphMemory.reset();

  const raw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/);

  let currentModel = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Detect model opening ──
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      currentModel = modelMatch[1].toLowerCase();
      graphMemory.addNode({ id: currentModel, type: 'model' });
      continue;
    }

    // ── Detect model closing ──
    if (trimmed === '}') {
      currentModel = null;
      continue;
    }

    // ── Detect relation fields inside a model ──
    if (currentModel) {
      // Pattern: fieldName  ModelType  @relation(fields: [fk], references: [id])
      const relMatch = trimmed.match(
        /^\w+\s+(\w+)\s+@relation\(fields:\s*\[(\w+)\],\s*references:\s*\[(\w+)\]\)/,
      );

      if (relMatch) {
        const targetModel = relMatch[1].toLowerCase();
        const foreignKey = relMatch[2];

        graphMemory.addEdge({
          from: currentModel,
          to: targetModel,
          relation: `belongs_to (via ${foreignKey})`,
        });

        // Reverse edge
        graphMemory.addEdge({
          from: targetModel,
          to: currentModel,
          relation: `has_many`,
        });
      }
    }
  }

  const { nodes, edges } = graphMemory.getGraph();
  console.log(
    `📊 Graph built — ${nodes.length} nodes, ${edges.length} edges`,
  );
}

module.exports = buildGraph;
