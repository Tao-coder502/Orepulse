// src/WhatIfLab.tsx — OrePulse AI Interactive Agentic Mining Learning Laboratory

import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  ShieldAlert,
  Activity,
  Truck,
  Gauge,
  Wrench,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Cpu,
  Layers,
  BookOpen,
  UserCheck,
  Play,
  Scale,
  Lock,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Clock,
  RotateCcw,
  Network,
  ArrowRight,
  Flame,
} from 'lucide-react';
import AgentPipelineProgress from './components/AgentPipelineProgress';
import TelemetryCard from './components/TelemetryCard';

// ─── Scenario Definitions ────────────────────────────────────────────────────

interface ScenarioDef {
  id: string;
  name: string;
  shortDesc: string;
  defaultTemp: number;
  defaultCongestion: number;
  defaultFleet: number;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'NORMAL_OPERATIONS',
    name: 'Normal Operations',
    shortDesc:
      'Baseline steady-state simulated mining scenario where haul trucks and traffic flow within nominal parameters.',
    defaultTemp: 70,
    defaultCongestion: 15,
    defaultFleet: 95,
  },
  {
    id: 'EQUIPMENT_ANOMALY',
    name: 'Equipment Anomaly',
    shortDesc:
      'Investigate synthetic thermal stress caused by an overheating haul truck engine on the haul route.',
    defaultTemp: 120,
    defaultCongestion: 15,
    defaultFleet: 95,
  },
  {
    id: 'COMBINED_OPERATIONAL_RISK',
    name: 'Combined Operational Risk',
    shortDesc:
      'Explore how multiple compounding risk signals (haul ramp congestion + engine heat) challenge AI analysis and trigger safety guardrails.',
    defaultTemp: 110,
    defaultCongestion: 80,
    defaultFleet: 40,
  },
];

// ─── Status Helpers ───────────────────────────────────────────────────────────

type SignalStatus = 'NOMINAL' | 'WARNING' | 'CRITICAL';

function getTemperatureStatus(temp: number): SignalStatus {
  if (temp >= 115) return 'CRITICAL';
  if (temp >= 95) return 'WARNING';
  return 'NOMINAL';
}

function getCongestionStatus(cong: number): SignalStatus {
  if (cong >= 75) return 'CRITICAL';
  if (cong >= 50) return 'WARNING';
  return 'NOMINAL';
}

function getFleetStatus(fleet: number): SignalStatus {
  if (fleet < 40) return 'CRITICAL';
  if (fleet < 70) return 'WARNING';
  return 'NOMINAL';
}

function getStatusBadgeClasses(status: SignalStatus): string {
  switch (status) {
    case 'CRITICAL':
      return 'text-hazard-red border-hazard-red/40 bg-red-950/30 animate-pulse';
    case 'WARNING':
      return 'text-warning-amber border-warning-amber/40 bg-amber-950/20';
    default:
      return 'text-nominal-green border-nominal-green/40 bg-emerald-950/20';
  }
}

// ─── Agent Result Helpers ─────────────────────────────────────────────────────

/**
 * Safely extracts a display-ready string from a nested agent result field.
 * Returns undefined if the field is missing or not a primitive.
 */
function extractField(obj: any, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (obj && typeof obj[key] === 'string' && obj[key].trim()) {
      return obj[key].trim();
    }
    if (obj && typeof obj[key] === 'number') {
      return String(obj[key]);
    }
  }
  return undefined;
}

function extractArray(obj: any, ...keys: string[]): string[] {
  for (const key of keys) {
    const v = obj?.[key];
    if (Array.isArray(v) && v.length > 0) {
      return v.map((x: any) => String(x)).filter(Boolean);
    }
  }
  return [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunResult {
  runId: string;
  runNumber: number;
  experimentId?: string;
  scenarioId: string;
  scenarioName: string;
  temperature: number;
  congestion: number;
  fleet: number;
  decision: 'NORMAL' | 'WARNING' | 'ESCALATE' | 'STOP_AND_INFORM_SUPERVISOR';
  executionMode: 'a2a_adk' | 'adk' | 'deterministic_fallback';
  offlineAiStatus?: 'active' | 'unavailable' | 'timeout' | 'invalid_output' | 'fallback';
  toolsUsed?: string[];
  offlineKnowledgeSnippet?: string | null;
  proposedExplanation?: string;
  events?: Array<{
    agent: string;
    event: string;
    status: string;
    timestamp: string;
    duration_ms: number;
    transport: string;
    requestId: string;
    details?: any;
  }>;
  isOverridden: boolean;
  proposedDecision: string;
  proposedAction?: string;
  proposedConfidence?: number;
  triggeredRules: string[];
  summary: string;
  rationale: string;
  whatHappened: string;
  signalsMattered: string[];
  whyOutcomeChanged: string;
  learningTakeaway: string;
  reflectionQuestion: string;
  agentResults?: Record<string, any>;
  timestamp: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Compact agent result card — surfaces structured agentResults data */
function AgentResultCard({
  agentKey,
  title,
  icon,
  agentData,
  borderColor,
  iconColor,
}: {
  agentKey: string;
  title: string;
  icon: React.ReactNode;
  agentData: any;
  borderColor: string;
  iconColor: string;
}) {
  if (!agentData) return null;

  const status = extractField(agentData, 'status', 'risk_level', 'riskLevel', 'severity');
  const signals = extractArray(agentData, 'signals', 'key_signals', 'keySignals', 'observations');
  const concerns = extractArray(agentData, 'concerns', 'issues', 'warnings', 'anomalies');
  const recommendation = extractField(
    agentData,
    'recommendation',
    'recommended_action',
    'action',
    'summary',
    'findings'
  );
  const concern = extractField(agentData, 'concern', 'primary_concern', 'description') ||
    (concerns.length > 0 ? concerns[0] : undefined);

  const getStatusColor = (s?: string) => {
    if (!s) return 'text-slate-400';
    const upper = s.toUpperCase();
    if (upper.includes('CRIT') || upper.includes('STOP') || upper.includes('DANGER'))
      return 'text-hazard-red font-bold';
    if (upper.includes('WARN') || upper.includes('DEGRAD') || upper.includes('ELEVATED'))
      return 'text-warning-amber font-bold';
    if (upper.includes('NORMAL') || upper.includes('NOM') || upper.includes('OK'))
      return 'text-nominal-green font-bold';
    return 'text-slate-300 font-semibold';
  };

  return (
    <div className={`bg-industrial-slate/40 border ${borderColor} rounded-lg p-3.5 space-y-2.5`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 text-xs font-bold ${iconColor}`}>
          {icon}
          <span className="uppercase tracking-wider">{title}</span>
        </div>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20`}
        >
          A2A Response
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-industrial-border/60" />

      {/* Status */}
      {status && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 w-20 flex-shrink-0">STATUS</span>
          <span className={getStatusColor(status)}>{status.toUpperCase()}</span>
        </div>
      )}

      {/* Key signals */}
      {signals.length > 0 && (
        <div className="text-xs">
          <span className="text-slate-500 block mb-1">Signals</span>
          <ul className="space-y-0.5 pl-2">
            {signals.slice(0, 3).map((s, i) => (
              <li key={i} className="text-slate-300 flex items-start gap-1.5">
                <span className="text-telemetry-cyan mt-0.5 flex-shrink-0">·</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary concern */}
      {concern && (
        <div className="text-xs">
          <span className="text-slate-500 block mb-0.5">Concern</span>
          <p className="text-slate-300 leading-relaxed">{concern}</p>
        </div>
      )}

      {/* Additional concerns */}
      {concerns.length > 1 && (
        <div className="text-xs">
          <ul className="space-y-0.5 pl-2">
            {concerns.slice(1, 3).map((c, i) => (
              <li key={i} className="text-slate-400 flex items-start gap-1.5">
                <span className="text-warning-amber mt-0.5 flex-shrink-0">·</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="text-xs bg-obsidian/60 border border-industrial-border/60 rounded p-2.5">
          <span className="text-slate-500 block mb-0.5">Recommendation</span>
          <p className="text-slate-200 leading-relaxed">{recommendation}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WhatIfLab() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioDef>(SCENARIOS[2]);
  const [temperature, setTemperature] = useState(SCENARIOS[2].defaultTemp);
  const [congestion, setCongestion] = useState(SCENARIOS[2].defaultCongestion);
  const [fleet, setFleet] = useState(SCENARIOS[2].defaultFleet);

  // Execution state
  const [loading, setLoading] = useState(false);

  // Learner orientation toggles
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHint, setShowHint] = useState(false);

  // Run counter — increments per completed run
  const runCounterRef = useRef(0);

  // Experiment runs
  const [currentRun, setCurrentRun] = useState<RunResult | null>(null);
  const [previousRun, setPreviousRun] = useState<RunResult | null>(null);

  // Scenario selection handler
  const handleScenarioChange = (s: ScenarioDef) => {
    setSelectedScenario(s);
    setTemperature(s.defaultTemp);
    setCongestion(s.defaultCongestion);
    setFleet(s.defaultFleet);
  };

  const handleReset = () => {
    setTemperature(selectedScenario.defaultTemp);
    setCongestion(selectedScenario.defaultCongestion);
    setFleet(selectedScenario.defaultFleet);
  };

  // Run experiment with genuine Google ADK 2.0 multi-agent backend trace
  const runSimulation = async () => {
    setLoading(true);

    try {
      const payload = {
        scenarioId: selectedScenario.id,
        steps: 3,
        simulatedTruckTemperature: temperature,
        simulatedRampCongestion: congestion,
        simulatedFleetAvailability: fleet,
      };

      const res = await fetch('/api/lab/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const trace = data.trace || {};
      const finalDec = trace.finalDecision?.decision || 'NORMAL';
      const safetyEval = trace.safetyEvaluation || {};
      const learningExp = trace.learningExplanation || {};
      const proposed = trace.proposedDecision || {};
      const isOverridden = Boolean(
        trace.isOverridden || (proposed.decision && proposed.decision !== finalDec)
      );
      const executionMode: 'a2a_adk' | 'adk' | 'deterministic_fallback' =
        trace.executionMode || 'a2a_adk';

      const decision: 'NORMAL' | 'WARNING' | 'ESCALATE' | 'STOP_AND_INFORM_SUPERVISOR' =
        finalDec === 'ALLOW' ? 'NORMAL' : finalDec;

      const summary =
        decision === 'STOP_AND_INFORM_SUPERVISOR'
          ? 'Simulated human supervisor review required. The deterministic Safety Engine halted simulated operations to protect equipment.'
          : decision === 'WARNING'
          ? 'Elevated simulated stress detected. Continued operation authorized under constrained parameters.'
          : 'The simulation ran nominally. All monitored parameters are within safe bounds.';

      const rationale =
        safetyEval.explanation ||
        safetyEval.rationale ||
        (isOverridden
          ? `Deterministic Safety Engine intervened to override AI proposal (${proposed.decision} → ${decision}).`
          : 'All simulated signals evaluated within nominal safety bounds.');

      const whatHappened =
        learningExp.whatHappened ||
        'The multi-agent system analyzed synthetic telemetry under deterministic Safety Engine governance.';

      const signalsMattered =
        learningExp.importantSignals && learningExp.importantSignals.length > 0
          ? [
              `Equipment Temperature: ${temperature}°C (${
                temperature > 100 ? 'Exceeded 100°C Safety Boundary' : 'Within Nominal Thermal Band'
              })`,
              `Ramp Congestion: ${congestion}% (${
                congestion > 60
                  ? 'High Congestion — Exceeded 60% Safety Threshold'
                  : 'Smooth Haul Traffic Flow'
              })`,
              `Fleet Availability: ${fleet}% (${
                fleet < 70 ? 'Degraded Fleet Availability' : 'Normal Fleet Readiness'
              })`,
            ]
          : [
              `Equipment Temperature: ${temperature}°C`,
              `Ramp Congestion: ${congestion}%`,
              `Fleet Availability: ${fleet}%`,
            ];

      const whyOutcomeChanged = isOverridden
        ? `Deterministic Safety Rule enforced: The AI proposed '${proposed.decision}', but the deterministic TypeScript Safety Engine is authoritative. It strictly overruled the AI proposal due to: ${
            safetyEval.triggeredRules?.join(', ') || 'safety constraint violation'
          }.`
        : safetyEval.triggeredRules && safetyEval.triggeredRules.length > 0
        ? `Deterministic Safety Rule(s) enforced: ${safetyEval.triggeredRules.join(', ')}.`
        : 'Rule #SE-01: All deterministic safety checks passed without constraint violations.';

      const learningTakeaway =
        learningExp.learningTakeaway ||
        'Industrial AI systems propose recommendations, but deterministic safety guardrails must govern simulated outcomes.';

      const reflectionQuestion =
        learningExp.reflectionQuestion ||
        'Why must the deterministic Safety Engine remain authoritative over AI specialist recommendations?';

      if (currentRun) {
        setPreviousRun(currentRun);
      }

      runCounterRef.current += 1;

      setCurrentRun({
        runId: data.runId || `run-${Date.now()}`,
        runNumber: runCounterRef.current,
        experimentId: trace.experimentId,
        scenarioId: selectedScenario.id,
        scenarioName: selectedScenario.name,
        temperature,
        congestion,
        fleet,
        decision,
        executionMode,
        offlineAiStatus: trace.offlineAiStatus,
        toolsUsed: trace.toolsUsed || [],
        offlineKnowledgeSnippet: trace.offlineKnowledgeSnippet,
        proposedExplanation: proposed.explanation,
        events: trace.events || [],
        isOverridden,
        proposedDecision: proposed.decision || 'NORMAL',
        proposedAction: proposed.proposedAction,
        proposedConfidence: proposed.confidence,
        triggeredRules: safetyEval.triggeredRules || [],
        summary,
        rationale,
        whatHappened,
        signalsMattered,
        whyOutcomeChanged,
        learningTakeaway,
        reflectionQuestion,
        agentResults: trace.agentResults,
        timestamp: new Date().toLocaleTimeString(),
      });

      setLoading(false);
    } catch (err) {
      console.error('Simulation execution error:', err);
      setLoading(false);
    }
  };

  // Initial simulation on mount
  useEffect(() => {
    runSimulation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Derived state ──────────────────────────────────────────────────────────
  const tempStatus = getTemperatureStatus(temperature);
  const congestionStatus = getCongestionStatus(congestion);
  const fleetStatus = getFleetStatus(fleet);

  const isDangerous =
    currentRun?.decision === 'STOP_AND_INFORM_SUPERVISOR' ||
    currentRun?.decision === 'ESCALATE';

  // Agent timeline step labels based on run state
  const getStepLabel = (stepIndex: number): { label: string; cls: string } => {
    if (!currentRun && !loading) {
      return { label: 'PENDING', cls: 'bg-slate-700/50 text-slate-500 border-slate-700' };
    }
    if (loading) {
      return {
        label: 'ANALYZING…',
        cls: 'bg-telemetry-cyan/10 text-telemetry-cyan border-telemetry-cyan/30 animate-pulse',
      };
    }
    if (currentRun) {
      if (
        currentRun.executionMode === 'deterministic_fallback' &&
        (stepIndex === 0 || stepIndex === 1)
      ) {
        return {
          label: 'FALLBACK',
          cls: 'bg-warning-amber/10 text-warning-amber border-warning-amber/30',
        };
      }
      return {
        label: 'COMPLETE',
        cls: 'bg-nominal-green/10 text-nominal-green border-nominal-green/25',
      };
    }
    return { label: 'PENDING', cls: 'bg-slate-700/50 text-slate-500 border-slate-700' };
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── 1. Laboratory Shell Header ─────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-industrial-border gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-telemetry-cyan/15 border border-telemetry-cyan/40 flex items-center justify-center text-telemetry-cyan shadow-[0_0_16px_rgba(6,182,212,0.25)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                OrePulse AI
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-400">
                Interactive Agentic Mining Learning Laboratory
              </p>
            </div>
          </div>
        </div>

        {/* Status Badges — overflow scroll on mobile to prevent ugly wrapping */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 max-w-full">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/30 whitespace-nowrap flex-shrink-0">
            <Layers className="w-3.5 h-3.5" />
            SYNTHETIC ENVIRONMENT
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-nominal-green/10 text-nominal-green border border-nominal-green/30 whitespace-nowrap flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            DETERMINISTIC SAFETY
          </span>
          {currentRun && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 ${
                currentRun.offlineAiStatus === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : currentRun.offlineAiStatus === 'timeout'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : currentRun.offlineAiStatus === 'unavailable' ||
                    currentRun.offlineAiStatus === 'invalid_output'
                  ? 'bg-warning-amber/10 text-warning-amber border border-warning-amber/30'
                  : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              {currentRun.offlineAiStatus === 'active'
                ? '● OFFLINE AI ACTIVE'
                : currentRun.offlineAiStatus === 'timeout'
                ? '● TIMEOUT'
                : currentRun.offlineAiStatus === 'unavailable'
                ? '○ AI UNAVAILABLE'
                : currentRun.offlineAiStatus === 'invalid_output'
                ? '○ INVALID OUTPUT'
                : '○ FALLBACK'}
            </span>
          )}
          {currentRun && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 ${
                currentRun.executionMode === 'a2a_adk'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : currentRun.executionMode === 'adk'
                  ? 'bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/30'
                  : 'bg-warning-amber/10 text-warning-amber border border-warning-amber/30'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              {currentRun.executionMode === 'a2a_adk'
                ? 'A2A + ADK'
                : currentRun.executionMode === 'adk'
                ? 'ADK'
                : 'FALLBACK'}
            </span>
          )}
          {currentRun && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap flex-shrink-0">
              RUN #{currentRun.runNumber}
            </span>
          )}
        </div>
      </header>

      {/* ── 2. Educational Welcome Guide (Collapsible) ─────────────────────── */}
      <section className="bg-industrial-slate/40 border border-industrial-border rounded-xl p-4 sm:p-5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Info className="w-4 h-4 text-telemetry-cyan" />
            <span>Welcome to the Mining Learning Laboratory</span>
          </div>
          <button
            onClick={() => setShowWelcome(!showWelcome)}
            className="text-xs font-semibold text-slate-400 hover:text-telemetry-cyan flex items-center gap-1 cursor-pointer transition-colors"
          >
            {showWelcome ? 'Hide Guide' : 'Show Guide'}
            {showWelcome ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showWelcome && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-obsidian/70 p-3 rounded-lg border-l-2 border-telemetry-cyan">
              <span className="font-bold text-telemetry-cyan uppercase block mb-1">What is this?</span>
              <p className="text-slate-300 leading-relaxed">
                An interactive educational STEM laboratory where you explore how{' '}
                <strong>collaborating AI agents</strong> analyze simulated mining conditions under
                deterministic safety constraints.
              </p>
            </div>
            <div className="bg-obsidian/70 p-3 rounded-lg border-l-2 border-telemetry-cyan">
              <span className="font-bold text-telemetry-cyan uppercase block mb-1">What can I do?</span>
              <p className="text-slate-300 leading-relaxed">
                Adjust What-If variables (equipment temperature, ramp traffic) and observe how the
                multi-agent analysis and safety evaluation respond in real time.
              </p>
            </div>
            <div className="bg-obsidian/70 p-3 rounded-lg border-l-2 border-telemetry-cyan">
              <span className="font-bold text-telemetry-cyan uppercase block mb-1">
                Is this real mining data?
              </span>
              <p className="text-slate-300 leading-relaxed">
                <strong>No.</strong> This is an educational sandbox powered by synthetic telemetry.
                It never issues commands to or connects with real mining equipment.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. Learning Journey Progress Indicator ─────────────────────────── */}
      <nav
        className="bg-obsidian/80 border border-industrial-border rounded-xl p-3 shadow-inner"
        aria-label="Learning Journey Progress"
      >
        <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { step: 1, label: 'Scenario', done: true },
            { step: 2, label: 'What-If Lab', done: true },
            { step: 3, label: 'Agent Analysis', active: loading, done: !!currentRun },
            { step: 4, label: 'Safety Engine', done: !!currentRun && !loading },
            { step: 5, label: 'Learn & Reflect', done: !!currentRun && !loading },
          ].map(({ step, label, done, active }) => (
            <React.Fragment key={step}>
              <div
                className={`flex items-center gap-2 ${
                  active
                    ? 'text-telemetry-cyan animate-pulse'
                    : done
                    ? 'text-nominal-green'
                    : 'text-slate-500'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    active
                      ? 'bg-telemetry-cyan text-obsidian'
                      : done
                      ? 'bg-nominal-green text-obsidian'
                      : 'bg-industrial-slate text-slate-400'
                  }`}
                >
                  {step}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{label}</span>
              </div>
              {step < 5 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
      </nav>

      {/* ── 4. Top Grid: Scenario Selection & What-If Lab ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scenario Selection */}
        <section
          className="lg:col-span-5 bg-industrial-slate/30 border border-industrial-border rounded-xl p-5 shadow-md flex flex-col justify-between"
          aria-label="Step 1: Choose a Scenario"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
                <Layers className="w-4 h-4 text-telemetry-cyan" />
                <span>Step 1: Choose Scenario</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 bg-obsidian/80 px-2 py-0.5 rounded border border-industrial-border">
                Preset challenge
              </span>
            </div>

            <div className="space-y-2.5" role="radiogroup" aria-label="Scenario list">
              {SCENARIOS.map((s) => {
                const isSelected = selectedScenario.id === s.id;
                return (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleScenarioChange(s)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col gap-1 focus:outline-none focus:ring-2 focus:ring-telemetry-cyan ${
                      isSelected
                        ? 'bg-telemetry-cyan/15 border-telemetry-cyan text-slate-100 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                        : 'bg-obsidian/70 border-industrial-border text-slate-400 hover:border-slate-600 hover:bg-obsidian'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-200">{s.name}</span>
                      {isSelected && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-telemetry-cyan text-obsidian">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.shortDesc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-industrial-border/60 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-telemetry-cyan flex-shrink-0" />
            <span>Selecting a scenario loads baseline synthetic telemetry into the What-If lab.</span>
          </div>
        </section>

        {/* Right: What-If Lab Variables */}
        <section
          className="lg:col-span-7 bg-industrial-slate/30 border border-industrial-border rounded-xl p-5 shadow-md"
          aria-label="Step 2: What-If Experiment Controls"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <Gauge className="w-4 h-4 text-telemetry-cyan" />
              <span>Step 2: What-If Lab</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-obsidian/80 px-2 py-0.5 rounded border border-industrial-border">
              Tune variables freely
            </span>
          </div>

          {/* Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <TelemetryCard
              icon={<Wrench className="w-3.5 h-3.5" />}
              category="EQUIPMENT"
              label="Engine Temperature"
              value={temperature}
              unit="°C"
              status={tempStatus}
              statusLabel={
                tempStatus === 'CRITICAL'
                  ? 'Critical Overheat'
                  : tempStatus === 'WARNING'
                  ? 'Elevated Heat'
                  : 'Safe Thermal Band'
              }
              min={40}
              max={140}
            />
            <TelemetryCard
              icon={<Truck className="w-3.5 h-3.5" />}
              category="HAULAGE"
              label="Ramp Congestion"
              value={congestion}
              unit="%"
              status={congestionStatus}
              statusLabel={
                congestionStatus === 'CRITICAL'
                  ? 'Ramp Gridlock'
                  : congestionStatus === 'WARNING'
                  ? 'Moderate Traffic'
                  : 'Clear Route'
              }
              min={0}
              max={100}
            />
            <TelemetryCard
              icon={<Activity className="w-3.5 h-3.5" />}
              category="FLEET"
              label="Availability"
              value={fleet}
              unit="%"
              status={fleetStatus}
              statusLabel={
                fleetStatus === 'CRITICAL'
                  ? 'Severely Reduced'
                  : fleetStatus === 'WARNING'
                  ? 'Limited Reserve'
                  : 'Full Readiness'
              }
              min={10}
              max={100}
              invertScale
            />
          </div>

          {/* Interactive Sliders */}
          <div className="bg-obsidian/60 border border-industrial-border rounded-lg p-4 space-y-4">
            {/* Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="temp-slider" className="text-xs font-bold text-slate-200">
                  Haul Truck Engine Temperature
                </label>
                <span className="text-xs font-extrabold text-telemetry-cyan">{temperature}°C</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Safe thermal ceiling: &lt; 95°C | Hard safety intercept ceiling: &gt; 100°C
              </p>
              <input
                id="temp-slider"
                type="range"
                min="40"
                max="140"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
                aria-label="Equipment Temperature slider"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>40°C (Nominal)</span>
                <span>95°C (Warning)</span>
                <span>140°C (Hazard)</span>
              </div>
            </div>

            {/* Congestion Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="congestion-slider" className="text-xs font-bold text-slate-200">
                  Haul Ramp Traffic Congestion
                </label>
                <span className="text-xs font-extrabold text-telemetry-cyan">{congestion}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Smooth flow: &lt; 50% | Critical compounding risk: &gt; 60%
              </p>
              <input
                id="congestion-slider"
                type="range"
                min="0"
                max="100"
                value={congestion}
                onChange={(e) => setCongestion(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
                aria-label="Ramp Congestion slider"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>0% (Empty)</span>
                <span>50% (Moderate)</span>
                <span>100% (Gridlock)</span>
              </div>
            </div>

            {/* Fleet Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="fleet-slider" className="text-xs font-bold text-slate-200">
                  Fleet Availability Ratio
                </label>
                <span className="text-xs font-extrabold text-telemetry-cyan">{fleet}%</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Percentage of haul trucks ready for cycle assignment
              </p>
              <input
                id="fleet-slider"
                type="range"
                min="10"
                max="100"
                value={fleet}
                onChange={(e) => setFleet(Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
                aria-label="Fleet Availability slider"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button
              onClick={runSimulation}
              disabled={loading}
              id="run-experiment-btn"
              className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-telemetry-cyan"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              <span>{loading ? 'Running Experiment…' : 'RUN EXPERIMENT'}</span>
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              className="bg-industrial-slate hover:bg-slate-700 text-slate-300 hover:text-white border border-industrial-border font-semibold text-xs py-2.5 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-telemetry-cyan"
              title="Reset to scenario defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* Compact inline pipeline progress (shown below action bar during loading) */}
          <AgentPipelineProgress loading={loading} compact />
        </section>
      </div>

      {/* ── 5. Experiment History Comparison ──────────────────────────────── */}
      {previousRun && currentRun && (
        <section
          className="bg-industrial-slate/40 border border-telemetry-cyan/40 rounded-xl p-5 shadow-lg space-y-3"
          aria-label="Experiment History Comparison"
        >
          <div className="flex items-center justify-between border-b border-industrial-border/60 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-100">
              <Clock className="w-4 h-4 text-telemetry-cyan" />
              <span>
                Experiment Comparison — RUN #{previousRun.runNumber} → RUN #{currentRun.runNumber}
              </span>
            </div>
            <span className="text-xs text-slate-400">Cause-and-Effect Analysis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Variables Diff */}
            <div className="bg-obsidian/70 p-3 rounded-lg border border-industrial-border space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                Condition Adjustments
              </span>
              <div className="text-slate-200">
                Ramp Congestion:{' '}
                <strong className="text-slate-100">{previousRun.congestion}%</strong> →{' '}
                <strong className="text-telemetry-cyan">{currentRun.congestion}%</strong>
              </div>
              <div className="text-slate-200">
                Equipment Heat:{' '}
                <strong className="text-slate-100">{previousRun.temperature}°C</strong> →{' '}
                <strong className="text-telemetry-cyan">{currentRun.temperature}°C</strong>
              </div>
              <div className="text-slate-200">
                Fleet Ready: <strong className="text-slate-100">{previousRun.fleet}%</strong> →{' '}
                <strong className="text-telemetry-cyan">{currentRun.fleet}%</strong>
              </div>
            </div>

            {/* AI Advisory Diff */}
            <div className="bg-obsidian/70 p-3 rounded-lg border border-industrial-border space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                AI Advisory Proposal
              </span>
              <div className="text-slate-200">
                Previous:{' '}
                <span className="font-semibold text-slate-300">{previousRun.proposedDecision}</span>
              </div>
              <div className="text-slate-200">
                Current:{' '}
                <span className="font-semibold text-telemetry-cyan">{currentRun.proposedDecision}</span>
              </div>
            </div>

            {/* Safety Engine Decision Diff */}
            <div className="bg-obsidian/70 p-3 rounded-lg border border-industrial-border space-y-1">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                Deterministic Safety Engine
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={
                    previousRun.decision === 'STOP_AND_INFORM_SUPERVISOR'
                      ? 'text-hazard-red font-bold'
                      : 'text-nominal-green font-bold'
                  }
                >
                  {previousRun.decision.replace(/_/g, ' ')}
                </span>
                <span className="text-slate-500">→</span>
                <span
                  className={
                    currentRun.decision === 'STOP_AND_INFORM_SUPERVISOR'
                      ? 'text-hazard-red font-bold'
                      : 'text-nominal-green font-bold'
                  }
                >
                  {currentRun.decision.replace(/_/g, ' ')}
                </span>
              </div>
              {previousRun.decision !== currentRun.decision && (
                <p className="text-[11px] text-emerald-400 font-medium pt-1">
                  💡 Notice how tuning ramp congestion removed compounding risk, enabling a safe
                  simulated state!
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. Pipeline Progress (Full Card — before first result) ─────────── */}
      {loading && !currentRun && (
        <AgentPipelineProgress loading={loading} compact={false} />
      )}

      {/* ── 7. Dangerous State Alert Banner ───────────────────────────────── */}
      {currentRun && isDangerous && !loading && (
        <div
          className="bg-red-950/60 border-2 border-hazard-red/70 rounded-xl p-4 flex items-center gap-4 shadow-xl shadow-red-950/40"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-12 h-12 rounded-xl bg-hazard-red flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-red-100 tracking-tight">
              ⚠ SAFETY INTERVENTION REQUIRED
            </h2>
            <p className="text-xs text-red-300 leading-relaxed mt-0.5">
              The deterministic Safety Engine detected a hazardous operating condition and halted
              simulated operations.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-200 bg-hazard-red/30 border border-hazard-red/40 px-2.5 py-1 rounded">
                FINAL ACTION: {currentRun.decision.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-red-300 flex-shrink-0">
            <UserCheck className="w-5 h-5" />
            <span className="font-bold">HUMAN SUPERVISOR<br/>REVIEW REQUIRED</span>
          </div>
        </div>
      )}

      {/* ── 8. Safety Engine Lab ───────────────────────────────────────────── */}
      {currentRun && !loading && (
        <section
          className={`rounded-xl p-5 sm:p-6 shadow-xl space-y-5 border-2 transition-all duration-500 ${
            currentRun.isOverridden
              ? 'bg-red-950/20 border-hazard-red/50'
              : isDangerous
              ? 'bg-amber-950/20 border-warning-amber/40'
              : 'bg-industrial-slate/30 border-nominal-green/30'
          }`}
          aria-label="Step 4: Safety Engine Lab"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-industrial-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert
                  className={`w-5 h-5 ${
                    currentRun.isOverridden ? 'text-hazard-red' : 'text-nominal-green'
                  }`}
                />
                <h2 className="text-lg font-extrabold text-slate-100">
                  TypeScript Deterministic Safety Engine
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every AI proposal must pass through the non-LLM deterministic Safety Engine.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-hazard-red/20 border border-hazard-red/40 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider text-red-300">
                AUTHORITATIVE GUARDRAIL
              </span>
            </div>
          </div>

          {/* Key invariant */}
          <div className="bg-obsidian border border-industrial-border px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 text-slate-300">
            <span className="text-telemetry-cyan font-bold">Key Invariant:</span>
            <span className="font-semibold text-slate-100">
              AI Recommendation ≠ Final Simulated Decision
            </span>
          </div>

          {/* Override block */}
          {currentRun.isOverridden ? (
            <div className="bg-red-950/40 border-2 border-red-500/80 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3 text-red-300">
                <ShieldAlert className="w-7 h-7 text-hazard-red flex-shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-red-200">
                    SAFETY ENGINE INTERCEPT ENFORCED
                  </h3>
                  <p className="text-xs text-red-300 leading-relaxed">
                    The simulated AI recommendation conflicted with a deterministic safety constraint.
                    The TypeScript Safety Engine intercepted the proposal and enforced an immediate
                    fail-safe stop.
                  </p>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* AI Recommendation Card */}
                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    AI Specialist Recommendation (Advisory Only)
                  </span>
                  <div className="text-base font-bold text-slate-200">
                    {currentRun.proposedDecision}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The AI agents evaluated the scenario and proposed operational adjustments (
                    {currentRun.proposedAction || 'adjustCycleTimes'}), unaware of hard
                    non-negotiable physical constraints.
                  </p>
                </div>

                {/* Deterministic Guardrail Card */}
                <div className="bg-red-950/50 border-2 border-hazard-red/60 text-red-300 p-4 rounded-lg space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">
                    🛡 Deterministic Safety Guardrail (Authoritative)
                  </span>
                  <div className="text-base font-black text-red-100">
                    STOP &amp; INFORM SUPERVISOR
                  </div>
                  <p className="text-xs text-red-300/90 leading-relaxed">
                    Triggered Rules:{' '}
                    <strong>
                      {currentRun.triggeredRules.join(', ') ||
                        'Thermal ceiling & Ramp gridlock limit exceeded'}
                    </strong>
                    . Hard physical rules strictly overrule probabilistic recommendations.
                  </p>
                </div>
              </div>

              <div className="bg-red-950/60 border border-red-500/40 rounded-lg p-3 text-xs text-red-200 flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span>
                  <strong>MANDATORY HUMAN SUPERVISOR ESCALATION:</strong> Live physical human
                  authority must inspect the simulated asset before resuming operations.
                </span>
              </div>
            </div>
          ) : (
            /* Nominal Safety Check Panel */
            <div className="bg-nominal-green/10 border border-nominal-green/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle className="w-5 h-5 text-nominal-green" />
                  <span className="font-bold text-sm">Deterministic Safety Check: PASSED</span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">
                  Rule #SE-01 Nominal Parameters Enforced
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The advisory AI recommendation aligns with all deterministic safety constraints.
                Equipment heat ({currentRun.temperature}°C) and ramp congestion (
                {currentRun.congestion}%) remain within acceptable safe tolerances.
              </p>
            </div>
          )}

          {/* Final Simulated Outcome Banner */}
          <div
            className={`rounded-xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md ${
              currentRun.decision === 'STOP_AND_INFORM_SUPERVISOR'
                ? 'bg-red-950/40 border-hazard-red/60 text-red-200'
                : currentRun.decision === 'WARNING' || currentRun.decision === 'ESCALATE'
                ? 'bg-amber-950/30 border-warning-amber/50 text-amber-200'
                : 'bg-emerald-950/30 border-nominal-green/50 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  currentRun.decision === 'STOP_AND_INFORM_SUPERVISOR'
                    ? 'bg-hazard-red text-white'
                    : currentRun.decision === 'WARNING' || currentRun.decision === 'ESCALATE'
                    ? 'bg-warning-amber text-slate-950'
                    : 'bg-nominal-green text-slate-950'
                }`}
              >
                {currentRun.decision === 'STOP_AND_INFORM_SUPERVISOR' ? (
                  <ShieldAlert className="w-7 h-7" />
                ) : currentRun.decision === 'WARNING' || currentRun.decision === 'ESCALATE' ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <CheckCircle className="w-7 h-7" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Final Simulated Outcome
                </span>
                <h3 className="text-xl font-black tracking-tight text-white">
                  {currentRun.decision.replace(/_/g, ' ')}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">{currentRun.rationale}</p>
              </div>
            </div>

            {currentRun.decision === 'STOP_AND_INFORM_SUPERVISOR' && (
              <div className="bg-red-900/60 border border-red-500/50 px-3.5 py-2 rounded-lg text-xs font-bold text-red-100 flex items-center gap-2 self-start sm:self-center">
                <UserCheck className="w-4 h-4" />
                <span>HUMAN SUPERVISOR REVIEW</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── 9. Agent Lab: Multi-Agent Analysis ────────────────────────────── */}
      <section
        className="bg-industrial-slate/30 border border-industrial-border rounded-xl p-5 sm:p-6 shadow-md space-y-5"
        aria-label="Step 3: Multi-Agent Activity Timeline"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-industrial-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-telemetry-cyan" />
            <h2 className="text-lg font-bold text-slate-100">Agent Lab: Multi-Agent Analysis</h2>
          </div>
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
            Google ADK 2.0 + A2A Protocol Pipeline
          </span>
        </div>

        {/* Vertical Execution Timeline */}
        <div className="border-l-2 border-industrial-border ml-4 pl-6 space-y-5">
          {/* Step 1: Supervisor Intake */}
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-industrial-slate border-2 border-telemetry-cyan flex items-center justify-center text-telemetry-cyan">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-3.5 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-slate-200">
                  1. Supervisor Agent — Intake &amp; Scoping
                </span>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                    getStepLabel(0).cls
                  }`}
                >
                  {getStepLabel(0).label}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingested synthetic scenario context ({selectedScenario.name}), established telemetry
                baseline, and delegated analysis to parallel specialist agents via A2A protocol.
              </p>
            </div>
          </div>

          {/* Step 2: A2A Protocol Transport — Parallel Specialist Delegation */}
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-industrial-slate border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
              <Network className="w-3.5 h-3.5" />
            </div>
            <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">
                    2. A2A Protocol Transport — Parallel Specialist Delegation
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    A2A PROTOCOL
                  </span>
                </div>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                    getStepLabel(1).cls
                  }`}
                >
                  {currentRun?.executionMode === 'deterministic_fallback'
                    ? 'FALLBACK'
                    : getStepLabel(1).label}
                </span>
              </div>

              {/* Educational A2A callout */}
              <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-lg px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>A2A (Agent2Agent) Protocol:</strong> Enables specialized AI agents to
                  exchange structured JSON-RPC messages with explicit AgentCards, correlation IDs,
                  and collaborate securely across domain boundaries.
                </span>
              </div>

              {/* Specialist agent result cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {currentRun?.agentResults ? (
                  <>
                    <AgentResultCard
                      agentKey="fleet"
                      title="Fleet Analysis Agent"
                      icon={<Truck className="w-3.5 h-3.5" />}
                      agentData={
                        currentRun.agentResults.fleet ||
                        currentRun.agentResults.fleet_agent ||
                        currentRun.agentResults.FleetAgent
                      }
                      borderColor="border-industrial-border/80"
                      iconColor="text-telemetry-cyan"
                    />
                    <AgentResultCard
                      agentKey="maintenance"
                      title="Maintenance Analysis Agent"
                      icon={<Wrench className="w-3.5 h-3.5" />}
                      agentData={
                        currentRun.agentResults.maintenance ||
                        currentRun.agentResults.maintenance_agent ||
                        currentRun.agentResults.MaintenanceAgent
                      }
                      borderColor="border-industrial-border/80"
                      iconColor="text-warning-amber"
                    />
                  </>
                ) : (
                  /* Fallback descriptive cards when agentResults not available */
                  <>
                    <div className="bg-industrial-slate/40 border border-industrial-border/80 rounded p-3 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                          <Truck className="w-3.5 h-3.5 text-telemetry-cyan" />
                          <span>Fleet Analysis Agent</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          A2A Response
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Evaluated ramp congestion ({congestion}%) and fleet availability ({fleet}%).
                        Identified bottleneck risk on haul road gradient.
                      </p>
                      {currentRun?.events && (
                        <div className="text-[10px] text-slate-400 font-mono pt-1 flex items-center gap-3">
                          <span>
                            Method:{' '}
                            <strong className="text-slate-300">analyzeFleetTelemetry</strong>
                          </span>
                          {currentRun.events.find(
                            (e) => e.event === 'FLEET_A2A_RESPONSE_RECEIVED'
                          )?.duration_ms !== undefined && (
                            <span>
                              Latency:{' '}
                              <strong className="text-emerald-400">
                                {
                                  currentRun.events.find(
                                    (e) => e.event === 'FLEET_A2A_RESPONSE_RECEIVED'
                                  )?.duration_ms
                                }
                                ms
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="bg-industrial-slate/40 border border-industrial-border/80 rounded p-3 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                          <Wrench className="w-3.5 h-3.5 text-warning-amber" />
                          <span>Maintenance Analysis Agent</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          A2A Response
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Analyzed simulated engine heat ({temperature}°C). Detected thermal anomaly
                        and mechanical stress accumulation.
                      </p>
                      {currentRun?.events && (
                        <div className="text-[10px] text-slate-400 font-mono pt-1 flex items-center gap-3">
                          <span>
                            Method:{' '}
                            <strong className="text-slate-300">analyzeEquipmentHealth</strong>
                          </span>
                          {currentRun.events.find(
                            (e) => e.event === 'MAINTENANCE_A2A_RESPONSE_RECEIVED'
                          )?.duration_ms !== undefined && (
                            <span>
                              Latency:{' '}
                              <strong className="text-emerald-400">
                                {
                                  currentRun.events.find(
                                    (e) => e.event === 'MAINTENANCE_A2A_RESPONSE_RECEIVED'
                                  )?.duration_ms
                                }
                                ms
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {currentRun?.experimentId && (
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2 border-t border-industrial-border/60 pt-2">
                  <span>A2A Correlation ID:</span>
                  <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                    {currentRun.experimentId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Supervisor Synthesis */}
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-industrial-slate border-2 border-telemetry-cyan flex items-center justify-center text-telemetry-cyan">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-slate-200">
                  3. Supervisor Agent — Multi-Signal Synthesis
                </span>
                <div className="flex items-center gap-2">
                  {currentRun?.offlineAiStatus === 'active' ? (
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ● OFFLINE AI ACTIVE
                    </span>
                  ) : currentRun ? (
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30">
                      ○ DETERMINISTIC FALLBACK
                    </span>
                  ) : null}
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                      getStepLabel(2).cls
                    }`}
                  >
                    {getStepLabel(2).label}
                  </span>
                </div>
              </div>

              {/* Actual AI reasoning text from trace */}
              {currentRun?.proposedExplanation ? (
                <div className="bg-obsidian/80 border border-telemetry-cyan/20 rounded p-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-telemetry-cyan/70 block mb-1">
                    Offline AI Synthesis Rationale:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    &ldquo;{currentRun.proposedExplanation}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fused specialist findings into an advisory proposal:{' '}
                  <strong>
                    {currentRun ? currentRun.proposedDecision : 'Evaluating…'}
                  </strong>{' '}
                  (Confidence:{' '}
                  {currentRun?.proposedConfidence
                    ? `${Math.round(currentRun.proposedConfidence * 100)}%`
                    : '95%'}
                  )
                </p>
              )}

              {/* Tools used badges */}
              {currentRun?.toolsUsed && currentRun.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-slate-500 font-semibold self-center">
                    Tools called:
                  </span>
                  {currentRun.toolsUsed.map((tool) => (
                    <span
                      key={tool}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-telemetry-cyan/10 text-telemetry-cyan border border-telemetry-cyan/25"
                    >
                      [{tool}]
                    </span>
                  ))}
                </div>
              )}

              {/* Knowledge snippet if used */}
              {currentRun?.offlineKnowledgeSnippet && (
                <details className="group">
                  <summary className="text-[10px] font-semibold text-slate-400 cursor-pointer hover:text-telemetry-cyan flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Local Knowledge Base Snippet Used
                  </summary>
                  <p className="text-[10px] text-slate-500 mt-1 pl-4 leading-relaxed font-mono">
                    {currentRun.offlineKnowledgeSnippet}
                  </p>
                </details>
              )}

              <p className="text-xs text-slate-500">
                Advisory proposal:{' '}
                <strong className="text-slate-300">
                  {currentRun ? currentRun.proposedDecision : 'Evaluating…'}
                </strong>
                {currentRun?.proposedConfidence !== undefined && (
                  <span>
                    {' '}
                    · Confidence:{' '}
                    <strong className="text-telemetry-cyan">
                      {Math.round(currentRun.proposedConfidence * 100)}%
                    </strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Step 4: Deterministic Safety Engine — visually elevated */}
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-hazard-red/20 border-2 border-hazard-red flex items-center justify-center text-hazard-red">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div
              className={`border-2 rounded-lg p-3.5 space-y-1 transition-all duration-300 ${
                currentRun?.isOverridden
                  ? 'bg-red-950/30 border-hazard-red/60'
                  : currentRun
                  ? 'bg-nominal-green/5 border-nominal-green/30'
                  : 'bg-obsidian/70 border-hazard-red/30'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-hazard-red" />
                  4. TypeScript Deterministic Safety Engine
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-hazard-red/20 text-red-300 border border-hazard-red/30">
                    AUTHORITATIVE GUARDRAIL
                  </span>
                  <span
                    className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                      getStepLabel(3).cls
                    }`}
                  >
                    {getStepLabel(3).label}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Evaluated advisory proposal against deterministic safety rules. Enforced simulated
                outcome:{' '}
                <strong
                  className={
                    currentRun?.decision === 'STOP_AND_INFORM_SUPERVISOR'
                      ? 'text-hazard-red'
                      : 'text-nominal-green'
                  }
                >
                  {currentRun ? currentRun.decision.replace(/_/g, ' ') : 'Pending'}
                </strong>
                .
              </p>
            </div>
          </div>

          {/* Step 5: Learning Agent */}
          <div className="relative">
            <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-industrial-slate border-2 border-purple-400 flex items-center justify-center text-purple-400">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-3.5 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-sm text-slate-200">
                  5. Learning Agent — Pedagogical Synthesis
                </span>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                    getStepLabel(4).cls
                  }`}
                >
                  {getStepLabel(4).label}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracted educational takeaways, explained the interaction of mining signals, and
                formed reflective questions for the learner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. Learning Lab ──────────────────────────────────────────────── */}
      {currentRun && !loading && (
        <section
          className="bg-industrial-slate/30 border border-purple-500/30 rounded-xl p-5 sm:p-6 shadow-xl space-y-5"
          aria-label="Step 5: Learning Lab"
        >
          <div className="flex items-center justify-between border-b border-industrial-border pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-slate-100">Learning Lab: What Did We Learn?</h2>
            </div>
            <span className="text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-full">
              Educational Takeaways
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: What Happened & Contributing Signals */}
            <div className="space-y-4">
              <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-telemetry-cyan tracking-wider">
                  What Happened in this Simulation?
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{currentRun.whatHappened}</p>
              </div>

              <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4 space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-telemetry-cyan tracking-wider">
                  Which Mining Signals Mattered Most?
                </span>
                <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
                  {currentRun.signalsMattered.map((sig, i) => (
                    <li key={i}>{sig}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Key Educational Takeaway & Reflection */}
            <div className="space-y-4">
              <div className="bg-purple-950/20 border border-purple-500/40 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span>Key Educational Takeaway</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {currentRun.learningTakeaway}
                </p>
              </div>

              {/* Socratic Reflection Question */}
              <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4 space-y-2.5">
                <div className="text-xs font-bold text-slate-200">
                  <span className="text-warning-amber">Think About It:</span>{' '}
                  {currentRun.reflectionQuestion}
                </div>

                <button
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs font-semibold text-telemetry-cyan hover:underline cursor-pointer flex items-center gap-1"
                >
                  {showHint ? 'Hide Instructor Guidance' : 'Reveal Instructor Guidance'}
                </button>

                {showHint && (
                  <div className="bg-industrial-slate/60 border border-industrial-border p-3 rounded-md text-xs text-slate-300 leading-relaxed">
                    <strong>Instructor Guidance:</strong> Heavy mining haul trucks carrying massive
                    payloads uphill generate high thermal energy. When traffic congestion forces
                    trucks to stop or crawl on steep gradients, airflow cooling drops while engine
                    load peaks. That compounding interaction is why traffic bottlenecks trigger rapid
                    thermal failures!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Try Another Condition CTA */}
          <div className="bg-telemetry-cyan/10 border border-dashed border-telemetry-cyan/40 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-telemetry-cyan flex-shrink-0" />
              <span>
                <strong>Next Experiment:</strong> Try moving the <em>Ramp Congestion</em> slider
                down from 80% to 15% and click <strong>RUN EXPERIMENT</strong> to observe how the
                outcome changes!
              </span>
            </div>
            <button
              onClick={() => setCongestion(15)}
              className="px-3 py-1.5 rounded bg-telemetry-cyan/20 hover:bg-telemetry-cyan/30 text-telemetry-cyan font-bold whitespace-nowrap cursor-pointer transition-colors"
            >
              Set Congestion to 15%
            </button>
          </div>
        </section>
      )}

      {/* ── 11. Responsible AI Requirements ───────────────────────────────── */}
      <section
        className="bg-industrial-slate/30 border border-industrial-border rounded-xl p-5 shadow-md space-y-4"
        aria-label="Responsible AI Requirements"
      >
        <div className="flex items-center justify-between border-b border-industrial-border pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-telemetry-cyan" />
            <h2 className="text-base font-bold text-slate-100">Responsible AI Requirements</h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Kansanshi Hackathon Brief Alignment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {[
            {
              Icon: Scale,
              label: 'Fairness',
              color: 'text-telemetry-cyan',
              desc: 'Objective physics thresholds apply consistently across all simulated assets without operational bias.',
            },
            {
              Icon: Lock,
              label: 'Safety',
              color: 'text-nominal-green',
              desc: 'Educational sandbox only. Zero ability or code to actuate real physical mining equipment.',
            },
            {
              Icon: Eye,
              label: 'Privacy',
              color: 'text-indigo-400',
              desc: '100% synthetic generated telemetry. No proprietary mine production data is used or stored.',
            },
            {
              Icon: Activity,
              label: 'Transparency',
              color: 'text-warning-amber',
              desc: 'Transparent multi-agent timeline explaining contributing sensor signals and reasoning.',
            },
            {
              Icon: UserCheck,
              label: 'Human Oversight',
              color: 'text-rose-400',
              desc: 'Mandatory fail-safe stop & supervisor review whenever critical safety boundaries are exceeded.',
            },
          ].map(({ Icon, label, color, desc }) => (
            <div
              key={label}
              className="bg-obsidian/70 border border-industrial-border rounded-lg p-3 space-y-1"
            >
              <div className={`flex items-center gap-1.5 font-bold ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
