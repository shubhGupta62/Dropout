/**
 * Graph Memory — in-memory graph store for entity relationships.
 *
 * Node : { id: string, type: string }
 * Edge : { from: string, to: string, relation: string }
 */

class GraphMemory {
  constructor() {
    /** @type {Map<string, { id: string, type: string }>} */
    this.nodes = new Map();

    /** @type {Array<{ from: string, to: string, relation: string }>} */
    this.edges = [];
  }

  /* ── Mutations ──────────────────────────────────────────────────────── */

  /**
   * Add a node to the graph. Duplicate ids are silently ignored.
   * @param {{ id: string, type: string }} node
   */
  addNode(node) {
    if (!node?.id || !node?.type) return;
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, { id: node.id, type: node.type });
    }
  }

  /**
   * Add a directed edge between two nodes.
   * @param {{ from: string, to: string, relation: string }} edge
   */
  addEdge(edge) {
    if (!edge?.from || !edge?.to || !edge?.relation) return;

    const exists = this.edges.some(
      (e) =>
        e.from === edge.from &&
        e.to === edge.to &&
        e.relation === edge.relation,
    );

    if (!exists) {
      this.edges.push({
        from: edge.from,
        to: edge.to,
        relation: edge.relation,
      });
    }
  }

  /* ── Queries ────────────────────────────────────────────────────────── */

  /**
   * Return the full graph (all nodes + edges).
   */
  getGraph() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
    };
  }

  /**
   * Return the sub-graph context for a given entity (case-insensitive).
   *
   * Returns the matched node together with every edge that touches it
   * and the peer nodes on the other end of those edges.
   *
   * @param {string} entity — node id to look up
   */
  getContext(entity) {
    const key = entity.toLowerCase();

    const node = this.nodes.get(key) ?? null;
    if (!node) return null;

    const relatedEdges = this.edges.filter(
      (e) => e.from === key || e.to === key,
    );

    const relatedIds = new Set(
      relatedEdges.flatMap((e) => [e.from, e.to]).filter((id) => id !== key),
    );

    const relatedNodes = Array.from(relatedIds)
      .map((id) => this.nodes.get(id))
      .filter(Boolean);

    return { node, edges: relatedEdges, relatedNodes };
  }

  /**
   * Clear all nodes and edges.
   */
  reset() {
    this.nodes.clear();
    this.edges = [];
  }
}

module.exports = new GraphMemory();
