// src/labState.ts

/**
 * Simple in‑memory store for execution traces used by the What‑If lab.
 * It is deliberately lightweight – persistence across restarts is not required
 * for the educational simulation.
 */
import { AgentExecutionTrace } from "./types.js";

const traceStore = new Map<string, AgentExecutionTrace>();

/** Save a trace for a given run ID */
export function saveTrace(runId: string, trace: AgentExecutionTrace): void {
  traceStore.set(runId, trace);
}

/** Retrieve a previously‑saved trace */
export function getTrace(runId: string): AgentExecutionTrace | undefined {
  return traceStore.get(runId);
}
