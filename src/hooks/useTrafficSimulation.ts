import { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge } from 'reactflow';

const COMPUTE_TYPES = new Set(['Server', 'Microservice', 'Worker', 'Serverless Fn']);
const STORAGE_TYPES = new Set([
  'SQL Database', 'NoSQL Database', 'Cache', 'Object Storage',
  'Search Index', 'Graph Database', 'Time Series DB',
]);
const CLIENT_TYPES = new Set(['Web Client', 'Mobile Client', 'Desktop App', 'IoT Device']);

const CAPACITY_MAP: Record<string, number> = {
  // Clients (never crash)
  'Web Client': Infinity,
  'Mobile Client': Infinity,
  'Desktop App': Infinity,
  'IoT Device': Infinity,
  // Networking
  'CDN': 10000,
  'DNS': 10000,
  'API Gateway': 5000,
  'Load Balancer': 8000,
  'Reverse Proxy': 6000,
  'WAF': 4000,
  'VPC / Network': Infinity,
  // Compute
  'Server': 1000,
  'Microservice': 1500,
  'Serverless Fn': 3000,
  'Worker': 1200,
  'Cron Job': 800,
  'ML Model': 500,
  // Storage
  'SQL Database': 1500,
  'NoSQL Database': 3000,
  'Cache': 5000,
  'Object Storage': 4000,
  'Search Index': 2000,
  'Graph Database': 1000,
  'Time Series DB': 2500,
  // Messaging
  'Message Queue': 4000,
  'Event Stream': 5000,
  'Pub/Sub': 4500,
  'WebSockets': 3000,
  // Platform
  'Auth Service': 2000,
  'Rate Limiter': 5000,
  'Monitoring': Infinity,
  'Logger': Infinity,
  'Config Service': Infinity,
  'CI/CD Pipeline': Infinity,
  'Key Management': 3000,
};

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
  const globalRPSRef = useRef(globalRPS);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  globalRPSRef.current = globalRPS;

  // The tick function reads everything from refs — no stale closures
  const runTick = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;
    const rps = globalRPSRef.current;

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
      const targetType = nodeTypeMap.get(e.target) ?? '';
      if (STORAGE_TYPES.has(targetType)) {
        hasStorageDownstream.add(e.source);
      }
    }

    // Count client nodes as traffic sources
    const clientCount = currentNodes.filter(n => CLIENT_TYPES.has((n.data?.type as string) ?? '')).length;
    const rpsPerClient = clientCount > 0 ? rps / Math.max(clientCount, 1) : rps;

    // Determine which nodes are overloaded
    const crashedNodeIds = new Set<string>();
    for (const n of currentNodes) {
      const type = nodeTypeMap.get(n.id) ?? '';
      if (CLIENT_TYPES.has(type)) continue; // Clients don't crash from incoming traffic

      const inCount = incomingCount.get(n.id) ?? 0;
      const nodeLoad = inCount * rpsPerClient;

      const customCapacity = n.data?.customCapacity as number | undefined;
      const baseCapacity = customCapacity ?? CAPACITY_MAP[type] ?? 1000;
      
      const replicas = (n.data?.replicas as number) ?? 1;
      const instanceSize = (n.data?.instanceSize as string) ?? 'Medium';
      
      let sizeMultiplier = 1;
      if (instanceSize === 'Small') sizeMultiplier = 0.5;
      if (instanceSize === 'Large') sizeMultiplier = 2;
      if (instanceSize === 'X-Large') sizeMultiplier = 4;

      const scaledCapacity = baseCapacity * replicas * sizeMultiplier;

      // Compute nodes without downstream storage have lower capacity
      const capacity = (COMPUTE_TYPES.has(type) && !hasStorageDownstream.has(n.id))
        ? scaledCapacity * 0.5
        : scaledCapacity;

      if (nodeLoad > capacity && inCount > 0) {
        crashedNodeIds.add(n.id);
      }
    }

    // Update nodes with status
    setNodes(nds => nds.map(n => {
      const type = (n.data?.type as string) ?? '';
      if (CLIENT_TYPES.has(type)) {
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
      const load = Math.min(inCount * rpsPerClient / rps, 1);
      const strokeWidth = 2 + load * 4;

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
  }, [setNodes, setEdges]);

  // Reset all visual state
  const resetVisuals = useCallback(() => {
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

  // Toggle just flips the boolean — the effect handles everything else
  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => !prev);
  }, []);

  // Single effect that owns the interval lifecycle
  useEffect(() => {
    if (isSimulating) {
      // Start: run first tick immediately, then on interval
      runTick();
      intervalRef.current = setInterval(runTick, 1500);

      return () => {
        // Cleanup when stopping or deps change
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        resetVisuals();
      };
    }
    // If not simulating, ensure everything is clean
    return undefined;
  }, [isSimulating, runTick, resetVisuals]);

  // When RPS changes during simulation, restart the interval
  useEffect(() => {
    if (!isSimulating || !intervalRef.current) return;

    clearInterval(intervalRef.current);
    runTick();
    intervalRef.current = setInterval(runTick, 1500);
  }, [globalRPS, isSimulating, runTick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return { isSimulating, globalRPS, setGlobalRPS, toggleSimulation };
}
