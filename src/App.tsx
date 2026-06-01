import { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
  BackgroundVariant,
  type Connection,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Save, Upload } from 'lucide-react';

import Sidebar from './components/Sidebar';
import CustomNode from './components/CustomNode';
import EditableEdge from './components/EditableEdge';

// Register custom types outside component to keep references stable
const nodeTypes = { custom: CustomNode };
const edgeTypes = { editable: EditableEdge };

let nodeId = 0;
const getNodeId = () => `node_${nodeId++}`;

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // --- Connection handler: creates a directed edge with editable label ---
  const onConnect = useCallback(
    (connection: Connection) => {
      const edge = {
        ...connection,
        type: 'editable',
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        data: { label: '' },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges],
  );

  // --- Drop handler: spawns a new custom node where the user drops ---
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/systemdesign');
      if (!type || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getNodeId(),
        type: 'custom',
        position,
        data: { type, label: type },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance, setNodes],
  );

  const onSave = useCallback(() => {
    if (rfInstance) {
      const flow = rfInstance.toObject();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flow));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "system-design.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }, [rfInstance]);

  const onRestore = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const flow = JSON.parse(e.target?.result as string);
          if (flow) {
            const { x = 0, y = 0, zoom = 1 } = flow.viewport;
            setNodes(flow.nodes || []);
            setEdges(flow.edges || []);
            rfInstance?.setViewport({ x, y, zoom });
          }
        } catch (err) {
          console.error('Failed to parse flow file', err);
        }
      };
      reader.readAsText(file);
    }
    // reset input so the same file can be loaded again if needed
    event.target.value = '';
  }, [rfInstance, setNodes, setEdges]);

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <Sidebar />
      <div style={{ flex: 1 }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode="Backspace"
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: '#0a0f1a' }}
        >
          <Panel position="top-right" style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <Save size={14} /> Save
            </button>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              <Upload size={14} /> Load
              <input type="file" accept=".json" hidden onChange={onRestore} />
            </label>
          </Panel>
          <Controls
            position="bottom-right"
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
            }}
          />
          <MiniMap
            nodeColor="#1e293b"
            nodeStrokeColor="#334155"
            maskColor="rgba(0, 0, 0, 0.7)"
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#1e293b"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// Wrap in ReactFlowProvider so useReactFlow() works inside custom nodes/edges
export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
