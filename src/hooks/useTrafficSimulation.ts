import { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge } from 'reactflow';

const COMPUTE_TYPES = new Set(['Server', 'Microservice', 'Worker', 'Serverless Fn']);
const STORAGE_TYPES = new Set([
  'SQL Database', 'NoSQL Database', 'Cache', 'Object Storage',
  'Search Index', 'Graph Database', 'Time Series DB',
]);
const CLIENT_TYPES = new Set(['Web Client', 'Mobile Client', 'Desktop App', 'IoT Device']);

export interface TrafficSimulationResult {
  isSimulating: boolean;
  globalRPS: number;
  setGlobalRPS: (rps: number) => void;
  toggleSimulation: () => void;
}

export function useTrafficSimulation(
  nodes: Node[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
): TrafficSimulationResult {
  const [isSimulating, setIsSimulating] = useState(false);
  const [globalRPS, setGlobalRPS] = useState(500);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep latest refs so the interval callback always sees current state
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const runTick = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    // Build adjacency: for each node, count incoming edges
    const incomingCount = new Map<string, number>();
    const nodeTypeMap = new Map<string, string>();
    const hasStorageDownstream = new Set<string>();

    for (const n of currentNodes) {
      const type = (n.data?.type as string) ?? '';
      nodeTypeMap.set(n.id, type);
      incomingCount.set(n.id, 0);
    }

    for (const e of currentEdges) {
      incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
      // Check if this edge goes from a compute node to a storage node
      const targetType = nodeTypeMap.get(e.target) ?? '';
      if (STORAGE_TYPES.has(targetType)) {
        hasStorageDownstream.add(e.source);
      }
    }

    // Count client nodes as traffic sources
    const clientCount = currentNodes.filter(n => CLIENT_TYPES.has((n.data?.type as string) ?? '')).length;
    const rpsPerClient = clientCount > 0 ? nodesRef.current.length > 0 ? globalRPS / Math.max(clientCount, 1) : 0 : globalRPS;

    // Determine which compute nodes are overloaded
    const crashedNodeIds = new Set<string>();
    for (const n of currentNodes) {
      const type = nodeTypeMap.get(n.id) ?? '';
      if (!COMPUTE_TYPES.has(type)) continue;

      const inCount = incomingCount.get(n.id) ?? 0;
      const nodeLoad = inCount * rpsPerClient;

      // Crash condition: compute node receiving significant traffic but no cache/db downstream
      if (nodeLoad > globalRPS * 0.3 && !hasStorageDownstream.has(n.id) && inCount > 0) {
        crashedNodeIds.add(n.id);
      }
    }

    // Update nodes with status
    setNodes(nds => nds.map(n => {
      const type = (n.data?.type as string) ?? '';
      if (!COMPUTE_TYPES.has(type)) {
        // Clear any lingering status for non-compute nodes
        if (n.data?.status) {
          return { ...n, data: { ...n.data, status: undefined } };
        }
        return n;
      }

      const newStatus = crashedNodeIds.has(n.id) ? 'crashed' : 'healthy';
      if (n.data?.status === newStatus) return n;
      return { ...n, data: { ...n.data, status: newStatus } };
    }));

    // Update edges: animate and vary strokeWidth
    setEdges(eds => eds.map(e => {
      const inCount = incomingCount.get(e.target) ?? 1;
      const load = Math.min(inCount * rpsPerClient / globalRPS, 1);
      const strokeWidth = 2 + load * 4; // 2px base, up to 6px at full load

      return {
        ...e,
        animated: true,
        style: {
          ...(e.style ?? {}),
          stroke: crashedNodeIds.has(e.target) ? '#ef4444' : '#475569',
          strokeWidth,
        },
      };
    }));
  }, [globalRPS, setNodes, setEdges]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset all edges and nodes
    setEdges(eds => eds.map(e => ({
      ...e,
      animated: false,
      style: {
        ...(e.style ?? {}),
        stroke: '#475569',
        strokeWidth: 2,
      },
    })));

    setNodes(nds => nds.map(n => {
      if (n.data?.status) {
        return { ...n, data: { ...n.data, status: undefined } };
      }
      return n;
    }));
  }, [setEdges, setNodes]);

  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => {
      if (prev) {
        // Stopping
        stopSimulation();
        return false;
      } else {
        // Starting — run first tick immediately, then on interval
        runTick();
        intervalRef.current = setInterval(runTick, 1500);
        return true;
      }
    });
  }, [runTick, stopSimulation]);

  // Re-run tick when globalRPS changes during simulation
  useEffect(() => {
    if (!isSimulating) return;
    // Clear and restart interval with new RPS
    if (intervalRef.current) clearInterval(intervalRef.current);
    runTick();
    intervalRef.current = setInterval(runTick, 1500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [globalRPS, isSimulating, runTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { isSimulating, globalRPS, setGlobalRPS, toggleSimulation };
}
