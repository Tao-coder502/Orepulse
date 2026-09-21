import React, { useState } from 'react';
import Navigation, { NavTab } from './components/Navigation';
import WhatIfLab from './WhatIfLab';
import ArchitectureView from './components/ArchitectureView';
import ResponsibleAIView from './components/ResponsibleAIView';
import ProjectBriefView from './components/ProjectBriefView';
import { ShieldCheck, Info } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('lab');

  return (
    <div className="min-h-screen bg-obsidian text-slate-100 font-sans flex flex-col selection:bg-telemetry-cyan/30 selection:text-white">
      {/* Top Persistent Educational Notice */}
      <div className="bg-industrial-slate/80 border-b border-industrial-border px-4 py-1.5 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Info className="w-3.5 h-3.5 text-telemetry-cyan flex-shrink-0" />
        <span className="font-semibold tracking-wider text-slate-300">
          EDUCATIONAL SIMULATION · SYNTHETIC CONDITIONS · NOT FOR REAL MINE OPERATIONS
        </span>
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main id="main-content" role="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'lab' && <WhatIfLab />}
        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'responsible-ai' && <ResponsibleAIView />}
        {activeTab === 'brief' && <ProjectBriefView />}
      </main>

      {/* Persistent Subtle Footer */}
      <footer className="border-t border-industrial-border bg-obsidian/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>OrePulse AI — Interactive Agentic Mining Learning Laboratory</span>
          <span className="text-slate-600">
            Powered by Google ADK 2.0 • Deterministic Safety Engine • Fastify Runtime
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
