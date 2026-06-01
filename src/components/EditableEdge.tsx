import { memo, useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from 'reactflow';

function EditableEdge({
  id,
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

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const finishEditing = useCallback(() => {
    setEditing(false);
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, label: inputValue } } : e,
      ),
    );
  }, [id, inputValue, setEdges]);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: '#475569', strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
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
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(EditableEdge);
