import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  useStore,
  MarkerType,
  type EdgeProps,
} from 'reactflow';

function EditableEdge({
  id,
  source,
  target,
  sourceHandleId,
  targetHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState((data?.label as string) || '');
  const [hovered, setHovered] = useState(false);

  // Detect if a reverse edge exists between the same two nodes
  const hasReverseEdge = useStore((state) =>
    state.edges.some(
      (e) => e.id !== id && e.source === target && e.target === source,
    ),
  );

  // Apply curvature offset when bidirectional edges exist to prevent overlap
  const offset = hasReverseEdge ? 40 : 0;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: offset ? 0.25 + offset / 200 : undefined,
  });

  const finishEditing = useCallback(() => {
    setEditing(false);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, label: inputValue } } : e,
      ),
    );
  }, [id, inputValue, setEdges]);

  const addResponseEdge = useCallback(() => {
    setEdges((eds) => {
      // Check if a reverse edge already exists between these two nodes
      const reverseExists = eds.some(
        (e) =>
          e.id !== id &&
          e.source === target &&
          e.target === source,
      );
      if (reverseExists) return eds;

      // Compute handles for the reverse edge
      const reverseSourceHandle = targetHandleId
        ? targetHandleId.replace(/-in$/, '-out')
        : null;
      const reverseTargetHandle = sourceHandleId
        ? sourceHandleId.replace(/-out$/, '-in')
        : null;

      // Build the new response edge
      const responseEdge = {
        id: `${id}_response`,
        source: target,
        target: source,
        sourceHandle: reverseSourceHandle,
        targetHandle: reverseTargetHandle,
        type: 'editable' as const,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        data: { label: 'Response' },
      };

      // Label the original edge "Request" if it has no label
      const updated = eds.map((e) => {
        if (e.id === id && (!e.data?.label || e.data.label === '')) {
          return { ...e, data: { ...e.data, label: 'Request' } };
        }
        return e;
      });

      return [...updated, responseEdge];
    });
  }, [id, source, target, sourceHandleId, targetHandleId, setEdges]);

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ pointerEvents: 'stroke' }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: '#475569', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="nodrag nopan"
        >
          {editing ? (
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={finishEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEditing();
              }}
              autoFocus
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: 11,
                padding: '2px 8px',
                border: '1px solid #3b82f6',
                borderRadius: 4,
                outline: 'none',
                width: 80,
                textAlign: 'center',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
          ) : (
            <>
              <div
                onDoubleClick={() => {
                  setInputValue((data?.label as string) || '');
                  setEditing(true);
                }}
                style={{
                  background: '#1e293b',
                  color: '#94a3b8',
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: '1px solid #334155',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {(data?.label as string) || '···'}
              </div>
              {hovered && (
                <button
                  onClick={addResponseEdge}
                  title="Add response arrow"
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    flexShrink: 0,
                  }}
                >
                  ⇋
                </button>
              )}
            </>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(EditableEdge);
