// src/components/TelemetryCard.tsx
// Compact telemetry signal card for the mining dashboard.
// Shows a label, value, unit, status badge, and a simple visual fill bar.

import React from 'react';

type SignalStatus = 'NOMINAL' | 'WARNING' | 'CRITICAL';

interface TelemetryCardProps {
  icon: React.ReactNode;
  label: string;
  category: string;
  value: number;
  unit: string;
  status: SignalStatus;
  statusLabel: string;
  min: number;
  max: number;
  /** Thresholds for coloring the fill bar */
  warningThreshold?: number;
  criticalThreshold?: number;
  /** Whether higher values are bad (temperature, congestion) or lower values are bad (fleet) */
  invertScale?: boolean;
}

function getStatusColors(status: SignalStatus) {
  switch (status) {
    case 'CRITICAL':
      return {
        badge: 'text-hazard-red border-hazard-red/40 bg-red-950/30',
        fill: 'bg-hazard-red',
        value: 'text-hazard-red',
        dot: 'bg-hazard-red',
      };
    case 'WARNING':
      return {
        badge: 'text-warning-amber border-warning-amber/40 bg-amber-950/20',
        fill: 'bg-warning-amber',
        value: 'text-warning-amber',
        dot: 'bg-warning-amber',
      };
    default:
      return {
        badge: 'text-nominal-green border-nominal-green/40 bg-emerald-950/20',
        fill: 'bg-nominal-green',
        value: 'text-nominal-green',
        dot: 'bg-nominal-green',
      };
  }
}

export default function TelemetryCard({
  icon,
  label,
  category,
  value,
  unit,
  status,
  statusLabel,
  min,
  max,
  invertScale = false,
}: TelemetryCardProps) {
  const colors = getStatusColors(status);
  const range = max - min;
  const normalized = Math.max(0, Math.min(1, (value - min) / range));
  // For inverted scale (fleet: lower = worse), the bar fills from right
  const fillPct = invertScale ? (1 - normalized) * 100 : normalized * 100;

  return (
    <div
      className={`bg-obsidian/80 border rounded-lg p-3.5 flex flex-col gap-2 transition-colors duration-300 ${
        status === 'CRITICAL'
          ? 'border-hazard-red/30'
          : status === 'WARNING'
          ? 'border-warning-amber/25'
          : 'border-industrial-border'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-telemetry-cyan">{icon}</span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-none">
              {category}
            </span>
            <span className="text-xs font-semibold text-slate-300 leading-tight">{label}</span>
          </div>
        </div>
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot} ${
            status !== 'NOMINAL' ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black tabular-nums leading-none ${colors.value}`}>
          {value}
        </span>
        <span className="text-xs text-slate-500 font-medium">{unit}</span>
      </div>

      {/* Fill bar */}
      <div className="h-1 bg-industrial-slate/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.fill}`}
          style={{ width: `${fillPct}%`, opacity: 0.8 }}
        />
      </div>

      {/* Status badge */}
      <span
        className={`text-[10px] font-bold px-2 py-0.5 rounded border w-fit ${colors.badge}`}
      >
        {statusLabel}
      </span>
    </div>
  );
}
