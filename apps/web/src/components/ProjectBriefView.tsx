// src/components/ProjectBriefView.tsx — Official Hackathon Storyboard & Brief

import React from 'react';
import { FileText, Target, Lightbulb, Compass, Clock } from 'lucide-react';

export default function ProjectBriefView() {
  return (
    <div className="space-y-6 py-2">
      <div className="border-b border-industrial-border pb-4">
        <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <FileText className="w-7 h-7 text-telemetry-cyan" />
          Kansanshi AI Hackathon 2026 Storyboard
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Theme: Shaping the Future of Learning with Agentic AI in the Mining Value Chain
        </p>
      </div>

      {/* Poster Board */}
      <div className="bg-industrial-slate/30 border border-industrial-border rounded-xl p-6 sm:p-8 shadow-xl">
        {/* Title Block */}
        <div className="text-center pb-6 border-b border-industrial-border/80 mb-6">
          <span className="text-xs font-extrabold tracking-widest text-telemetry-cyan uppercase">
            KANSANSHI MINING PLC • AI HACKATHON 2026
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-1 mb-2 tracking-tight">
            OrePulse AI
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Interactive Agentic Mining Learning Laboratory
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Problem */}
          <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
              <Target className="w-4 h-4" />
              <span>The Industry Learning Gap</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Open-pit mining operations are complex, hazardous, and capital-intensive. Students and junior engineers cannot safely experiment with AI systems inside live operational dispatch environments. Consequently, AI is either feared as an unvetted black box or misused without understanding safety constraints.
            </p>
          </div>

          {/* Solution */}
          <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
              <Lightbulb className="w-4 h-4" />
              <span>The Educational Solution</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>OrePulse AI</strong> is an interactive Agentic Mining Learning Laboratory. Learners explore synthetic mining scenarios, observe specialized AI agents collaborate using Google ADK 2.0, see an AI recommendation, and observe an authoritative deterministic safety layer strictly enforce safe outcomes.
            </p>
          </div>

          {/* Key Innovations */}
          <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-telemetry-cyan">
              <Compass className="w-4 h-4" />
              <span>Core Innovations</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc leading-relaxed">
              <li><strong>Google ADK 2.0 Agent Runtime:</strong> Supervisor, Fleet Analysis, Maintenance Analysis, and Learning agents.</li>
              <li><strong>Authoritative Safety Layer:</strong> Inviolable deterministic guardrail that overrides AI proposals.</li>
              <li><strong>What-If Experimentation:</strong> Interactive parameter tuning with instant cause-and-effect feedback.</li>
              <li><strong>Pedagogical Reflection:</strong> Guided takeaways and self-reflection prompts.</li>
            </ul>
          </div>

          {/* 5-Minute Pitch Outline */}
          <div className="bg-obsidian/70 border border-industrial-border rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-nominal-green">
              <Clock className="w-4 h-4" />
              <span>5-Minute Demonstration Plan</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="bg-industrial-slate/40 p-2 rounded border border-industrial-border/60">
                <strong className="text-slate-100">0:00 – 0:30:</strong> The Learning Gap in High-Risk Mining
              </div>
              <div className="bg-industrial-slate/40 p-2 rounded border border-industrial-border/60">
                <strong className="text-slate-100">0:30 – 1:00:</strong> Introducing OrePulse AI Mining Learning Laboratory
              </div>
              <div className="bg-industrial-slate/40 p-2 rounded border border-industrial-border/60">
                <strong className="text-slate-100">1:00 – 3:15:</strong> Live Run (Combined Risk → STOP → What-If Congestion Tuning → NORMAL)
              </div>
              <div className="bg-industrial-slate/40 p-2 rounded border border-industrial-border/60">
                <strong className="text-slate-100">3:15 – 4:00:</strong> Architecture: AI Proposes, Safety Engine Decides
              </div>
              <div className="bg-industrial-slate/40 p-2 rounded border border-industrial-border/60">
                <strong className="text-slate-100">4:00 – 4:30:</strong> Responsible AI Requirements Compliance
              </div>
              <div className="bg-industrial-slate/40 p-2 rounded border border-industrial-border/60">
                <strong className="text-slate-100">4:30 – 5:00:</strong> Closing: Human-in-the-Loop STEM AI Empowerment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
