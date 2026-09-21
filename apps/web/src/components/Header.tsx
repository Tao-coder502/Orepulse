// src/components/Header.tsx

import React from 'react';
import { Brain } from 'lucide-react';

export default function Header() {
  return (
    <header className="mb-6 text-center">
      <h1 className="text-4xl font-bold text-primary flex items-center justify-center gap-2">
        <Brain className="w-8 h-8" />
        OrePulse AI
      </h1>
      <p className="mt-2 text-lg text-gray-300">Interactive Agentic Mining Learning Laboratory</p>
      <span className="mt-3 inline-block bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">
        SIMULATION / EDUCATIONAL
      </span>
    </header>
  );
}
