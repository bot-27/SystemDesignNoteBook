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
  Box
} from 'lucide-react';

interface ComponentDef {
  type: string;
  icon: React.ElementType;
  color: string;
  category: string;
}

const components: ComponentDef[] = [
  // Clients
  { type: 'Web Client',      icon: Monitor,       color: '#3b82f6', category: 'Clients' },
  { type: 'Mobile Client',   icon: Smartphone,    color: '#3b82f6', category: 'Clients' },
  { type: 'Desktop App',     icon: AppWindow,     color: '#3b82f6', category: 'Clients' },
  { type: 'IoT Device',      icon: Cpu,           color: '#3b82f6', category: 'Clients' },

  // Networking
  { type: 'CDN',             icon: Globe,         color: '#06b6d4', category: 'Networking' },
  { type: 'DNS',             icon: Route,         color: '#06b6d4', category: 'Networking' },
  { type: 'API Gateway',     icon: Shield,        color: '#8b5cf6', category: 'Networking' },
  { type: 'Load Balancer',   icon: GitMerge,      color: '#ec4899', category: 'Networking' },
  { type: 'Reverse Proxy',   icon: Workflow,      color: '#a78bfa', category: 'Networking' },
  { type: 'WAF',             icon: ShieldAlert,   color: '#ef4444', category: 'Networking' },
  { type: 'VPC / Network',   icon: Network,       color: '#6366f1', category: 'Networking' },

  // Compute
  { type: 'Server',          icon: Server,        color: '#22c55e', category: 'Compute' },
  { type: 'Microservice',    icon: Container,     color: '#22c55e', category: 'Compute' },
  { type: 'Serverless Fn',   icon: Cloud,         color: '#38bdf8', category: 'Compute' },
  { type: 'Worker',          icon: Layers,        color: '#34d399', category: 'Compute' },
  { type: 'Cron Job',        icon: Clock,         color: '#10b981', category: 'Compute' },
  { type: 'ML Model',        icon: Brain,         color: '#f43f5e', category: 'Compute' },

  // Data Stores
  { type: 'SQL Database',    icon: Database,      color: '#f59e0b', category: 'Storage' },
  { type: 'NoSQL Database',  icon: Box,           color: '#fb923c', category: 'Storage' },
  { type: 'Cache',           icon: Zap,           color: '#ef4444', category: 'Storage' },
  { type: 'Object Storage',  icon: HardDrive,     color: '#a3e635', category: 'Storage' },
  { type: 'Search Index',    icon: Search,        color: '#2dd4bf', category: 'Storage' },
  { type: 'Graph Database',  icon: Share2,        color: '#f59e0b', category: 'Storage' },
  { type: 'Time Series DB',  icon: LineChart,     color: '#f59e0b', category: 'Storage' },

  // Messaging
  { type: 'Message Queue',   icon: MessageSquare, color: '#f97316', category: 'Messaging' },
  { type: 'Event Stream',    icon: Radio,         color: '#fb7185', category: 'Messaging' },
  { type: 'Pub/Sub',         icon: Bell,          color: '#e879f9', category: 'Messaging' },
  { type: 'WebSockets',      icon: ArrowLeftRight,color: '#d946ef', category: 'Messaging' },

  // Observability & Security
  { type: 'Auth Service',    icon: Lock,          color: '#fbbf24', category: 'Platform' },
  { type: 'Rate Limiter',    icon: Gauge,         color: '#f87171', category: 'Platform' },
  { type: 'Monitoring',      icon: Activity,      color: '#4ade80', category: 'Platform' },
  { type: 'Logger',          icon: FileText,      color: '#94a3b8', category: 'Platform' },
  { type: 'Config Service',  icon: Settings,      color: '#cbd5e1', category: 'Platform' },
  { type: 'CI/CD Pipeline',  icon: Rocket,        color: '#3b82f6', category: 'Platform' },
  { type: 'Key Management',  icon: Key,           color: '#fbbf24', category: 'Platform' },
];

export default function Sidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/systemdesign', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: '#0f172a',
        borderRight: '1px solid #1e293b',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'Inter, system-ui, sans-serif',
        overflowY: 'auto',
      }}
    >
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          System Design
        </h1>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
          Drag components onto the canvas
        </p>
      </div>

      {/* Group by category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {['Clients', 'Networking', 'Compute', 'Storage', 'Messaging', 'Platform'].map((cat) => (
          <div key={cat}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '10px 4px 4px',
            }}>
              {cat}
            </div>
            {components
              .filter((c) => c.category === cat)
              .map(({ type, icon: Icon, color }) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => onDragStart(e, type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: '#1e293b',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    cursor: 'grab',
                    transition: 'border-color 0.15s, background 0.15s',
                    marginBottom: 4,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#475569';
                    (e.currentTarget as HTMLDivElement).style.background = '#253449';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
                    (e.currentTarget as HTMLDivElement).style.background = '#1e293b';
                  }}
                >
                  <Icon size={16} color={color} />
                  <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{type}</span>
                </div>
              ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: 12 }}>
        <p style={{ fontSize: 10, color: '#475569', lineHeight: 1.5 }}>
          <strong style={{ color: '#64748b' }}>Tips:</strong><br />
          • Click the document icon to add notes<br />
          • Double-click labels to rename<br />
          • Drag handles to connect nodes<br />
          • Select + Backspace to delete
        </p>
      </div>
    </aside>
  );
}
