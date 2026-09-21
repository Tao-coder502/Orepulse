// src/server.ts

import Fastify from 'fastify';
import { spawnSync } from 'child_process';
import path from 'path';
import { createScenario, getScenario, updateSimulationState, resetScenario, runSimulation, SimulationScenarioSchema, MineStateSchema, TelemetrySchema } from './simulation.js';
import { z } from 'zod';
import { saveTrace, getTrace } from './labState.js';
import { AgentExecutionTrace, LabRunResponse, WhatIfPayload } from './types.js';
import { evaluateSafety, SafetyStatus } from './safety.js';

// Helper to invoke a Python agent with timeout and deterministic fallback
import { invokePythonAgent, PYTHON_TIMEOUT_MS } from './pythonBridge.js';

function invokeAgent(agentName: string, payload: any): any {
  // The pythonBridge handles errors and returns a deterministic fallback
  return invokePythonAgent(fastify.log, agentName, payload, PYTHON_TIMEOUT_MS);
}

const fastify = Fastify({ logger: true });

// Types for request bodies
const RunSimulationBody = z.object({
  scenarioId: z.string(),
  steps: z.number().int().positive(),
  simulatedTruckTemperature: z.number().optional(),
  simulatedRampCongestion: z.number().optional(),
  simulatedFleetAvailability: z.number().optional(),
  experimentId: z.string().optional(),
});

fastify.post('/api/simulation/run', async (request, reply) => {
  const parseResult = RunSimulationBody.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error.format() });
  }
  const { scenarioId, steps, simulatedTruckTemperature, simulatedRampCongestion, simulatedFleetAvailability } = parseResult.data;
  const overrides = { simulatedTruckTemperature, simulatedRampCongestion, simulatedFleetAvailability };
  const result = runSimulation(scenarioId, steps, overrides);
  // Invoke specialist agents
  const telemetry = result.telemetry;
  const fleetAgentResult = invokeAgent('fleet', telemetry);
  const maintenanceAgentResult = invokeAgent('maintenance', telemetry);
  // Validate telemetry output
  const telemetryValid = TelemetrySchema.array().safeParse(result.telemetry);
  if (!telemetryValid.success) {
    return reply.status(500).send({ error: 'Telemetry validation failed' });
  }
  return reply.send({ ...result, fleetAgentResult, maintenanceAgentResult });
});

fastify.post('/api/simulation/reset', async (request, reply) => {
  const body = z.object({ scenarioId: z.string() }).safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: 'Invalid payload' });
  }
  const scenario = getScenario(body.data.scenarioId);
  const state = resetScenario(scenario);
  const validation = MineStateSchema.safeParse(state);
  if (!validation.success) {
    return reply.status(500).send({ error: 'State validation failed' });
  }
  return reply.send({ state });
});

fastify.get('/api/scenario/list', async (request, reply) => {
  return reply.send({
    scenarios: [
      {
        id: 'NORMAL_OPERATIONS',
        name: 'Normal Operations',
        description: 'Baseline steady-state mining operations with nominal parameters.'
      },
      {
        id: 'EQUIPMENT_ANOMALY',
        name: 'Equipment Anomaly',
        description: 'Haul truck T1 engine overheating (120°C) with degraded mechanical status.'
      },
      {
        id: 'COMBINED_OPERATIONAL_RISK',
        name: 'Combined Operational Risk',
        description: 'High haul ramp congestion (80%) combined with elevated truck temperature and reduced fleet availability.'
      }
    ]
  });
});

fastify.get('/api/scenario/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const scenario = getScenario(id);
    const validation = SimulationScenarioSchema.safeParse(scenario);
    if (!validation.success) {
      return reply.status(500).send({ error: 'Scenario validation failed' });
    }
    return reply.send({ scenario });
  } catch (e: any) {
    return reply.status(404).send({ error: e.message });
  }
});

// Lab endpoint (reuses RunSimulationBody shape)
fastify.post('/api/lab/run', async (request, reply) => {
  const parseResult = RunSimulationBody.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({ error: 'Invalid payload', details: parseResult.error.format() });
  }
  const { scenarioId, steps, simulatedTruckTemperature, simulatedRampCongestion, simulatedFleetAvailability, experimentId } = parseResult.data;
  const overrides = { simulatedTruckTemperature, simulatedRampCongestion, simulatedFleetAvailability };
  const result = runSimulation(scenarioId, steps, overrides);

  // Validate canonical MineState boundary
  const stateValidation = MineStateSchema.safeParse(result.finalState);
  if (!stateValidation.success) {
    return reply.status(500).send({ error: 'Canonical MineState validation failed', details: stateValidation.error.format() });
  }

  // Pass canonical MineState directly to Python bridge
  const canonicalPayload = {
    ...result.finalState,
    scenarioId,
    experimentId,
  };
  const trace: AgentExecutionTrace = invokeAgent('supervisor', canonicalPayload);

  // Authoritative Deterministic Safety Engine Evaluation in TypeScript
  const proposedAction = trace.proposedDecision?.proposedAction || 'adjustDrillSpeed';
  const proposedParams = trace.proposedDecision?.parameters || {};
  const proposedConfidence = trace.proposedDecision?.confidence || 0.95;

  const safetyEval = evaluateSafety(
    {
      action: proposedAction,
      parameters: proposedParams,
      confidence: proposedConfidence
    },
    result.finalState
  );

  // Enforce authoritative governance: Safety Engine overrules LLM proposals
  const isOverridden = trace.proposedDecision?.decision !== safetyEval.status;
  trace.safetyEvaluation = safetyEval;
  trace.finalDecision = {
    decision: safetyEval.status,
    action: safetyEval.status === SafetyStatus.ALLOW ? proposedAction : 'halt',
    enforcedRules: safetyEval.triggeredRules
  };
  trace.humanOversightRequired = safetyEval.humanOversightRequired;
  trace.isOverridden = isOverridden;
  trace.decisionAuthority = 'typescript_safety_engine';
  trace.agentRole = 'proposal_only';

  // Ensure learning explanation reflects authoritative Safety Engine intervention
  if (isOverridden && trace.learningExplanation) {
    trace.learningExplanation.decisionExplanation = `The supervisor proposed '${trace.proposedDecision?.decision}', but the authoritative TypeScript Safety Engine intervened: ${safetyEval.explanation}`;
    trace.learningExplanation.safetyExplanation = `The deterministic TypeScript Safety Engine is authoritative over all AI proposals. Triggered rules: ${safetyEval.triggeredRules.join(', ') || 'safety boundary'}.`;
  }

  const runId = `${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
  saveTrace(runId, trace);
  const response: LabRunResponse = { runId, trace };
  return reply.send(response);
});

fastify.get('/api/lab/trace/:runId', async (request, reply) => {
  const { runId } = request.params as { runId: string };
  const trace = getTrace(runId);
  if (!trace) {
    return reply.status(404).send({ error: 'Run ID not found' });
  }
  return reply.send({ runId, trace });
});

export const start = async (port = 3000) => {
  try {
    await fastify.listen({ port, host: '127.0.0.1' });
    fastify.log.info(`Server listening on ${fastify.server.address()}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

export { fastify };

// Only automatically listen if run directly and not in test
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  start();
}




