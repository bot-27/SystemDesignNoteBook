import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  Panel,
  addEdge,
  updateEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
  BackgroundVariant,
  type Connection,
  type Edge,
  type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Save, Upload, FileCode2, Brain } from 'lucide-react';

import ExportModal from './components/ExportModal';
import { parseGraphToIaC } from './utils/parseGraphToIaC';
import { generateKubernetesYAML, generateGoProject } from './utils/iacGenerators';

import Sidebar from './components/Sidebar';
import CustomNode from './components/CustomNode';
import EditableEdge from './components/EditableEdge';

// Staff Engineer Suite
import { useCostCalculator } from './hooks/useCostCalculator';
import { useTrafficSimulation } from './hooks/useTrafficSimulation';
import { useArchitectureReview } from './hooks/useArchitectureReview';
import CostWidget from './components/CostWidget';
import SimulationControls from './components/SimulationControls';
import AIReviewDrawer from './components/AIReviewDrawer';

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
  const [exportOpen, setExportOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // ── Staff Engineer Suite hooks ──
  const { totalCost, breakdown } = useCostCalculator(nodes);
  const trafficSim = useTrafficSimulation(nodes, edges, setNodes, setEdges);
  const aiReview = useArchitectureReview(nodes, edges);

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

  // --- Edge update handler: allows dragging edge endpoints to reconnect ---
  const edgeUpdateSuccessful = useRef(true);

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessful.current = true;
      setEdges((eds) => updateEdge(oldEdge, newConnection, eds));
    },
    [setEdges],
  );

  const onEdgeUpdateEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeUpdateSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      edgeUpdateSuccessful.current = true;
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

      const payload = event.dataTransfer.getData('application/systemdesign');
      if (!payload || !rfInstance) return;

      let type = payload;
      let cost: number | undefined;

      try {
        const parsed = JSON.parse(payload);
        type = parsed.type;
        cost = parsed.cost;
      } catch (e) {
        // Fallback for older dragged items if any
      }

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getNodeId(),
        type: 'custom',
        position,
        data: { type, label: type, cost },
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

  // --- Handle loading a diagram in a new tab ---
  useEffect(() => {
    if (!rfInstance) return;

    const urlParams = new URLSearchParams(window.location.search);
    const loadId = urlParams.get('load');
    
    if (loadId) {
      const dataStr = localStorage.getItem(`system-design-load-${loadId}`);
      if (dataStr) {
        try {
          const flow = JSON.parse(dataStr);
          if (flow) {
            const { x = 0, y = 0, zoom = 1 } = flow.viewport || {};
            setNodes(flow.nodes || []);
            setEdges(flow.edges || []);
            // Wait slightly for nodes to mount before setting viewport
            setTimeout(() => {
              rfInstance.setViewport({ x, y, zoom });
            }, 50);
          }
        } catch (err) {
          console.error('Failed to parse loaded flow', err);
        }
        // Clean up storage
        localStorage.removeItem(`system-design-load-${loadId}`);
      }
      
      // Clean up URL
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, [rfInstance, setNodes, setEdges]);

  const onRestore = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        const id = Date.now().toString();
        try {
          // Store the file content temporarily in localStorage
          localStorage.setItem(`system-design-load-${id}`, fileContent);
          // Open the app in a new tab with the load ID
          window.open(window.location.pathname + '?load=' + id, '_blank');
        } catch (err) {
          console.error('Failed to store flow for new tab', err);
          alert('Error: File is too large or localStorage is blocked.');
        }
      };
      reader.readAsText(file);
    }
    // reset input so the same file can be loaded again if needed
    event.target.value = '';
  }, []);

  // ── IaC export: parse graph and generate code ──
  const parsedGraph = useMemo(() => parseGraphToIaC(nodes, edges), [nodes, edges]);
  const kubernetesYAML = useMemo(() => generateKubernetesYAML(parsedGraph), [parsedGraph]);
  const goFiles = useMemo(() => generateGoProject(parsedGraph), [parsedGraph]);

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
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onInit={setRfInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          edgeUpdatable
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
            <button
              id="iac-export-btn"
              onClick={() => setExportOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#e2e8f0',
                border: '1px solid #6366f1',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                transition: 'box-shadow 0.15s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.45)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <FileCode2 size={14} />
              Export Code
            </button>

            {/* Staff Suite: Simulation Controls */}
            <SimulationControls
              isSimulating={trafficSim.isSimulating}
              globalRPS={trafficSim.globalRPS}
              onRPSChange={trafficSim.setGlobalRPS}
              onToggle={trafficSim.toggleSimulation}
            />

            {/* Staff Suite: AI Review Button */}
            <button
              id="ai-review-btn"
              onClick={() => {
                setAiDrawerOpen(true);
                if (!aiReview.review && !aiReview.isLoading) {
                  aiReview.requestReview();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
                color: '#fff',
                border: '1px solid #f43f5e',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)',
                transition: 'box-shadow 0.15s, transform 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(244, 63, 94, 0.45)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(244, 63, 94, 0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Brain size={14} />
              AI Review
            </button>
          </Panel>

          {/* Staff Suite: Cost Estimator */}
          <Panel position="bottom-left">
            <CostWidget totalCost={totalCost} breakdown={breakdown} />
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

      {/* Modals & drawers rendered outside ReactFlow container to avoid stacking context issues */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        kubernetesYAML={kubernetesYAML}
        goFiles={goFiles}
      />

      <AIReviewDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        review={aiReview.review}
        isLoading={aiReview.isLoading}
        error={aiReview.error}
        onRetry={aiReview.requestReview}
      />
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
