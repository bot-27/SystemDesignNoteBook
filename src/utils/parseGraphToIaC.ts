import type { Node, Edge } from 'reactflow';

// ──────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────

export interface ParsedNode {
  id: string;
  type: string;          // original node type from sidebar (e.g. "Server", "SQL Database")
  label: string;         // user-facing label (may have been renamed)
  note: string;
  incoming: ParsedEdge[];
  outgoing: ParsedEdge[];
  hasLoadBalancerUpstream: boolean;
}

export interface ParsedEdge {
  id: string;
  label: string;
  sourceNode: { id: string; type: string; label: string };
  targetNode: { id: string; type: string; label: string };
}

export interface ParsedGraph {
  /** All nodes in structured form, keyed by node id */
  nodes: Map<string, ParsedNode>;
  /** Nodes that have zero connections */
  standalone: ParsedNode[];
  /** Groups of nodes that are transitively connected */
  clusters: ParsedNode[][];
  /** Subset: only compute-type nodes (Server, Microservice) */
  computeNodes: ParsedNode[];
}

// ──────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────

const COMPUTE_TYPES = new Set(['Server', 'Microservice']);

function toSafeId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildNodeLookup(nodes: Node[]): Map<string, { id: string; type: string; label: string }> {
  const map = new Map<string, { id: string; type: string; label: string }>();
  for (const n of nodes) {
    map.set(n.id, {
      id: n.id,
      type: (n.data?.type as string) ?? 'Unknown',
      label: (n.data?.label as string) ?? n.id,
    });
  }
  return map;
}

/** BFS/DFS to find connected clusters */
function findClusters(nodeIds: string[], adjacency: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const start of nodeIds) {
    if (visited.has(start)) continue;
    const cluster: string[] = [];
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      cluster.push(cur);
      const neighbors = adjacency.get(cur);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) stack.push(n);
        }
      }
    }
    clusters.push(cluster);
  }

  return clusters;
}

// ──────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────

export function parseGraphToIaC(nodes: Node[], edges: Edge[]): ParsedGraph {
  const nodeLookup = buildNodeLookup(nodes);

  // Build ParsedNode shells
  const parsedMap = new Map<string, ParsedNode>();
  for (const n of nodes) {
    parsedMap.set(n.id, {
      id: n.id,
      type: (n.data?.type as string) ?? 'Unknown',
      label: (n.data?.label as string) ?? n.id,
      note: (n.data?.note as string) ?? '',
      incoming: [],
      outgoing: [],
      hasLoadBalancerUpstream: false,
    });
  }

  // Build undirected adjacency for cluster detection, and directed edge lists
  const adjacency = new Map<string, Set<string>>();
  const ensureAdj = (id: string) => { if (!adjacency.has(id)) adjacency.set(id, new Set()); };

  for (const e of edges) {
    const src = nodeLookup.get(e.source);
    const tgt = nodeLookup.get(e.target);
    if (!src || !tgt) continue;

    const parsedEdge: ParsedEdge = {
      id: e.id,
      label: (e.data?.label as string) ?? '',
      sourceNode: src,
      targetNode: tgt,
    };

    parsedMap.get(e.source)?.outgoing.push(parsedEdge);
    parsedMap.get(e.target)?.incoming.push(parsedEdge);

    ensureAdj(e.source);
    ensureAdj(e.target);
    adjacency.get(e.source)!.add(e.target);
    adjacency.get(e.target)!.add(e.source);
  }

  // Detect load-balancer upstream for each compute node
  for (const [, pn] of parsedMap) {
    if (COMPUTE_TYPES.has(pn.type)) {
      pn.hasLoadBalancerUpstream = pn.incoming.some(
        (ie) => ie.sourceNode.type === 'Load Balancer',
      );
    }
  }

  // Cluster detection
  const allIds = nodes.map((n) => n.id);
  const rawClusters = findClusters(allIds, adjacency);

  const clusters: ParsedNode[][] = [];
  const standalone: ParsedNode[] = [];

  for (const ids of rawClusters) {
    const group = ids.map((id) => parsedMap.get(id)!);
    if (group.length === 1 && group[0].incoming.length === 0 && group[0].outgoing.length === 0) {
      standalone.push(group[0]);
    } else {
      clusters.push(group);
    }
  }

  const computeNodes = [...parsedMap.values()].filter((pn) => COMPUTE_TYPES.has(pn.type));

  return { nodes: parsedMap, standalone, clusters, computeNodes };
}

export { toSafeId };
