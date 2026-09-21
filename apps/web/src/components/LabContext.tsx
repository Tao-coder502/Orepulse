// src/components/LabContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LabState {
  scenarioId: string;
  steps: number;
  temperature: number;
  congestion: number;
  fleet: number;
  runId?: string;
  trace?: any;
  loading: boolean;
  error?: string;
}

interface LabContextProps extends LabState {
  setScenarioId: (id: string) => void;
  setSteps: (steps: number) => void;
  setTemperature: (t: number) => void;
  setCongestion: (c: number) => void;
  setFleet: (f: number) => void;
  runSimulation: () => Promise<void>;
  reset: () => void;
}

const LabContext = createContext<LabContextProps | undefined>(undefined);

export const useLab = () => {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLab must be used within LabProvider');
  return ctx;
};

export const LabProvider = ({ children }: { children: ReactNode }) => {
  const [scenarioId, setScenarioId] = useState('default-scenario');
  const [steps, setSteps] = useState(10);
  const [temperature, setTemperature] = useState(25);
  const [congestion, setCongestion] = useState(20);
  const [fleet, setFleet] = useState(80);
  const [runId, setRunId] = useState<string | undefined>(undefined);
  const [trace, setTrace] = useState<any>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const reset = () => {
    setRunId(undefined);
    setTrace(undefined);
    setError(undefined);
    setLoading(false);
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const payload = {
        scenarioId,
        steps,
        simulatedTruckTemperature: temperature,
        simulatedRampCongestion: congestion,
        simulatedFleetAvailability: fleet,
      };
      const res = await fetch('/api/lab/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Simulation failed');
      const data = await res.json();
      setRunId(data.runId);
      setTrace(data.trace);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LabContext.Provider
      value={{
        scenarioId,
        steps,
        temperature,
        congestion,
        fleet,
        runId,
        trace,
        loading,
        error,
        setScenarioId,
        setSteps,
        setTemperature,
        setCongestion,
        setFleet,
        runSimulation,
        reset,
      }}
    >
      {children}
    </LabContext.Provider>
  );
};
