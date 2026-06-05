import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X, Copy, Check, FileCode2, Container, Terminal, Folder, FolderOpen, FileText, ChevronRight, ChevronDown, CopyPlus } from 'lucide-react';
import type { GoFile } from '../utils/iacGenerators';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  kubernetesYAML: string;
  goFiles: GoFile[];
}

type TabId = 'kubernetes' | 'go';

// ── Tree-building helpers ─────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: GoFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const existing = current.find((n) => n.name === part);

      if (existing) {
        current = existing.children;
      } else {
        const node: TreeNode = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isDir: !isLast,
          children: [],
        };
        current.push(node);
        current = node.children;
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(root);

  return root;
}

// ── TreeItem component ────────────────────────────────────

function TreeItem({
  node,
  depth,
  selectedPath,
  expandedDirs,
  onSelectFile,
  onToggleDir,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string;
  expandedDirs: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.isDir) {
      onToggleDir(node.path);
    } else {
      onSelectFile(node.path);
    }
  };

  // File extension to color mapping
  const getFileColor = (name: string) => {
    if (name.endsWith('.go')) return '#00ADD8';
    if (name.endsWith('.mod')) return '#E8488B';
    if (name.endsWith('.yaml') || name.endsWith('.yml')) return '#CB4A32';
    if (name.endsWith('.md')) return '#519ABA';
    if (name.startsWith('Makefile')) return '#6D8086';
    if (name.startsWith('Dockerfile')) return '#2496ED';
    return '#94a3b8';
  };

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          paddingLeft: 8 + depth * 16,
          cursor: 'pointer',
          background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
          borderLeft: isSelected ? '2px solid #6366f1' : '2px solid transparent',
          color: isSelected ? '#e2e8f0' : '#94a3b8',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          whiteSpace: 'nowrap',
          transition: 'background 0.1s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent';
        }}
      >
        {node.isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
            ) : (
              <ChevronRight size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
            )}
            {isExpanded ? (
              <FolderOpen size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            ) : (
              <Folder size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
            )}
          </>
        ) : (
          <>
            <span style={{ width: 12, flexShrink: 0 }} />
            <FileText size={14} color={getFileColor(node.name)} style={{ flexShrink: 0 }} />
          </>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
      </div>
      {node.isDir && isExpanded && node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          expandedDirs={expandedDirs}
          onSelectFile={onSelectFile}
          onToggleDir={onToggleDir}
        />
      ))}
    </>
  );
}

// ── Main modal ────────────────────────────────────────────

export default function ExportModal({ isOpen, onClose, kubernetesYAML, goFiles }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('kubernetes');
  const [copied, setCopied] = useState(false);
  const [selectedGoFile, setSelectedGoFile] = useState<string>('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const overlayRef = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => buildTree(goFiles), [goFiles]);
  const fileMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of goFiles) map.set(f.path, f.content);
    return map;
  }, [goFiles]);

  // Reset state on open — auto-select first file and expand all dirs
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      if (goFiles.length > 0) {
        setSelectedGoFile(goFiles[0].path);
        // Expand all directories by default
        const dirs = new Set<string>();
        for (const f of goFiles) {
          const parts = f.path.split('/');
          for (let i = 1; i < parts.length; i++) {
            dirs.add(parts.slice(0, i).join('/'));
          }
        }
        setExpandedDirs(dirs);
      }
    }
  }, [isOpen, goFiles]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const activeContent = activeTab === 'kubernetes'
    ? kubernetesYAML
    : (fileMap.get(selectedGoFile) ?? '// Select a file from the tree');

  const handleCopy = useCallback(async (text?: string) => {
    const content = text ?? activeContent;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activeContent]);

  const handleCopyAll = useCallback(() => {
    const allContent = goFiles
      .map((f) => `// ── ${f.path} ${'─'.repeat(Math.max(1, 50 - f.path.length))}\n\n${f.content}`)
      .join('\n\n');
    handleCopy(allContent);
  }, [goFiles, handleCopy]);

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setCopied(false);
  }, []);

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (!isOpen) return null;

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'kubernetes', label: 'Kubernetes YAML', icon: Container },
    { id: 'go', label: 'Go Project', icon: Terminal },
  ];

  const isGoTab = activeTab === 'go';

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'iac-fadeIn 0.2s ease-out',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes iac-fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes iac-slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .iac-modal-code::-webkit-scrollbar,
        .iac-file-tree::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .iac-modal-code::-webkit-scrollbar-track,
        .iac-file-tree::-webkit-scrollbar-track {
          background: transparent;
        }
        .iac-modal-code::-webkit-scrollbar-thumb,
        .iac-file-tree::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .iac-modal-code::-webkit-scrollbar-thumb:hover,
        .iac-file-tree::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>

      <div
        style={{
          width: 'min(1100px, 94vw)',
          maxHeight: '88vh',
          background: 'linear-gradient(165deg, #111827 0%, #0f172a 100%)',
          border: '1px solid #1e293b',
          borderRadius: 16,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'iac-slideUp 0.3s ease-out',
        }}
      >
        {/* ── Header ─────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #1e293b',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: 8,
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileCode2 size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>
                Export Infrastructure Code
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Generated from your system design diagram
              </p>
            </div>
          </div>
          <button
            id="iac-modal-close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f1f5f9';
              e.currentTarget.style.background = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tab Bar ─────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            padding: '0 20px',
            borderBottom: '1px solid #1e293b',
            background: 'rgba(15, 23, 42, 0.3)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`iac-tab-${tab.id}`}
                onClick={() => switchTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '12px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                  color: isActive ? '#e2e8f0' : '#64748b',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#64748b';
                }}
              >
                <TabIcon size={14} />
                {tab.label}
                {tab.id === 'go' && (
                  <span style={{
                    fontSize: 10,
                    background: '#1e293b',
                    color: '#64748b',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontWeight: 500,
                  }}>
                    {goFiles.length} files
                  </span>
                )}
              </button>
            );
          })}

          {/* Action buttons on the right */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isGoTab && (
              <button
                id="iac-copy-all-btn"
                onClick={handleCopyAll}
                title="Copy all files"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#475569';
                  e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <CopyPlus size={12} />
                Copy All
              </button>
            )}
            <button
              id="iac-copy-btn"
              onClick={() => handleCopy()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: copied
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'transform 0.1s, box-shadow 0.15s',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : isGoTab ? 'Copy File' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>

        {/* ── Content Area ────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* File tree sidebar (Go tab only) */}
          {isGoTab && (
            <div
              className="iac-file-tree"
              style={{
                width: 250,
                minWidth: 250,
                borderRight: '1px solid #1e293b',
                background: 'rgba(10, 15, 30, 0.5)',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '8px 0',
              }}
            >
              {/* Tree header */}
              <div style={{
                padding: '4px 12px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
                marginBottom: 4,
              }}>
                Explorer
              </div>
              {tree.map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedGoFile}
                  expandedDirs={expandedDirs}
                  onSelectFile={setSelectedGoFile}
                  onToggleDir={handleToggleDir}
                />
              ))}
            </div>
          )}

          {/* Code panel */}
          <div
            className="iac-modal-code"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 16,
            }}
          >
            {/* File path breadcrumb for Go tab */}
            {isGoTab && selectedGoFile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                marginBottom: 12,
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 6,
                border: '1px solid #1e293b',
              }}>
                {selectedGoFile.split('/').map((part, i, arr) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      fontSize: 11,
                      color: i === arr.length - 1 ? '#e2e8f0' : '#64748b',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                      fontWeight: i === arr.length - 1 ? 600 : 400,
                    }}>
                      {part}
                    </span>
                    {i < arr.length - 1 && (
                      <ChevronRight size={10} color="#475569" />
                    )}
                  </span>
                ))}
              </div>
            )}

            <pre
              style={{
                margin: 0,
                padding: 20,
                background: '#0a0f1a',
                border: '1px solid #1e293b',
                borderRadius: 10,
                overflow: 'auto',
                maxHeight: isGoTab ? 'calc(88vh - 220px)' : 'calc(88vh - 180px)',
                lineHeight: 1.65,
              }}
            >
              <code
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                  fontSize: 12.5,
                  color: '#e2e8f0',
                  whiteSpace: 'pre',
                  tabSize: 4,
                }}
              >
                {activeContent}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
