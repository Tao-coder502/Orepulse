# OrePulse AI — ADK Architecture, Safety & Documentation Consistency Audit

**Document Version**: 1.0.0  
**Audit Date**: September 16, 2026  
**Scope**: Full codebase audit covering `agent-runtime/`, `apps/server/`, `apps/web/`, `tests/`, and `docs/`.  
**Governing Principle**:
> *Google ADK 2.0 is the sole application agent runtime. TypeScript owns the deterministic simulation and authoritative Safety Engine. AI agents analyze and propose; the Safety Engine governs the simulated outcome; the Learning Agent explains the final outcome to the learner. OrePulse remains an educational mining simulation, not a real mining control, dispatch, maintenance, or safety system.*

---

## 1. What Currently Exists

### A. Python Agent Runtime (`agent-runtime/`)
- **Agent Definitions**:
  - `agents/fleet.py`: Primary Google ADK 2.0 `FleetAgent` utilizing `fleet_conditions_tool` and `FleetAgentResponse` schema.
  - `agents/fleet_agent.py`: Duplicate compatibility alias file re-exporting symbols from `agents/fleet.py`.
  - `agents/maintenance.py`: Primary Google ADK 2.0 `MaintenanceAgent` utilizing `equipment_signals_tool` and `MaintenanceAgentResponse` schema.
  - `agents/maintenance_agent.py`: Duplicate compatibility alias file re-exporting symbols from `agents/maintenance.py`.
  - `agents/supervisor.py`: Primary Google ADK 2.0 `SupervisorAgent` utilizing `simulation_state_tool`, `scenario_context_tool`, and `SupervisorRecommendation` schema.
  - `agents/supervisor_agent.py`: Duplicate compatibility alias file re-exporting symbols from `agents/supervisor.py`.
  - `agents/learning.py`: Primary Google ADK 2.0 `LearningAgent` generating structured `LearningExplanation` schemas post-decision.
  - `agents/learning_agent.py`: Duplicate compatibility alias file re-exporting symbols from `agents/learning.py`.
- **ADK Workflow & Graph**:
  - `workflows/ore_pulse_workflow.py`: ADK orchestration graph using `ParallelAgent` (`build_adk_specialist_parallel_agent`) for Fleet and Maintenance specialists, sequential supervisor synthesis, an internal Python safety evaluation helper (`_evaluate_safety_boundary`), and the Learning Agent.
- **Tools**:
  - `tools/simulation_tools.py`: Read-only `FunctionTool` definitions: `simulation_state_tool` (`get_simulation_state`), `equipment_signals_tool` (`get_equipment_signals`), and `fleet_conditions_tool` (`get_fleet_conditions`).
  - `tools/scenario_tools.py`: Read-only `FunctionTool` definition: `scenario_context_tool` (`get_scenario_context`).
- **Schemas**:
  - `schemas/findings.py`: Pydantic models `AgentFinding`, `AgentRecommendation`, `FleetAgentResponse`, `MaintenanceAgentResponse`.
  - `schemas/recommendations.py`: Pydantic model `SupervisorRecommendation`.
  - `schemas/learning.py`: Pydantic model `LearningExplanation`.
- **Runtime Execution & CLI**:
  - `runtime/runner.py`: `AdkRuntimeRunner` with `run_workflow` and fallback trace generator `_build_controlled_fallback`.
  - `run_lab_chain.py`: CLI bridge invoking `AdkRuntimeRunner().run_workflow(payload)` via JSON over stdin/stdout.
  - `run_agent.py`: CLI bridge for executing individual specialist agents.
  - `main.py`: Smoke-test script initializing ADK agents and executing a sample workflow.
- **Dependencies**:
  - `agent-runtime/requirements.txt`: `google-adk==1.18.0`, `google-genai==1.49.0`, `pydantic`.
  - `requirements.txt` (root): `google-adk==1.18.0`, `google-genai==1.49.0`, `pydantic`, `pytest`.

### B. TypeScript Simulation & Server (`apps/server/`)
- **Simulation Engine**:
  - `src/simulation.ts`: Pure, deterministic simulation functions (`createScenario`, `updateSimulationState`, `resetScenario`, `runSimulation`) and Zod schemas (`MineStateSchema`, `SimulationScenarioSchema`, `TelemetrySchema`).
- **Safety Engine**:
  - `src/safety.ts`: Pure, deterministic TypeScript Safety Engine (`evaluateSafety`), `SafetyStatus` enum (`ALLOW`, `CONSTRAIN`, `STOP_AND_INFORM_SUPERVISOR`), and `SafetyEvaluationSchema`.
- **API & Bridge**:
  - `src/server.ts`: Fastify REST API exposing `/api/simulation/run`, `/api/simulation/reset`, `/api/scenario/list`, `/api/scenario/:id`, `/api/lab/run`, `/api/lab/trace/:runId`.
  - `src/pythonBridge.ts`: Subprocess runner calling Python `run_lab_chain.py` with deterministic fallback.
  - `src/labState.ts`: In-memory trace store.
  - `src/types.ts`: Canonical TypeScript type contracts.

### C. Web Frontend (`apps/web/`)
- `src/WhatIfLab.tsx`: Interactive learner dashboard with scenario selector, What-If parameter sliders, animated agent sequence, and pedagogical explanation panels.
- `src/components/`:
  - `ArchitectureView.tsx`: Multi-agent tier diagram and safety boundaries.
  - `ResponsibleAIView.tsx`: Kansanshi Section 9 Responsible AI pillar mapping.
  - `ProjectBriefView.tsx`: Challenge brief and problem statement.
  - `Header.tsx`, `Navigation.tsx`, `LabContext.tsx`, `ScenarioSelector.tsx`.

---

## 2. What Is Inconsistent

1. **Safety Engine Authority & Execution Bypass**:
   - `apps/server/src/safety.ts` implements the authoritative TypeScript deterministic Safety Engine, and is tested in `apps/server/test/safety.test.ts`.
   - **Crucial Bug / Inconsistency**: `apps/server/src/server.ts` does NOT import or execute `evaluateSafety` from `src/safety.ts`. Instead, `server.ts` passes telemetry to Python via `pythonBridge.ts`, which runs `run_lab_chain.py`.
   - In Python, `ore_pulse_workflow.py` duplicates safety logic in `_evaluate_safety_boundary`.
   - Thus, the authoritative TypeScript Safety Engine is completely bypassed during live API execution (`POST /api/lab/run`), violating the core architecture requirement:
     *TypeScript Safety Engine must be the authoritative non-LLM governance gatekeeper.*

2. **Client-Side Simulation & Decision Duplication**:
   - In `apps/web/src/WhatIfLab.tsx` (lines 163–225), the client calls `/api/lab/run`, but then **discards** the returned `trace.finalDecision`, `trace.safetyEvaluation`, and `trace.learningExplanation`.
   - Instead, `WhatIfLab.tsx` re-evaluates the outcome using hardcoded local client-side checks (`if (temperature >= 115 || congestion >= 75)`), generating synthetic text client-side.
   - This prevents the UI from reflecting the true agent trace, execution mode, and server Safety Engine decisions.

3. **Fake Delay Timeline vs. Real Structured Trace**:
   - `WhatIfLab.tsx` employs artificial `setTimeout` chains (250ms, 500ms, 750ms, 1000ms) with hardcoded strings rather than rendering the actual execution stages and events returned in the structured trace from the backend.

4. **Safety Threshold Discrepancies**:
   - `apps/server/src/safety.ts`: Checks `temperature > 100°C` and `alert.severity === 'high'`. Lacks the explicit compounding rule for combined risk (`ramp.congestionLevel > 60%` AND `temperature > 100°C`).
   - `apps/web/src/WhatIfLab.tsx`: Checked `temperature >= 115°C` and `congestion >= 75%`.
   - `ArchitectureView.tsx`: Documented `>115°C overheat, >75% gridlock`.
   - `agent-runtime/agents/fleet.py`: Uses advisory threshold `congestion >= 70%` for critical, `> 40%` for degraded.
   - `agent-runtime/agents/maintenance.py`: Uses advisory threshold `temperature > 100°C` for critical, `> 90°C` for degraded.
   - *Fix needed*: Explicitly distinguish advisory thresholds from authoritative Safety Engine constraints, and centralize the authoritative constraints in `apps/server/src/safety.ts`.

5. **Outdated Safety Documentation**:
   - `docs/SAFETY.md`: Contains an obsolete sketch with mining actions (`excavate`, `drill`, `transport`) and mentions overriding safety via a "privileged admin endpoint". This contradicts the immutable safety contract.

---

## 3. Duplicated Agent Files

The repository contains duplicate alias files in `agent-runtime/agents/`:
- `fleet_agent.py` re-exports `fleet.py`
- `maintenance_agent.py` re-exports `maintenance.py`
- `supervisor_agent.py` re-exports `supervisor.py`
- `learning_agent.py` re-exports `learning.py`

**Consolidation Strategy**:
- Consolidate all canonical implementations into `fleet.py`, `maintenance.py`, `supervisor.py`, and `learning.py`.
- Update any test or runner imports referencing `*_agent.py` to point to the canonical filenames.
- Safely remove the duplicate alias files and verify test integrity.

---

## 4. Where the Safety Engine Actually Lives

- **Intended Location**: `apps/server/src/safety.ts`.
- **Actual Current Locations (Fragmented)**:
  1. `apps/server/src/safety.ts`: Deterministic implementation, but uncalled by `server.ts`.
  2. `agent-runtime/workflows/ore_pulse_workflow.py`: `_evaluate_safety_boundary` duplicates rules in Python.
  3. `agent-runtime/runtime/runner.py`: `_build_controlled_fallback` duplicates rules in Python.
  4. `apps/server/src/pythonBridge.ts`: Fallback trace hardcodes `STOP_AND_INFORM_SUPERVISOR`.
  5. `apps/web/src/WhatIfLab.tsx`: Duplicates threshold checks client-side.
- **Remediation**: Establish `apps/server/src/safety.ts` as the **single authoritative source of truth**. Fastify `server.ts` will directly invoke `evaluateSafety()` on the proposal before finalizing state changes.

---

## 5. Where Thresholds Are Defined

| Level | Component | Threshold Values | Purpose / Scope |
| :--- | :--- | :--- | :--- |
| **Authoritative Constraint** | `apps/server/src/safety.ts` | • Temp > 100°C or `severity: high`<br>• Congestion > 60% AND Temp > 100°C<br>• Prohibited unprovoked halt (Temp $\le$ 90°C, Congestion < 40%) | Hard safety gatekeeper; non-LLM; overrides AI proposals. Mandates `STOP_AND_INFORM_SUPERVISOR`. |
| **Advisory Domain Analysis** | `agent-runtime/agents/fleet.py` | • Congestion $\ge$ 70% $\rightarrow$ `CRITICAL`<br>• Congestion > 40% or Avail < 75% $\rightarrow$ `DEGRADED`<br>• Otherwise $\rightarrow$ `NOMINAL` | Domain-specific analytical threshold used to formulate haulage optimization advice. |
| **Advisory Domain Analysis** | `agent-runtime/agents/maintenance.py` | • Temp > 100°C or `severity: high` $\rightarrow$ `CRITICAL`<br>• Temp > 90°C or `severity: med/low` $\rightarrow$ `DEGRADED`<br>• Otherwise $\rightarrow$ `NOMINAL` | Domain-specific analytical threshold used to detect mechanical thermal stress. |
| **Synthesis Proposal** | `agent-runtime/agents/supervisor.py` | • Both Critical $\rightarrow$ Propose `STOP_AND_INFORM_SUPERVISOR`<br>• Maint Critical $\rightarrow$ Propose `STOP_AND_INFORM_SUPERVISOR`<br>• Fleet Critical $\rightarrow$ Propose `WARNING` (`rerouteOre`)<br>• Degraded $\rightarrow$ Propose `WARNING`<br>• Otherwise $\rightarrow$ Propose `NORMAL` | Aggregates specialist inputs into a structured mitigation proposal. |
| **Synthetic Scenarios** | `apps/server/src/simulation.ts` | • `NORMAL_OPERATIONS`: Temp 70°C, Congestion 10%, Fleet 100%<br>• `EQUIPMENT_ANOMALY`: Temp 120°C, Congestion 10%, Fleet 100%<br>• `COMBINED_OPERATIONAL_RISK`: Temp 110°C, Congestion 80%, Fleet 40% | Baseline educational environment states. |

---

## 6. Authority Over the Final Decision

- **Current Status**:
  - In theory and system prompts, agents are advisory.
  - In practice, because `apps/server/src/server.ts` accepted the Python workflow output directly without running `apps/server/src/safety.ts`, the Python orchestrator was effectively setting the final decision.
- **Architectural Requirement**:
  - The Supervisor Agent **MUST NOT** have final authority.
  - The Fleet and Maintenance Agents **MUST NOT** have final authority.
  - The Learning Agent **MUST NOT** modify or contest the decision.
  - The TypeScript Safety Engine in `apps/server/src/safety.ts` **MUST** be the sole authoritative decider.

---

## 7. Documentation Capability Claims

- **Predictive Maintenance Claims**:
  - `ArchitectureView.tsx` line 72: *"Flags mechanical stress and estimates component breakdown risk"*.
  - Several mentions previously implied "predictive failure detection".
  - *Correction*: OrePulse evaluates current synthetic telemetry against threshold bands. Replace with: *"Detects simulated thermal anomalies and evaluates their severity."*
- **Real Mining Claims**:
  - Some docs used phrases like *"real dispatch optimization"* or *"operational safety decisions"*.
  - *Correction*: Consistently frame all outputs as *"simulated dispatch-response recommendations"*, *"educational scenario exploration"*, and *"synthetic telemetry analysis"*.

---

## 8. UI Terminology & Real Mining Implications

- `WhatIfLab.tsx` and `ArchitectureView.tsx` must clearly state that all telemetry and actions are synthetic and educational.
- Ensure the disclaimer:
  > *"OrePulse is an educational mining simulation using synthetic data. It does not control real mining equipment, authorize real mining operations, or provide real-world operational instructions."*
  is prominent across the UI and documentation.

---

## 9. Distinguishability of ADK vs. Deterministic Fallback

- **Current State**:
  - `agent-runtime/runtime/runner.py` outputs `executionMode: "live_adk"` or `executionMode: "controlled_fallback"`.
  - `apps/server/src/pythonBridge.ts` catches process failure and returns a static trace, but does not explicitly set `executionMode: "deterministic_fallback"`.
  - `apps/server/src/types.ts` omits `executionMode` in `AgentExecutionTrace`.
  - `apps/web/src/WhatIfLab.tsx` does not display the execution mode, leaving the user unaware of whether live ADK or deterministic fallback ran.
- **Remediation**:
  - Add `executionMode: 'adk' | 'deterministic_fallback'` to `AgentExecutionTrace` in `types.ts`.
  - Ensure both Python runtime and TypeScript bridge populate `executionMode`.
  - Add a visible badge in the frontend UI (`WhatIfLab.tsx`) showing whether the run executed via **Live Google ADK 2.0** or **Deterministic Fallback**.

---

## 10. Remaining Antigravity SDK Runtime References

- `apps/server/src/safety.ts` line 33: `* SafetyEvaluation. No LLM or Antigravity agent is consulted; the engine is` $\rightarrow$ replace with `No LLM or external agent is consulted`.
- `docs/ADK_MIGRATION_AUDIT.md`: Historical references are retained for audit trail.
- Confirm zero runtime imports of `google-antigravity` or `LocalAgentConfig` in any `.py` or `.ts` source files.

---

## Audit Conclusion & Next Actions

The codebase is fundamentally strong, but suffers from **architectural bypass and client-side decoupling**:
1. Wire `apps/server/src/safety.ts` directly into `apps/server/src/server.ts` so all proposals are authoritatively evaluated in TypeScript.
2. Update `WhatIfLab.tsx` to consume the real backend trace (`data.trace`), displaying true server decisions, learning explanations, and the `executionMode` badge without client-side duplication or fake timers.
3. Consolidate duplicate agent files (`*_agent.py` into canonical `*.py`).
4. Align threshold documentation and centralize safety constraints in `safety.ts`.
5. Update tests to verify Safety Engine authority over adversarial agent proposals and What-If scenario transitions.
