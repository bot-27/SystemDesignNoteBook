import { useState, useCallback } from 'react';
import type { Node, Edge } from 'reactflow';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'llama3';

const SYSTEM_PROMPT = `You are a harsh Staff Engineer reviewing a system architecture diagram. Analyze it for:
1. Single Points of Failure (SPOFs)
2. Missing caching layers
3. Bottleneck risks
4. Security concerns
5. Scalability issues

You MUST provide an actionable "Suggested Fix" for every issue found.
Format each issue as:

**Issue:** [description of the problem]
**Severity:** [Critical / High / Medium / Low]
**Suggested Fix:** [specific, actionable solution]

---

Be concise but thorough. If the architecture looks solid, still suggest at least 2 improvements.`;

// ──────────────────────────────────────────────────────
// Graph serializer
// ──────────────────────────────────────────────────────

function serializeGraph(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return 'Empty diagram — no components placed.';

  const nodeMap = new Map<string, { type: string; label: string }>();
  for (const n of nodes) {
    nodeMap.set(n.id, {
      type: (n.data?.type as string) ?? 'Unknown',
      label: (n.data?.label as string) ?? n.id,
    });
  }

  // Build node list
  const nodeLines = nodes.map(n => {
    const info = nodeMap.get(n.id)!;
    const note = (n.data?.note as string) ?? '';
    return `- ${info.type}: "${info.label}"${note ? ` (Note: ${note})` : ''}`;
  });

  // Build connection list
  const connectionLines = edges.map(e => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (!src || !tgt) return null;
    const label = (e.data?.label as string) ?? '';
    return `- ${src.type} "${src.label}" → ${tgt.type} "${tgt.label}"${label ? ` [${label}]` : ''}`;
  }).filter(Boolean);

  return `SYSTEM ARCHITECTURE:

Components (${nodes.length}):
${nodeLines.join('\n')}

Connections (${edges.length}):
${connectionLines.length > 0 ? connectionLines.join('\n') : '- No connections defined'}`;
}

// ──────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────

export interface ArchitectureReviewResult {
  review: string;
  isLoading: boolean;
  error: string | null;
  requestReview: () => void;
}

export function useArchitectureReview(nodes: Node[], edges: Edge[]): ArchitectureReviewResult {
  const [review, setReview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReview('');

    const graphText = serializeGraph(nodes, edges);

    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt: graphText,
          system: SYSTEM_PROMPT,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Ollama streams newline-delimited JSON objects
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              accumulated += parsed.response;
              setReview(accumulated);
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      if (!accumulated) {
        setReview('The AI returned an empty response. Try again or check your Ollama setup.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('ERR_CONNECTION_REFUSED')) {
        setError(
          'Could not connect to Ollama. Make sure it is running:\n\n' +
          '  1. Install Ollama from https://ollama.ai\n' +
          '  2. Run: ollama run llama3\n' +
          '  3. Keep the terminal open and try again'
        );
      } else {
        setError(`Error: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges]);

  return { review, isLoading, error, requestReview };
}
