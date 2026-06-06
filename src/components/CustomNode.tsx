import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import {
  Monitor,
  Globe,
  Shield,
  GitMerge,
  Server,
  Database,
  Zap,
  MessageSquare,
  Smartphone,
  HardDrive,
  Search,
  Bell,
  Lock,
  Activity,
  Cloud,
  Layers,
  Radio,
  Workflow,
  Container,
  Gauge,
  FileText,
  Cpu,
  AppWindow,
  ShieldAlert,
  Network,
  Clock,
  Brain,
  Share2,
  LineChart,
  ArrowLeftRight,
  Settings,
  Rocket,
  Key,
  Route,
  Box,
  DollarSign
} from 'lucide-react';
import { COST_MAP } from '../hooks/useCostCalculator';

const iconConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  // Clients
  'Web Client':      { icon: Monitor,       color: '#3b82f6', bg: '#1e3a5f' },
  'Mobile Client':   { icon: Smartphone,    color: '#3b82f6', bg: '#1e3a5f' },
  'Desktop App':     { icon: AppWindow,     color: '#3b82f6', bg: '#1e3a5f' },
  'IoT Device':      { icon: Cpu,           color: '#3b82f6', bg: '#1e3a5f' },

  // Networking
  'CDN':             { icon: Globe,         color: '#06b6d4', bg: '#164e63' },
  'DNS':             { icon: Route,         color: '#06b6d4', bg: '#164e63' },
  'API Gateway':     { icon: Shield,        color: '#8b5cf6', bg: '#312e81' },
  'Load Balancer':   { icon: GitMerge,      color: '#ec4899', bg: '#831843' },
  'Reverse Proxy':   { icon: Workflow,      color: '#a78bfa', bg: '#312e81' },
  'WAF':             { icon: ShieldAlert,   color: '#ef4444', bg: '#7f1d1d' },
  'VPC / Network':   { icon: Network,       color: '#6366f1', bg: '#312e81' },

  // Compute
  'Server':          { icon: Server,        color: '#22c55e', bg: '#14532d' },
  'Microservice':    { icon: Container,     color: '#22c55e', bg: '#14532d' },
  'Serverless Fn':   { icon: Cloud,         color: '#38bdf8', bg: '#0c4a6e' },
  'Worker':          { icon: Layers,        color: '#34d399', bg: '#064e3b' },
  'Cron Job':        { icon: Clock,         color: '#10b981', bg: '#064e3b' },
  'ML Model':        { icon: Brain,         color: '#f43f5e', bg: '#881337' },

  // Storage
  'SQL Database':    { icon: Database,      color: '#f59e0b', bg: '#78350f' },
  'NoSQL Database':  { icon: Box,           color: '#fb923c', bg: '#7c2d12' },
  'Cache':           { icon: Zap,           color: '#ef4444', bg: '#7f1d1d' },
  'Object Storage':  { icon: HardDrive,     color: '#a3e635', bg: '#365314' },
  'Search Index':    { icon: Search,        color: '#2dd4bf', bg: '#134e4a' },
  'Graph Database':  { icon: Share2,        color: '#f59e0b', bg: '#78350f' },
  'Time Series DB':  { icon: LineChart,     color: '#f59e0b', bg: '#78350f' },

  // Messaging
  'Message Queue':   { icon: MessageSquare, color: '#f97316', bg: '#7c2d12' },
  'Event Stream':    { icon: Radio,         color: '#fb7185', bg: '#881337' },
  'Pub/Sub':         { icon: Bell,          color: '#e879f9', bg: '#701a75' },
  'WebSockets':      { icon: ArrowLeftRight,color: '#d946ef', bg: '#701a75' },

  // Platform
  'Auth Service':    { icon: Lock,          color: '#fbbf24', bg: '#78350f' },
  'Rate Limiter':    { icon: Gauge,         color: '#f87171', bg: '#7f1d1d' },
  'Monitoring':      { icon: Activity,      color: '#4ade80', bg: '#14532d' },
  'Logger':          { icon: FileText,      color: '#94a3b8', bg: '#1e293b' },
  'Config Service':  { icon: Settings,      color: '#cbd5e1', bg: '#334155' },
  'CI/CD Pipeline':  { icon: Rocket,        color: '#3b82f6', bg: '#1e3a5f' },
  'Key Management':  { icon: Key,           color: '#fbbf24', bg: '#78350f' },
};

const handleStyle = {
  width: 10,
  height: 10,
  border: '2px solid #334155',
};

function CustomNode({ id, data, selected }: NodeProps) {
  const { setNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(data.label as string);
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState((data.note as string) || '');
  const [editingCost, setEditingCost] = useState(false);
  const defaultCost = COST_MAP[(data.type as string) ?? ''] ?? 0;
  const currentCost = (data.cost as number) ?? defaultCost;
  const [costValue, setCostValue] = useState(String(currentCost));

  const config = iconConfig[data.type as string] || iconConfig['Microservice'];
  const Icon = config.icon;

  const finishEditing = useCallback(() => {
    setEditing(false);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label: inputValue } } : n,
      ),
    );
  }, [id, inputValue, setNodes]);

  const finishEditingNote = useCallback(() => {
    setEditingNote(false);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, note: noteValue } } : n,
      ),
    );
  }, [id, noteValue, setNodes]);

  const finishEditingCost = useCallback(() => {
    setEditingCost(false);
    const parsed = parseFloat(costValue);
    const finalCost = isNaN(parsed) ? defaultCost : Math.max(0, Math.round(parsed));
    setCostValue(String(finalCost));
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, cost: finalCost } } : n,
      ),
    );
  }, [id, costValue, defaultCost, setNodes]);

  const replicas = (data.replicas as number) ?? 1;
  const instanceSize = (data.instanceSize as string) ?? 'Medium';

  const updateScale = useCallback((newReplicas: number, newSize: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, replicas: newReplicas, instanceSize: newSize } } : n
      )
    );
  }, [id, setNodes]);


  // Determine simulation status styling
  const status = data.status as string | undefined;
  const isCrashed = status === 'crashed';
  const isHealthy = status === 'healthy';

  const containerBorder = isCrashed
    ? '2px solid #ef4444'
    : isHealthy
      ? '2px solid #22c55e'
      : '1px solid #334155';

  const containerAnimation = isCrashed
    ? 'crash-pulse 1.2s ease-in-out infinite'
    : isHealthy
      ? 'healthy-pulse 2s ease-in-out infinite'
      : 'none';

  const isContainer = ['Server', 'VPC / Network', 'Kubernetes Cluster'].includes(data.type as string);

  return (
    <div
      style={{
        background: isCrashed ? '#1a1015' : '#1e293b',
        border: containerBorder,
        borderRadius: 10,
        padding: '10px 16px',
        minWidth: 160,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: containerAnimation,
        transition: 'background 0.3s, border 0.3s',
        position: 'relative',
        zIndex: isContainer ? -1 : 1,
        width: '100%',
        height: '100%',
      }}
    >
      <NodeResizer 
        color="#3b82f6" 
        isVisible={selected} 
        minWidth={160} 
        minHeight={60} 
      />
      {/* Crash badge */}
      {isCrashed && (
        <div style={{
          position: 'absolute',
          top: -10,
          right: -6,
          background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 6,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: '0.05em',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
          zIndex: 10,
        }}>
          ⚠ OVERLOADED
        </div>
      )}
      {/* Handles — every side has both source & target for full flexibility */}
      <Handle type="target" position={Position.Top}    id="t-in"  style={{ ...handleStyle, background: '#60a5fa', zIndex: 1 }} />
      <Handle type="source" position={Position.Top}    id="t-out" style={{ ...handleStyle, background: '#60a5fa', zIndex: 2, opacity: 0 }} />

      <Handle type="target" position={Position.Right}  id="r-in"  style={{ ...handleStyle, background: '#60a5fa', zIndex: 1 }} />
      <Handle type="source" position={Position.Right}  id="r-out" style={{ ...handleStyle, background: '#60a5fa', zIndex: 2, opacity: 0 }} />

      <Handle type="target" position={Position.Bottom} id="b-in"  style={{ ...handleStyle, background: '#60a5fa', zIndex: 1 }} />
      <Handle type="source" position={Position.Bottom} id="b-out" style={{ ...handleStyle, background: '#60a5fa', zIndex: 2, opacity: 0 }} />

      <Handle type="target" position={Position.Left}   id="l-in"  style={{ ...handleStyle, background: '#60a5fa', zIndex: 1 }} />
      <Handle type="source" position={Position.Left}   id="l-out" style={{ ...handleStyle, background: '#60a5fa', zIndex: 2, opacity: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Icon */}
          <div
            style={{
              background: config.bg,
              borderRadius: 8,
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color={config.color} />
          </div>

          {/* Label — double click to edit */}
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
                fontSize: 13,
                fontWeight: 500,
                padding: '3px 8px',
                border: '1px solid #3b82f6',
                borderRadius: 5,
                outline: 'none',
                width: 120,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            />
          ) : (
            <span
              onDoubleClick={() => {
                setInputValue(data.label as string);
                setEditing(true);
              }}
              style={{
                color: '#e2e8f0',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'text',
                userSelect: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {data.label as string}
            </span>
          )}
        </div>

        {/* Note toggle button */}
        <button
          onClick={() => setEditingNote(!editingNote)}
          title="Add/Edit Note"
          style={{
            background: 'transparent',
            border: 'none',
            color: (editingNote || data.note) ? '#3b82f6' : '#64748b',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = (editingNote || data.note) ? '#3b82f6' : '#64748b')}
        >
          <FileText size={14} />
        </button>
      </div>

      {/* Cost Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 2px',
          borderTop: '1px solid #334155',
        }}
      >
        <DollarSign size={12} color="#10b981" style={{ flexShrink: 0 }} />
        {editingCost ? (
          <input
            value={costValue}
            onChange={(e) => setCostValue(e.target.value)}
            onBlur={finishEditingCost}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') finishEditingCost();
            }}
            autoFocus
            className="nodrag nopan"
            style={{
              background: '#0f172a',
              color: '#10b981',
              fontSize: 11,
              fontWeight: 600,
              padding: '1px 6px',
              border: '1px solid #10b981',
              borderRadius: 4,
              outline: 'none',
              width: 50,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
        ) : (
          <span
            onClick={() => {
              setCostValue(String(currentCost));
              setEditingCost(true);
            }}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#10b981',
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentCost}
          </span>
        )}
        <span style={{ fontSize: 10, color: '#475569' }}>/mo</span>
      </div>

      {/* Note Section */}
      {(editingNote || data.note) && (
        <div style={{
          borderTop: '1px solid #334155',
          paddingTop: 10,
          width: '100%',
        }}>
          {editingNote ? (
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={finishEditingNote}
              onKeyDown={(e) => e.stopPropagation()} // Prevent reactflow backspace deletion
              autoFocus
              placeholder="e.g. Rate limits to 100 req/sec"
              className="nodrag nopan"
              style={{
                background: '#0f172a',
                color: '#94a3b8',
                fontSize: 11,
                padding: '6px',
                border: '1px solid #3b82f6',
                borderRadius: 4,
                outline: 'none',
                width: '100%',
                minHeight: 50,
                fontFamily: 'Inter, system-ui, sans-serif',
                resize: 'vertical',
              }}
            />
          ) : (
            <div
              onDoubleClick={() => {
                setNoteValue((data.note as string) || '');
                setEditingNote(true);
              }}
              style={{
                color: '#94a3b8',
                fontSize: 11,
                cursor: 'text',
                userSelect: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.4,
              }}
            >
              {data.note as string}
            </div>
          )}
        </div>
      )}

      {/* Scale Badge (Visible when NOT selected) */}
      {!selected && (replicas > 1 || instanceSize !== 'Medium') && (
        <div style={{
          position: 'absolute',
          bottom: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#334155',
          color: '#e2e8f0',
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: 10,
          border: '1px solid #475569',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          {replicas}x {instanceSize}
        </div>
      )}

      {/* Scaling Controls (Visible when selected) */}
      {selected && (
        <div className="nodrag nopan" style={{
          borderTop: '1px solid #334155',
          paddingTop: 8,
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Replicas</span>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: 4, overflow: 'hidden', border: '1px solid #334155' }}>
              <button 
                onClick={() => updateScale(Math.max(1, replicas - 1), instanceSize)}
                style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>-</button>
              <span style={{ fontSize: 11, color: '#e2e8f0', padding: '0 4px', minWidth: 20, textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{replicas}</span>
              <button 
                onClick={() => updateScale(replicas + 1, instanceSize)}
                style={{ background: 'transparent', border: 'none', color: '#e2e8f0', padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Size</span>
            <select
              value={instanceSize}
              onChange={(e) => updateScale(replicas, e.target.value)}
              style={{
                background: '#0f172a',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 4,
                fontSize: 10,
                padding: '2px 4px',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <option value="Small">Small</option>
              <option value="Medium">Medium</option>
              <option value="Large">Large</option>
              <option value="X-Large">X-Large</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CustomNode);
