// src/types.ts

/** Core state definitions for the deterministic mining simulation **/
export interface MineState {
  timestamp: string; // ISO8601
  oreGrade: number; // arbitrary units
  depth: number; // meters
  equipment: EquipmentState;
  ramp: RampState;
  fleet: FleetState;
}

export interface EquipmentState {
  temperature: number; // °C (synthetic educational values)
  status: 'operational' | 'degraded' | 'failed';
  alert?: MaintenanceAlert;
}

export interface MaintenanceAlert {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RampState {
  congestionLevel: number; // 0 (free) – 100 (gridlock)
  status: 'open' | 'closed';
}

export interface TruckState {
  id: string;
  temperature: number; // °C
  operational: boolean;
}

export interface FleetState {
  trucks: TruckState[];
  availability: number; // 0 – 100 % of fleet available
}

/** Scenario definition **/
export interface SimulationScenario {
  id: string;
  description: string;
  initialMineState: MineState;
  // deterministic what‑if variables that can be overridden via the API
  simulatedTruckTemperature?: number;
  simulatedRampCongestion?: number;
  simulatedFleetAvailability?: number;
}

/** Telemetry emitted each simulation step **/
export interface Telemetry {
  sensorId: string;
  value: number;
  unit: string;
  timestamp: string; // ISO8601
}
export interface A2ATraceEvent {
  agent: string;
  event: string;
  status: string;
  timestamp: string;
  duration_ms: number;
  transport: string;
  requestId: string;
  details?: any;
}

// Execution trace types for the What-If lab
export interface AgentExecutionTrace {
  executionId: string;
  experimentId?: string;
  timestamp: string;
  inputSummary: string;
  executionMode?: 'a2a_adk' | 'adk' | 'deterministic_fallback';
  llmUsed?: boolean;
  llmProvider?: string | null;
  llmModel?: string | null;
  /** Offline AI provider status for this execution */
  offlineAiStatus?: 'active' | 'unavailable' | 'timeout' | 'invalid_output' | 'fallback';
  /** Tools invoked by the Offline AI during synthesis */
  toolsUsed?: string[];
  /** Short excerpt from the local knowledge base used during synthesis */
  offlineKnowledgeSnippet?: string | null;
  supervisorStarted: boolean;
  agentsInvoked: string[];
  agentResults: Record<string, any>;
  proposedDecision: any;
  safetyEvaluation: any;
  finalDecision: any;
  humanOversightRequired: boolean;
  isOverridden?: boolean;
  events?: A2ATraceEvent[];
  learningExplanation?: LearningExplanation;
  decisionAuthority?: string;
  agentRole?: string;
}

export interface LabRunResponse {
  runId: string;
  trace: AgentExecutionTrace;
}

export interface WhatIfPayload {
  scenarioId: string;
  steps: number;
  variables?: Record<string, number>;
}
// Additional contract interfaces for Phase 9 integration
export interface AgentResult {
  status: string;
  detail?: string;
  // Agent‑specific payloads can be added as needed
}

export interface SafetyEvaluation {
  decision: 'NORMAL' | 'WARNING' | 'ESCALATE' | 'STOP_AND_INFORM_SUPERVISOR';
  rationale: string;
}

export interface LearningExplanation {
  whatHappened: string;
  importantSignals: string[];
  agentsInvolved: string[];
  decisionExplanation: string;
  safetyExplanation: string;
  learningTakeaway: string;
  reflectionQuestion: string;
}
