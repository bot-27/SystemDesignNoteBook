import { useEffect, useRef } from 'react';
import { X, Brain, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';

interface AIReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  review: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function AIReviewDrawer({
  isOpen,
  onClose,
  review,
  isLoading,
  error,
  onRetry,
}: AIReviewDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as review streams in
  useEffect(() => {
    if (contentRef.current && review) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [review]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(2px)',
          animation: 'drawer-fadeIn 0.2s ease-out',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 90vw)',
          zIndex: 9999,
          background: 'linear-gradient(180deg, #111827 0%, #0f172a 100%)',
          borderLeft: '1px solid #1e293b',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'drawer-slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            background: 'rgba(15, 23, 42, 0.6)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                borderRadius: 8,
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Brain size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>
                Architecture Review
              </h2>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', marginTop: 1 }}>
                Powered by local LLM (Ollama)
              </p>
            </div>
          </div>
          <button
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

        {/* Content */}
        <div
          ref={contentRef}
          className="ai-drawer-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
          }}
        >
          {/* Loading state */}
          {isLoading && !review && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '60px 20px',
              }}
            >
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  borderRadius: 20,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'ai-pulse 2s ease-in-out infinite',
                }}
              >
                <Brain size={32} color="#f43f5e" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                  Analyzing Architecture...
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  The AI is reviewing your system design
                </div>
              </div>
              {/* Skeleton lines */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {[100, 85, 92, 70, 95, 60].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 12,
                      width: `${w}%`,
                      background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)',
                      backgroundSize: '200% 100%',
                      borderRadius: 6,
                      animation: `shimmer 1.5s linear infinite`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '40px 20px',
              }}
            >
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle size={28} color="#ef4444" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fca5a5', marginBottom: 8 }}>
                  Connection Failed
                </div>
                <pre
                  style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: 14,
                    whiteSpace: 'pre-wrap',
                    textAlign: 'left',
                    lineHeight: 1.6,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                  }}
                >
                  {error}
                </pre>
              </div>
              <button
                onClick={onRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {/* Review content */}
          {review && (
            <div
              style={{
                fontSize: 13,
                color: '#cbd5e1',
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {renderFormattedReview(review)}
              {isLoading && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                </span>
              )}
            </div>
          )}

          {/* Empty state (no review yet, not loading, no error) */}
          {!review && !isLoading && !error && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <Brain size={40} color="#334155" />
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Click the button below to start an architecture review
              </div>
              <button
                onClick={onRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 4px 16px rgba(244, 63, 94, 0.3)',
                }}
              >
                <Brain size={16} />
                Analyze My Architecture
              </button>
            </div>
          )}
        </div>

        {/* Footer — re-analyze button when review is shown */}
        {review && !isLoading && (
          <div
            style={{
              borderTop: '1px solid #1e293b',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
              background: 'rgba(15, 23, 42, 0.6)',
            }}
          >
            <button
              onClick={onRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)',
              }}
            >
              <RefreshCw size={14} />
              Re-Analyze
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────
// Simple markdown-lite renderer for AI output
// ──────────────────────────────────────────────────────

function renderFormattedReview(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(
        <hr key={i} style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '12px 0' }} />
      );
      continue;
    }

    // Bold headings like **Issue:** or **Severity:**
    if (line.includes('**Issue:**') || line.includes('**Problem:**')) {
      const content = line.replace(/\*\*(Issue|Problem):\*\*/g, '').trim();
      elements.push(
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 12, marginBottom: 4 }}>
          <span style={{ color: '#ef4444', fontSize: 14, flexShrink: 0 }}>●</span>
          <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: 13 }}>{content}</span>
        </div>
      );
      continue;
    }

    if (line.includes('**Severity:**')) {
      const severity = line.replace(/\*\*Severity:\*\*/g, '').trim();
      const color = severity.toLowerCase().includes('critical') ? '#ef4444'
        : severity.toLowerCase().includes('high') ? '#f97316'
        : severity.toLowerCase().includes('medium') ? '#f59e0b'
        : '#10b981';
      elements.push(
        <div key={i} style={{ marginLeft: 20, marginBottom: 2 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color,
            background: `${color}15`,
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {severity}
          </span>
        </div>
      );
      continue;
    }

    if (line.includes('**Suggested Fix:**') || line.includes('**Fix:**')) {
      const content = line.replace(/\*\*(Suggested Fix|Fix):\*\*/g, '').trim();
      elements.push(
        <div key={i} style={{
          marginLeft: 20,
          marginTop: 4,
          padding: '6px 10px',
          background: 'rgba(16, 185, 129, 0.08)',
          borderLeft: '3px solid #10b981',
          borderRadius: '0 6px 6px 0',
          fontSize: 12,
          color: '#6ee7b7',
          lineHeight: 1.5,
        }}>
          💡 {content}
        </div>
      );
      continue;
    }

    // Regular text — handle remaining **bold** inline
    const rendered = line.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    if (rendered !== line) {
      elements.push(
        <div key={i} style={{ marginLeft: line.startsWith(' ') ? 20 : 0 }}>
          <span dangerouslySetInnerHTML={{ __html: rendered }} style={{ color: '#cbd5e1' }} />
        </div>
      );
    } else {
      elements.push(
        <div key={i} style={{ color: '#94a3b8', minHeight: line.trim() === '' ? 8 : undefined }}>
          {line}
        </div>
      );
    }
  }

  return elements;
}
