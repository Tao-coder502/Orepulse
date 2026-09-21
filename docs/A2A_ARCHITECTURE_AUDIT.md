# OrePulse AI — A2A Protocol Architecture Audit

## Executive Summary

This document presents the pre-implementation architectural audit of **OrePulse AI** prior to introducing the **A2A (Agent2Agent) protocol**. The purpose of this audit is to inspect the existing multi-agent runtime, determine current communication patterns, verify library capabilities, and define exact boundaries ensuring that A2A elevates OrePulse into an interoperable multi-agent system without compromising deterministic safety or architectural invariants.

---

## 1. Which agents are currently independently executable?

In the current codebase (`agent-runtime/agents/`):

1. **Fleet Agent (`agents/fleet.py`)**:
   - Independently executable via `FleetAgent.evaluate(telemetry)` or CLI helper `run_fleet_agent(telemetry)`.
   - Ingests synthetic fleet telemetry (`ramp.congestionLevel`, `fleet.availability`, and raw sensor lists).
   - Produces structured findings (`AgentFinding`) and recommendations (`AgentRecommendation`) typed via `FleetAgentResponse`.

2. **Maintenance Agent (`agents/maintenance.py`)**:
   - Independently executable via `MaintenanceAgent.evaluate(telemetry)` or CLI helper `run_maintenance_agent(telemetry)`.
   - Ingests synthetic equipment telemetry (`equipment.temperature`, `equipment.status`, `equipment.alert`).
   - Produces structured findings and recommendations typed via `MaintenanceAgentResponse`.

3. **Learning Agent (`agents/learning.py`)**:
   - Independently executable via `LearningAgent.explain(context)` or CLI helper `run_learning_agent(decision_context)`.
   - Ingests post-decision simulation context (`finalDecision`, `safetyEvaluation`, `proposedDecision`, `importantSignals`, `agentsInvolved`).
   - Produces student-facing explanations and Socratic reflection questions typed via `LearningExplanation`.

4. **Supervisor Agent (`agents/supervisor.py`)**:
   - Independently executes Stage A intake via `SupervisorAgent.intake_and_scope(scenario_id, telemetry)`.
   - Executes synthesis via `SupervisorAgent.synthesize(...)`, but currently depends on in-process instances of `FleetAgentResponse` and `MaintenanceAgentResponse` passed directly to it.

5. **Runtime CLI (`run_lab_chain.py`)**:
   - Fastify executes `python agent-runtime/run_lab_chain.py --agent supervisor`, passing the simulation state via `stdin` and parsing the unified `AgentExecutionTrace` from `stdout`.

---

## 2. Which agents are currently invoked directly by ADK?

Currently, in `agent-runtime/workflows/ore_pulse_workflow.py`:

- The workflow instantiates `SupervisorAgent`, `FleetAgent`, `MaintenanceAgent`, and `LearningAgent` as local Python class instances.
- An ADK `ParallelAgent(name="specialists_parallel_agent", sub_agents=[fleet, maintenance])` is composed for architectural definition, but in the actual `OrePulseWorkflow.run(payload)` execution loop:
  ```python
  # Direct in-process method invocation (NOT protocol-based)
  fleet_result: FleetAgentResponse = self.fleet.evaluate(telemetry)
  maintenance_result: MaintenanceAgentResponse = self.maintenance.evaluate(telemetry)
  ```
- The Supervisor synthesis `self.supervisor.synthesize(...)` and Learning Agent explanation `self.learning.explain(...)` are also direct Python method calls.
- **Audit Conclusion**: Prior to this work, agent-to-agent communication was entirely in-process Python function calls. There was no protocol, network envelope, or message serialization crossing agent boundaries.

---

## 3. Where should A2A communication be introduced?

A2A communication must be introduced specifically across the **Supervisor ↔ Specialist Agent boundaries**:

```text
                  ┌──────────────────────┐
                  │   Supervisor Agent   │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
       A2A  │                            A2A  │
     Request│                          Request│
            ▼                                 ▼
   ┌─────────────────┐               ┌───────────────────────┐
   │   Fleet Agent   │               │   Maintenance Agent   │
   └────────┬────────┘               └───────────┬───────────┘
            │ A2A                                │ A2A
            │ Response                           │ Response
            └────────────────┬───────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Supervisor Synthesis │
                  └──────────────────────┘
```

### Components that must NOT use A2A:
- **React UI ↔ Fastify API**: Standard REST/JSON HTTP.
- **Fastify API ↔ Python Bridge**: Process IPC (stdio JSON).
- **Supervisor ↔ Safety Engine**: The Safety Engine is a deterministic TypeScript engine outside the AI agent boundary.
- **Safety Engine ↔ Learning Agent**: Direct downstream handoff of verified state.
- **Internal TypeScript utility functions**: Must remain purely deterministic code.

---

## 4. What messages and data should cross the A2A boundary?

All data crossing A2A must be strictly structured using Pydantic models. No arbitrary strings or raw LLM chain-of-thought are exposed.

1. **`FleetAnalysisRequest`** (Supervisor → Fleet):
   - `experiment_id`: Unique correlation ID for the experiment run.
   - `scenario_id`: Active scenario identifier (e.g. `COMBINED_OPERATIONAL_RISK`).
   - `timestamp`: UTC ISO8601 timestamp.
   - `telemetry`: Simulated ramp congestion, fleet availability, vehicle states, and raw telemetry sensors.

2. **`FleetAnalysisResponse`** (Fleet → Supervisor):
   - `experiment_id`: Correlated experiment ID.
   - `agent_id`: `"fleet_agent"`.
   - `status`: `"NOMINAL"` | `"DEGRADED"` | `"CRITICAL"`.
   - `findings`: Structured list of `AgentFinding` (signals, concerns, confidence, summary).
   - `recommendation`: Structured `AgentRecommendation` (proposed action, rationale, parameters).
   - `confidence`: Floating-point confidence score (0.0 – 1.0).
   - `explanation`: Concise observable summary.
   - `transport`: `"a2a"`.
   - `protocol_version`: `"1.0"`.

3. **`MaintenanceAnalysisRequest`** (Supervisor → Maintenance):
   - `experiment_id`: Unique correlation ID.
   - `scenario_id`: Active scenario identifier.
   - `timestamp`: UTC ISO8601 timestamp.
   - `telemetry`: Simulated equipment temperature, alert severity, alert code, operating status.

4. **`MaintenanceAnalysisResponse`** (Maintenance → Supervisor):
   - `experiment_id`: Correlated experiment ID.
   - `agent_id`: `"maintenance_agent"`.
   - `status`: `"NOMINAL"` | `"DEGRADED"` | `"CRITICAL"`.
   - `findings`: Structured list of `AgentFinding`.
   - `recommendation`: Structured `AgentRecommendation`.
   - `confidence`: Floating-point confidence score (0.0 – 1.0).
   - `explanation`: Concise observable summary.
   - `transport`: `"a2a"`.
   - `protocol_version`: `"1.0"`.

5. **`SupervisorSynthesisRequest`** (Internal Orchestrator → Supervisor Synthesis):
   - Combines `FleetAnalysisResponse` + `MaintenanceAnalysisResponse` + `telemetry`.
   - Yields `SupervisorRecommendation` (`decision`, `contributingSignals`, `agentsConsulted`, `proposedAction`, `confidence`).

---

## 5. Which components must remain local / direct calls?

The following components must remain local/direct calls and must never be refactored into A2A:

1. **Fastify Server Routes (`apps/server/src/server.ts`)**:
   - `/health`, `/api/scenario/list`, `/api/lab/run`, `/api/lab/trace/:runId`.
2. **TypeScript Python Bridge (`apps/server/src/pythonBridge.ts`)**:
   - Spawns Python runtime deterministically via `spawnSync` using isolated JSON contracts over `stdin`/`stdout`.
3. **Deterministic Safety Engine (`apps/server/src/safety.ts`)**:
   - Pure TypeScript rule engine evaluating `evaluateSafety(recommendation, state)`.
4. **State Management (`apps/server/src/labState.ts`)**:
   - In-memory trace cache and scenario repository.
5. **Learning Agent Invocation**:
   - Downstream pedagogical reflection invoked strictly after the Safety Engine produces the final simulated outcome.

---

## 6. How will the Safety Engine remain outside A2A authority?

**The TypeScript Safety Engine is completely decoupled from the A2A network and possesses absolute veto authority.**

- **AI Proposals Are Strictly Advisory**: The Supervisor Agent's synthesis is treated only as a *proposed decision* (`trace.proposedDecision`).
- **Deterministic Boundary**: Fastify receives the proposed decision and immediately routes it to `evaluateSafety()` in `apps/server/src/safety.ts`.
- **Inviolable Rules**: If synthetic temperature > 100°C or ramp congestion > 60% with overheat, the Safety Engine triggers `criticalEquipmentAnomaly` or `combinedOperationalRisk` and mandates `STOP_AND_INFORM_SUPERVISOR`.
- **Zero AI Overwrite**: No A2A message or LLM response can modify the return value of `evaluateSafety()`.
- **Trace Accountability**: The execution trace explicitly flags `isOverridden = true` whenever the Safety Engine overrides the agent proposal.

---

## 7. How will A2A failures trigger deterministic fallback?

A2A failures must be detected and handled honestly without ever fabricating an artificial agent response:

1. **Failure Scenarios Handled**:
   - Timeout (specialist agent fails to respond within deadline).
   - Connection/transport failure.
   - Malformed JSON or schema validation failure.
   - Exception raised during agent execution.
2. **Trace Transparency**:
   - When A2A communication succeeds, the trace specifies:
     ```json
     "executionMode": "a2a_adk"
     ```
   - When any A2A component or the Python runtime fails, the trace records:
     ```json
     "executionMode": "deterministic_fallback"
     ```
   - Individual failed events are recorded in `trace.events` with `status: "ERROR"`.
3. **Deterministic Fallback Activation**:
   - The system falls back to rule-based evaluation of current telemetry, ensuring the simulation never halts or crashes for the student, while clearly informing the UI that fallback mode is active.

---

## 8. What dependencies and APIs are actually supported by the installed Google ADK / A2A libraries?

Our environment audit of `agent-runtime/.venv` reveals:

1. **Installed Versions**:
   - `google-adk`: Version **2.9.1** (Google Agent Development Kit 2.0).
   - `a2a-sdk`: Version **1.1.2** (Official Google/Open A2A Protocol SDK).
   - `json-rpc`: Version **1.15.0** (Standard JSON-RPC 2.0 transport).
   - `pydantic`: Version **2.13.5** (Pydantic v2 core).
   - `starlette`: Version **1.6.0** / `httpx`: Version **0.28.1**.

2. **Official Google ADK A2A Modules Available**:
   - `google.adk.a2a.utils.agent_to_a2a.to_a2a`: Wraps ADK agents into standard A2A Starlette/FastAPI applications.
   - `google.adk.agents.remote_a2a_agent.RemoteA2aAgent`: ADK agent that communicates with remote agents over A2A protocol.
   - `google.adk.a2a.executor.a2a_agent_executor.A2aAgentExecutor`: Server-side executor translating between ADK and A2A tasks.
   - `a2a.types.AgentCard`: Standard Agent Card descriptor describing agent skills, endpoints, and capabilities.
   - `a2a.types.Message`, `a2a.types.Part`, `a2a.types.Task`: Core A2A message types.

3. **Implementation Design**:
   - We utilize standard `AgentCard` definitions for `fleet_agent` and `maintenance_agent`.
   - We implement an asynchronous, parallel A2A protocol dispatcher (`agent-runtime/a2a/transport.py`) utilizing JSON-RPC 2.0 structured envelopes with correlation IDs (`experiment_id`).
   - We collect precise event telemetry into `trace["events"]` logging timestamps, durations, transport (`"a2a"`), and request correlation.
