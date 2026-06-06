import { useState, useCallback, useRef } from 'react';
import type { Node, Edge } from 'reactflow';

const OLLAMA_CHAT_URL = '/api/ollama/api/chat';
const MODEL = 'llama3.2:1b';

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

const CHAT_SYSTEM_PROMPT = `You are a Staff Engineer who just completed a system architecture review. The user is now asking follow-up questions about the review and the architecture. Be helpful, specific, and provide actionable advice. Reference the architecture components when relevant. Keep answers concise but thorough.`;

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
// Types
// ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ArchitectureReviewResult {
  review: string;
  isLoading: boolean;
  error: string | null;
  requestReview: () => void;
  // Chat
  messages: ChatMessage[];
  sendMessage: (message: string) => void;
  isChatLoading: boolean;
}

// ──────────────────────────────────────────────────────
// Streaming helper
// ──────────────────────────────────────────────────────

async function streamOllamaChat(
  body: object,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
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
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) {
          accumulated += parsed.message.content;
          onChunk(accumulated);
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  return accumulated;
}

// ──────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────

export function useArchitectureReview(nodes: Node[], edges: Edge[]): ArchitectureReviewResult {
  const [review, setReview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const graphTextRef = useRef('');

  // ── Initial review (uses /api/chat with a single user message) ──
  const requestReview = useCallback(async () => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setReview('');
    setMessages([]);

    const graphText = serializeGraph(nodes, edges);
    graphTextRef.current = graphText;

    try {
      const ollamaMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: graphText },
      ];

      const finalText = await streamOllamaChat(
        { model: MODEL, messages: ollamaMessages, stream: true },
        (text) => setReview(text),
        controller.signal,
      );

      if (!finalText) {
        setReview('The AI returned an empty response. Try again or check your Ollama setup.');
        return;
      }

      // Seed the chat history with the review conversation
      setMessages([
        {
          role: 'system' as const,
          content: CHAT_SYSTEM_PROMPT + '\n\nHere is the architecture being discussed:\n' + graphText,
          timestamp: Date.now(),
        },
        {
          role: 'user' as const,
          content: 'Please review this system architecture.',
          timestamp: Date.now(),
        },
        {
          role: 'assistant' as const,
          content: finalText,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';

      if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('ERR_CONNECTION_REFUSED')) {
        setError(
          'Could not connect to Ollama. Make sure it is running:\n\n' +
          '  1. Install Ollama from https://ollama.ai\n' +
          '  2. Run: ollama run llama3.2:1b\n' +
          '  3. Keep the terminal open and try again'
        );
      } else {
        setError(`Error: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [nodes, edges]);

  // ── Send a follow-up chat message ──
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isChatLoading) return;

    // Abort previous chat request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage.trim(),
      timestamp: Date.now(),
    };

    // Optimistically add user message
    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    // Add placeholder for assistant response
    const placeholderMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, placeholderMsg]);

    try {
      // Build the full Ollama messages array from our chat history
      const ollamaMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const finalText = await streamOllamaChat(
        { model: MODEL, messages: ollamaMessages, stream: true },
        (text) => {
          // Update the last (assistant placeholder) message
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: text,
            };
            return updated;
          });
        },
        controller.signal,
      );

      if (!finalText) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'The AI returned an empty response. Please try again.',
          };
          return updated;
        });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';

      // Remove the placeholder and show error inline
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `⚠️ Error: ${message}`,
        };
        return updated;
      });
    } finally {
      setIsChatLoading(false);
    }
  }, [messages, isChatLoading]);

  return { review, isLoading, error, requestReview, messages, sendMessage, isChatLoading };
}
