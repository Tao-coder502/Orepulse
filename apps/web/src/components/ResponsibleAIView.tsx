// src/components/ResponsibleAIView.tsx — Responsible AI Requirements

import React from 'react';
import { ShieldCheck, Scale, Lock, Eye, Activity, UserCheck, CheckCircle2 } from 'lucide-react';

export default function ResponsibleAIView() {
  const pillars = [
    {
      title: 'Fairness',
      icon: <Scale className="w-5 h-5 text-telemetry-cyan" />,
      rule: 'Avoid bias in operational evaluations',
      implementation: 'All simulated assets (haul trucks, ramp road segments) are evaluated using identical, objective physics and thermal thresholds without preferential weighting or operational bias.',
      verification: 'Verified via unit testing in test/safety.test.ts.'
    },
    {
      title: 'Safety',
      icon: <Lock className="w-5 h-5 text-nominal-green" />,
      rule: 'Do not provide operational instructions for real mining activities',
      implementation: 'OrePulse is strictly an educational mining simulation environment using synthetic physics. The codebase contains zero device drivers, hardware interfaces, or network sockets capable of actuating physical mine machinery.',
      verification: 'Strict educational sandbox policy verified across codebase.'
    },
    {
      title: 'Privacy',
      icon: <Eye className="w-5 h-5 text-indigo-400" />,
      rule: 'Use only synthetic or anonymised data',
      implementation: 'All telemetry (haul truck IDs, road gradient, copper grades) is generated synthetically at runtime. Zero proprietary production databases or telemetry streams are connected.',
      verification: 'Verified clean repository scan with zero secrets or proprietary telemetry.'
    },
    {
      title: 'Transparency',
      icon: <Activity className="w-5 h-5 text-warning-amber" />,
      rule: 'Clearly explain how the AI reaches decisions',
      implementation: 'Every simulation run produces a structured execution trace in the Learning Lab detailing: What Happened, Observable Triggering Signals, and Why the Deterministic Safety Engine Evaluated the Proposal.',
      verification: 'Audited in DEMO_FLOW.md and automated test suite.'
    },
    {
      title: 'Human Oversight',
      icon: <UserCheck className="w-5 h-5 text-rose-400" />,
      rule: 'Include "Stop and Inform a Supervisor" decision points where appropriate',
      implementation: 'Whenever simulated conditions breach safe operating bounds (e.g. Engine Heat > 100°C or Ramp Congestion > 60% with thermal stress), the deterministic Safety Engine strictly enforces STOP_AND_INFORM_SUPERVISOR.',
      verification: 'Deterministic Safety Engine Rule #SE-04 guarantees human oversight.'
    }
  ];

  return (
    <div className="space-y-6 py-2">
      <div className="border-b border-industrial-border pb-4">
        <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-nominal-green" />
          Responsible AI Requirements
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Demonstrating adherence to all 5 ethical requirements of the Kansanshi Mining PLC AI Hackathon brief.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {pillars.map((p, idx) => (
          <div key={idx} className="bg-industrial-slate/30 border border-industrial-border rounded-xl p-5 sm:p-6 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-obsidian border border-industrial-border flex items-center justify-center flex-shrink-0">
                {p.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">{p.title}</h3>
                <span className="text-xs text-slate-400">Requirement: {p.rule}</span>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
              <p>
                <strong className="text-slate-200">Implementation:</strong> {p.implementation}
              </p>
              <div className="inline-flex items-center gap-2 text-emerald-400 bg-nominal-green/10 border border-nominal-green/30 px-3 py-1 rounded-md text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{p.verification}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
