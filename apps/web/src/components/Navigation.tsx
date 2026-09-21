// src/components/Navigation.tsx — Agentic Mining Learning Laboratory Navigation

import React from 'react';
import { Brain, Cpu, ShieldCheck, FileText, FlaskConical } from 'lucide-react';

export type NavTab = 'lab' | 'architecture' | 'responsible-ai' | 'brief';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <header className="sticky top-0 z-50 bg-obsidian/90 backdrop-blur-md border-b border-industrial-border w-full" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        {/* Brand */}
        <button
          className="flex items-center gap-3 bg-transparent border-0 cursor-pointer p-0 text-left hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-telemetry-cyan focus:ring-offset-2 focus:ring-offset-obsidian rounded-lg"
          onClick={() => onTabChange('lab')}
          aria-label="OrePulse AI Home"
        >
          <div className="w-9 h-9 rounded-lg bg-telemetry-cyan/10 border border-telemetry-cyan/30 flex items-center justify-center text-telemetry-cyan shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Brain className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-base sm:text-lg text-slate-100 tracking-tight">OrePulse AI</span>
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/30">
              LEARNING LAB
            </span>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1" role="navigation" aria-label="Main Navigation">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-telemetry-cyan ${
              activeTab === 'lab'
                ? 'bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-industrial-slate/50 border border-transparent'
            }`}
            onClick={() => onTabChange('lab')}
            aria-current={activeTab === 'lab' ? 'page' : undefined}
          >
            <FlaskConical className="w-4 h-4" />
            <span>What-If Lab</span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-telemetry-cyan ${
              activeTab === 'architecture'
                ? 'bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-industrial-slate/50 border border-transparent'
            }`}
            onClick={() => onTabChange('architecture')}
            aria-current={activeTab === 'architecture' ? 'page' : undefined}
          >
            <Cpu className="w-4 h-4" />
            <span>Agent Architecture</span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-telemetry-cyan ${
              activeTab === 'responsible-ai'
                ? 'bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-industrial-slate/50 border border-transparent'
            }`}
            onClick={() => onTabChange('responsible-ai')}
            aria-current={activeTab === 'responsible-ai' ? 'page' : undefined}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Responsible AI</span>
          </button>

          <button
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-telemetry-cyan ${
              activeTab === 'brief'
                ? 'bg-telemetry-cyan/15 text-telemetry-cyan border border-telemetry-cyan/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-industrial-slate/50 border border-transparent'
            }`}
            onClick={() => onTabChange('brief')}
            aria-current={activeTab === 'brief' ? 'page' : undefined}
          >
            <FileText className="w-4 h-4" />
            <span>Storyboard &amp; Brief</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
