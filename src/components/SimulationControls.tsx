import { Play, Pause, Zap } from 'lucide-react';

interface SimulationControlsProps {
  isSimulating: boolean;
  globalRPS: number;
  onRPSChange: (rps: number) => void;
  onToggle: () => void;
}

export default function SimulationControls({
  isSimulating,
  globalRPS,
  onRPSChange,
  onToggle,
}: SimulationControlsProps) {
  // Convert RPS to slider value (logarithmic scale)
  const rpsToSlider = (rps: number) => Math.log10(rps) * 100;
  const sliderToRps = (val: number) => Math.round(Math.pow(10, val / 100));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        background: isSimulating
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(249, 115, 22, 0.12) 100%)'
          : '#1e293b',
        border: isSimulating
          ? '1px solid rgba(239, 68, 68, 0.3)'
          : '1px solid #334155',
        borderRadius: 8,
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Play/Pause button */}
      <button
        id="sim-toggle-btn"
        onClick={onToggle}
        title={isSimulating ? 'Stop Simulation' : 'Start Traffic Simulation'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          background: isSimulating
            ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
            : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: isSimulating
            ? '0 2px 8px rgba(239, 68, 68, 0.3)'
            : '0 2px 8px rgba(16, 185, 129, 0.3)',
          transition: 'all 0.2s',
        }}
      >
        {isSimulating ? (
          <>
            <Pause size={12} />
            Stop
          </>
        ) : (
          <>
            <Play size={12} />
            Chaos
          </>
        )}
      </button>

      {/* RPS slider — shown only when simulating */}
      {isSimulating && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            animation: 'sim-fadeIn 0.3s ease-out',
          }}
        >
          <Zap size={12} color="#f97316" style={{ flexShrink: 0 }} />
          <input
            type="range"
            min={rpsToSlider(10)}
            max={rpsToSlider(10000)}
            step={1}
            value={rpsToSlider(globalRPS)}
            onChange={(e) => onRPSChange(sliderToRps(Number(e.target.value)))}
            style={{
              width: 80,
              height: 4,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)',
              borderRadius: 4,
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: globalRPS > 5000 ? '#ef4444' : globalRPS > 1000 ? '#f59e0b' : '#10b981',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 52,
              whiteSpace: 'nowrap',
            }}
          >
            {globalRPS.toLocaleString()} rps
          </span>
        </div>
      )}
    </div>
  );
}
