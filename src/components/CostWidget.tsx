import { useState, useEffect, useRef } from 'react';
import { DollarSign, ChevronUp, ChevronDown } from 'lucide-react';
import type { CostBreakdownItem } from '../hooks/useCostCalculator';

interface CostWidgetProps {
  totalCost: number;
  breakdown: CostBreakdownItem[];
}

export default function CostWidget({ totalCost, breakdown }: CostWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [displayCost, setDisplayCost] = useState(0);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame>>();

  // Animate the cost number counting up/down
  useEffect(() => {
    const start = displayCost;
    const end = totalCost;
    const duration = 400;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      setDisplayCost(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCost]);

  if (breakdown.length === 0) return null;

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid #1e293b',
        borderRadius: 14,
        padding: '12px 16px',
        minWidth: 220,
        maxWidth: 300,
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              borderRadius: 8,
              padding: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={14} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, letterSpacing: '0.03em' }}>
              EST. RUN RATE
            </div>
            <div
              className="cost-counter"
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#10b981',
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ${displayCost.toLocaleString()}
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>/mo</span>
            </div>
          </div>
        </div>
        <div
          style={{
            color: '#475569',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Expandable breakdown */}
      <div
        style={{
          maxHeight: expanded ? 240 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div
          style={{
            borderTop: '1px solid #1e293b',
            marginTop: 10,
            paddingTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {breakdown.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '3px 4px',
                borderRadius: 4,
                fontSize: 11,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                {item.label}
              </span>
              <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                ${item.cost}/mo
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: '1px solid #1e293b',
            marginTop: 6,
            paddingTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span style={{ color: '#94a3b8' }}>Total ({breakdown.length} items)</span>
          <span style={{ color: '#10b981' }}>${totalCost.toLocaleString()}/mo</span>
        </div>
      </div>
    </div>
  );
}
