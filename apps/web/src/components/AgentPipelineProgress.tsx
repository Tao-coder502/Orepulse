// src/components/AgentPipelineProgress.tsx
// UX-only progress indicator for the multi-agent inference pipeline.
// The actual Python process is a single long-running operation; these stage
// transitions are timed estimates only — NOT real backend telemetry.
// Approximate pipeline timing (based on verified E2E tests ≈75 s):
//   0–10 s   → Supervisor
//   10–25 s  → Fleet Agent
//   25–40 s  → Maintenance Agent
//   40–55 s  → Synthesis
//   55–65 s  → Safety Engine
//   65+ s    → Learning Agent / finalizing

import React, { useEffect, useState } from 'react';
import {
  Brain,
  Truck,
  Wrench,
  Layers,
  ShieldAlert,
  BookOpen,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface PipelineStage {
  key: string;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  // Seconds after loading starts when this stage becomes "active"
  activeAfterSec: number;
}

const STAGES: PipelineStage[] = [
  {
    key: 'supervisor',
    label: 'Supervisor Agent',
    subLabel: 'Ingesting scenario context & delegating',
    icon: <Brain className="w-4 h-4" />,
    activeAfterSec: 0,
  },
  {
    key: 'fleet',
    label: 'Fleet Analysis Agent',
    subLabel: 'Evaluating ramp congestion & fleet state',
    icon: <Truck className="w-4 h-4" />,
    activeAfterSec: 10,
  },
  {
    key: 'maintenance',
    label: 'Maintenance Analysis Agent',
    subLabel: 'Assessing equipment heat & mechanical stress',
    icon: <Wrench className="w-4 h-4" />,
    activeAfterSec: 25,
  },
  {
    key: 'synthesis',
    label: 'Supervisor Synthesis',
    subLabel: 'Fusing specialist findings into advisory proposal',
    icon: <Layers className="w-4 h-4" />,
    activeAfterSec: 40,
  },
  {
    key: 'safety',
    label: 'Deterministic Safety Engine',
    subLabel: 'Verifying proposal against hard safety constraints',
    icon: <ShieldAlert className="w-4 h-4" />,
    activeAfterSec: 55,
  },
  {
    key: 'learning',
    label: 'Learning Agent',
    subLabel: 'Generating pedagogical takeaways',
    icon: <BookOpen className="w-4 h-4" />,
    activeAfterSec: 65,
  },
];

type StageState = 'pending' | 'active' | 'complete';

interface AgentPipelineProgressProps {
  loading: boolean;
  /** Pass true for a compact inline view (used inside action bar area) */
  compact?: boolean;
}

export default function AgentPipelineProgress({
  loading,
  compact = false,
}: AgentPipelineProgressProps) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    // Reset on each new loading session
    const origin = Date.now();
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - origin) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  const getStageState = (stage: PipelineStage, index: number): StageState => {
    if (!loading) return 'pending';
    const nextStage = STAGES[index + 1];
    if (nextStage && elapsedSec >= nextStage.activeAfterSec) return 'complete';
    if (elapsedSec >= stage.activeAfterSec) return 'active';
    return 'pending';
  };

  const activeIndex = STAGES.reduce((acc, stage, i) => {
    return elapsedSec >= stage.activeAfterSec ? i : acc;
  }, 0);

  if (!loading) return null;

  if (compact) {
    // Compact inline version shown below the Run button
    return (
      <div className="mt-3 bg-obsidian border border-telemetry-cyan/30 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-telemetry-cyan">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>AI AGENT PIPELINE RUNNING</span>
          <span className="ml-auto text-slate-500 font-mono">{elapsedSec}s</span>
        </div>

        {/* Compact stage row */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STAGES.map((stage, i) => {
            const state = getStageState(stage, i);
            return (
              <React.Fragment key={stage.key}>
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold whitespace-nowrap transition-all duration-500 ${
                    state === 'active'
                      ? 'bg-telemetry-cyan/20 text-telemetry-cyan border border-telemetry-cyan/40'
                      : state === 'complete'
                      ? 'bg-nominal-green/10 text-nominal-green border border-nominal-green/20'
                      : 'bg-industrial-slate/40 text-slate-500 border border-transparent'
                  }`}
                >
                  {state === 'active' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-telemetry-cyan animate-pulse flex-shrink-0" />
                  )}
                  {state === 'complete' && (
                    <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  )}
                  {state === 'pending' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                  )}
                  <span>{stage.label.split(' ')[0]}</span>
                </div>
                {i < STAGES.length - 1 && (
                  <span className="text-slate-600 text-[10px] flex-shrink-0">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Local AI inference is running. This may take a moment on offline hardware.
        </p>
      </div>
    );
  }

  // Full card version — shown in the main results area when there's no currentRun yet
  return (
    <div className="bg-industrial-slate/30 border border-telemetry-cyan/40 rounded-xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-telemetry-cyan/15 border border-telemetry-cyan/40 flex items-center justify-center text-telemetry-cyan">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-100 tracking-tight">
              OFFLINE AGENT LAB
            </h2>
            <p className="text-xs text-slate-400">
              AI agents are analyzing the mine.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{elapsedSec}s</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-obsidian/60 border border-industrial-border rounded-lg px-4 py-3 text-xs text-slate-300 leading-relaxed">
        OrePulse is running its local multi-agent reasoning pipeline.
        Because inference is running locally, the first analysis may take a moment.
        Stages advance as work progresses.
      </div>

      {/* Vertical stage list */}
      <div className="space-y-1">
        {STAGES.map((stage, index) => {
          const state = getStageState(stage, index);
          const isLast = index === STAGES.length - 1;
          return (
            <div key={stage.key} className="flex items-stretch gap-3">
              {/* Connector column */}
              <div className="flex flex-col items-center w-8 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                    state === 'active'
                      ? 'border-telemetry-cyan bg-telemetry-cyan/20 text-telemetry-cyan'
                      : state === 'complete'
                      ? 'border-nominal-green bg-nominal-green/10 text-nominal-green'
                      : 'border-industrial-border bg-industrial-slate/50 text-slate-500'
                  }`}
                >
                  {state === 'active' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : state === 'complete' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    stage.icon
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 my-1 transition-all duration-700 ${
                      state === 'complete'
                        ? 'bg-nominal-green/40'
                        : 'bg-industrial-border'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-${isLast ? '0' : '2'}`}>
                <div className="flex items-center justify-between gap-2 py-1.5">
                  <div>
                    <span
                      className={`text-sm font-semibold transition-colors duration-300 ${
                        state === 'active'
                          ? 'text-slate-100'
                          : state === 'complete'
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {state === 'active' && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {stage.subLabel}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap transition-all duration-300 ${
                      state === 'active'
                        ? 'text-telemetry-cyan border-telemetry-cyan/40 bg-telemetry-cyan/10 animate-pulse'
                        : state === 'complete'
                        ? 'text-nominal-green border-nominal-green/30 bg-nominal-green/5'
                        : 'text-slate-600 border-slate-700 bg-transparent'
                    }`}
                  >
                    {state === 'active' ? 'ANALYZING…' : state === 'complete' ? 'COMPLETE' : 'PENDING'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-industrial-slate rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-telemetry-cyan/60 to-telemetry-cyan rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(((activeIndex + 1) / STAGES.length) * 100, 95)}%`,
            }}
          />
        </div>
        <p className="text-[10px] text-slate-500 text-right">
          Stage {activeIndex + 1} of {STAGES.length}
        </p>
      </div>
    </div>
  );
}
