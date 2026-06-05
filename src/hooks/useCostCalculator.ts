import { useMemo } from 'react';
import type { Node } from 'reactflow';

// ──────────────────────────────────────────────────────
// Monthly cost estimates (USD) — rough AWS-equivalent
// ──────────────────────────────────────────────────────

export const COST_MAP: Record<string, number> = {
  // Clients — no infra cost (they're end-user devices)
  'Web Client':      0,
  'Mobile Client':   0,
  'Desktop App':     0,
  'IoT Device':      0,

  // Networking
  'CDN':             30,
  'DNS':             5,
  'API Gateway':     35,
  'Load Balancer':   25,
  'Reverse Proxy':   20,
  'WAF':             15,
  'VPC / Network':   10,

  // Compute
  'Server':          80,
  'Microservice':    60,
  'Serverless Fn':   15,
  'Worker':          45,
  'Cron Job':        10,
  'ML Model':        200,

  // Storage
  'SQL Database':    150,
  'NoSQL Database':  120,
  'Cache':           50,
  'Object Storage':  25,
  'Search Index':    90,
  'Graph Database':  130,
  'Time Series DB':  100,

  // Messaging
  'Message Queue':   30,
  'Event Stream':    55,
  'Pub/Sub':         25,
  'WebSockets':      20,

  // Platform
  'Auth Service':    40,
  'Rate Limiter':    15,
  'Monitoring':      35,
  'Logger':          20,
  'Config Service':  10,
  'CI/CD Pipeline':  45,
  'Key Management':  15,
};

export interface CostBreakdownItem {
  id: string;
  type: string;
  label: string;
  cost: number;
}

export interface CostResult {
  totalCost: number;
  breakdown: CostBreakdownItem[];
}

export function useCostCalculator(nodes: Node[]): CostResult {
  return useMemo(() => {
    const breakdown: CostBreakdownItem[] = [];
    let totalCost = 0;

    for (const node of nodes) {
      const type = (node.data?.type as string) ?? '';
      const label = (node.data?.label as string) ?? type;
      // Use custom cost from node data if set, otherwise fall back to COST_MAP
      const customCost = node.data?.cost as number | undefined;
      const cost = customCost ?? COST_MAP[type] ?? 0;

      if (cost > 0) {
        breakdown.push({ id: node.id, type, label, cost });
        totalCost += cost;
      }
    }

    // Sort by cost descending for display
    breakdown.sort((a, b) => b.cost - a.cost);

    return { totalCost, breakdown };
  }, [nodes]);
}
