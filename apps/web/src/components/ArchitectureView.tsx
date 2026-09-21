// src/components/ArchitectureView.tsx — Agent Architecture Overview

import React from 'react';
import { Brain, Cpu, ShieldAlert, BookOpen, Truck, Wrench, UserCheck, ArrowDown, CheckCircle2, Network } from 'lucide-react';

export default function ArchitectureView() {
  return (
    <div className="space-y-8 py-2">
      {/* View Header */}
      <div className="border-b border-industrial-border pb-4">
        <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <Cpu className="w-7 h-7 text-telemetry-cyan" />
          Multi-Agent Architecture &amp; Safety Boundary
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          How Google ADK 2.0 agents cooperate under authoritative deterministic safety constraints.
        </p>
      </div>

      {/* Core Principle Banner */}
      <div className="bg-industrial-slate/40 border border-industrial-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-lg">
        <span className="bg-telemetry-cyan text-obsidian text-xs font-extrabold uppercase px-3 py-1 rounded-full tracking-wider">
          Core Architectural Invariant
        </span>
        <span className="text-base sm:text-lg font-semibold text-slate-100">
          AI Proposes. Deterministic Safety Rules Constrain. Humans Retain Authority.
        </span>
      </div>

      {/* 3-Tier Architecture Flow */}
      <div className="flex flex-col gap-4 items-center">
        {/* Tier 1: Simulation */}
        <div className="w-full bg-industrial-slate/30 border border-industrial-border rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Tier 1: Educational Mining Simulation
            </span>
            <span className="text-xs text-slate-400">Deterministic Mathematical Physics</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            Deterministic Mining Simulation (Synthetic Data)
          </h3>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            A pure mathematical simulation engine generating synthetic telemetry: haul truck engine heat, haul road congestion %, and fleet availability.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
            <li className="flex items-center gap-2 bg-obsidian/60 p-2.5 rounded-lg border border-industrial-border/60">
              <CheckCircle2 className="w-4 h-4 text-nominal-green flex-shrink-0" />
              <span>100% reproducible and offline</span>
            </li>
            <li className="flex items-center gap-2 bg-obsidian/60 p-2.5 rounded-lg border border-industrial-border/60">
              <CheckCircle2 className="w-4 h-4 text-nominal-green flex-shrink-0" />
              <span>Zero connection to physical machinery</span>
            </li>
            <li className="flex items-center gap-2 bg-obsidian/60 p-2.5 rounded-lg border border-industrial-border/60">
              <CheckCircle2 className="w-4 h-4 text-nominal-green flex-shrink-0" />
              <span>Educational open-pit haulage model</span>
            </li>
          </ul>
        </div>

        <div className="text-slate-500 my-1">
          <ArrowDown className="w-6 h-6 animate-bounce" />
        </div>

        {/* Tier 2: Multi-Agent Layer */}
        <div className="w-full bg-industrial-slate/30 border border-industrial-border rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Tier 2: Google ADK 2.0 + A2A Protocol Runtime (Advisory)
            </span>
            <span className="text-xs text-emerald-400 font-medium">A2A Interoperable Protocol Pipeline</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            Specialist Analysis Agents &amp; A2A Transport
          </h3>
          <p className="text-sm text-slate-400 mb-5 leading-relaxed">
            Autonomous specialized agents built with <strong>Google ADK 2.0</strong> and interconnected via the <strong>A2A (Agent2Agent) Protocol</strong>, decomposing simulated operational complexity into advisory proposals:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4">
              <div className="font-bold text-sm text-slate-200 flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-telemetry-cyan" />
                <span>Supervisor Agent</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stage 1 (Intake &amp; Scoping) defines analysis boundaries and dispatches parallel A2A requests. Stage 3 (Synthesis) fuses specialist findings into a single advisory <em>SupervisorRecommendation</em> proposal.
              </p>
            </div>

            <div className="bg-obsidian/80 border border-emerald-500/30 rounded-lg p-4">
              <div className="font-bold text-sm text-emerald-400 flex items-center gap-2 mb-2">
                <Network className="w-4 h-4 text-emerald-400" />
                <span>A2A Protocol Transport</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Asynchronous JSON-RPC 2.0 protocol layer with AgentCard discovery, correlation ID propagation, and sub-millisecond specialist delegation.
              </p>
            </div>

            <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4">
              <div className="font-bold text-sm text-slate-200 flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-warning-amber" />
                <span>Maintenance Analysis Agent</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Responds to <em>MaintenanceAnalysisRequest</em> over A2A. Detects simulated thermal anomalies and evaluates mechanical stress severity from synthetic equipment telemetry.
              </p>
            </div>

            <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4">
              <div className="font-bold text-sm text-slate-200 flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-telemetry-cyan" />
                <span>Fleet Analysis Agent</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Responds to <em>FleetAnalysisRequest</em> over A2A. Analyzes simulated haul ramp bottlenecks and fleet availability to evaluate dispatch throttling and cycle rebalancing.
              </p>
            </div>

            <div className="bg-obsidian/80 border border-industrial-border rounded-lg p-4 md:col-span-2 lg:col-span-2">
              <div className="font-bold text-sm text-slate-200 flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span>Learning Agent</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Executes strictly post-decision to translate the technical event trace into accessible pedagogical explanations and Socratic reflection questions.
              </p>
            </div>
          </div>
        </div>

        <div className="text-slate-500 my-1">
          <ArrowDown className="w-6 h-6 animate-bounce" />
        </div>

        {/* Tier 3: Deterministic Safety Engine */}
        <div className="w-full bg-industrial-slate/30 border border-hazard-red/40 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-hazard-red/20 text-red-300 border border-hazard-red/40">
              Tier 3: Authoritative Guardrail (Non-LLM)
            </span>
            <span className="text-xs text-red-400 font-semibold">Strict Deterministic Boundary</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            Deterministic TypeScript Safety Engine
          </h3>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            An inviolable deterministic layer that intercepts every AI proposal. If risk thresholds (&gt;100°C overheat, or compounding congestion &gt;60% with overheat) are breached, the Safety Engine overrides the AI and enforces an immediate fail-safe stop.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="bg-nominal-green/10 border border-nominal-green/30 px-3.5 py-2 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-nominal-green" />
              <span>AI Cannot Override Deterministic Safety Rules</span>
            </div>
            <div className="bg-nominal-green/10 border border-nominal-green/30 px-3.5 py-2 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-nominal-green" />
              <span>Mandatory Human Supervisor Escalation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
