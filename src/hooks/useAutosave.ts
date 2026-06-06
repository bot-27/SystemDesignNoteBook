import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge, ReactFlowInstance } from 'reactflow';

const AUTOSAVE_KEY = 'system-design-autosave';
const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'restored';

export interface AutosaveResult {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
  restore: () => boolean;
  clearSave: () => void;
}

export function useAutosave(
  rfInstance: ReactFlowInstance | null,
  nodes: Node[],
  edges: Edge[],
  setNodes: (nodes: Node[]) => void,
  setEdges: (edges: Edge[]) => void,
): AutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSnapshotRef = useRef<string>('');
  const hasRestoredRef = useRef(false);

  // ── Restore from localStorage on mount ──
  useEffect(() => {
    if (!rfInstance || hasRestoredRef.current) return;

    // Don't auto-restore if there's a ?load= param (manual load takes priority)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('load')) {
      hasRestoredRef.current = true;
      return;
    }

    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const flow = JSON.parse(saved);
        if (flow && flow.nodes?.length > 0) {
          const { x = 0, y = 0, zoom = 1 } = flow.viewport || {};
          setNodes(flow.nodes);
          setEdges(flow.edges || []);
          setTimeout(() => {
            rfInstance.setViewport({ x, y, zoom });
          }, 50);
          setStatus('restored');
          lastSnapshotRef.current = saved;

          // Fade status back to 'saved' after showing 'restored' briefly
          setTimeout(() => setStatus('saved'), 2000);
        }
      } catch (err) {
        console.warn('Failed to restore autosaved diagram:', err);
      }
    }

    hasRestoredRef.current = true;
  }, [rfInstance, setNodes, setEdges]);

  // ── Periodic autosave ──
  useEffect(() => {
    if (!rfInstance) return;

    const interval = setInterval(() => {
      const flow = rfInstance.toObject();
      if (!flow.nodes || flow.nodes.length === 0) return;

      const snapshot = JSON.stringify(flow);

      // Only save if something actually changed
      if (snapshot === lastSnapshotRef.current) return;

      setStatus('saving');

      try {
        localStorage.setItem(AUTOSAVE_KEY, snapshot);
        lastSnapshotRef.current = snapshot;
        setLastSavedAt(new Date());
        setStatus('saved');
      } catch (err) {
        console.warn('Autosave failed:', err);
        setStatus('idle');
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [rfInstance]);

  // ── Manual restore ──
  const restore = useCallback((): boolean => {
    if (!rfInstance) return false;

    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return false;

    try {
      const flow = JSON.parse(saved);
      if (flow) {
        const { x = 0, y = 0, zoom = 1 } = flow.viewport || {};
        setNodes(flow.nodes || []);
        setEdges(flow.edges || []);
        setTimeout(() => rfInstance.setViewport({ x, y, zoom }), 50);
        setStatus('restored');
        setTimeout(() => setStatus('saved'), 2000);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, [rfInstance, setNodes, setEdges]);

  // ── Clear saved data ──
  const clearSave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    lastSnapshotRef.current = '';
    setLastSavedAt(null);
    setStatus('idle');
  }, []);

  return { status, lastSavedAt, restore, clearSave };
}
