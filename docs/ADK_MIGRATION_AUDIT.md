# OrePulse AI — Google ADK 2.0 Migration Audit

**Document Version**: 1.0.0  
**Date**: September 16, 2026  
**Author**: Antigravity Engineering Team  
**Scope**: Full repository audit and architectural blueprint for migrating OrePulse agent runtime to Google ADK 2.0 (`google-adk==1.18.0`).

---

## 1. Current Architecture

OrePulse is an educational mining simulation designed for secondary-school learners and students, structured as a dual-runtime application:

```text
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vite + React)                │
│  5-Stage Learner UX: Observe -> Analyze -> What-If ->       │
│                      Safety -> Learn                        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API (Fastify + TypeScript)           │
│  - /api/simulation/run                                      │
│  - /api/simulation/reset                                    │
│  - /api/scenario/list & /api/scenario/:id                   │
│  - /api/lab/run & /api/lab/trace/:runId                     │
│  - Simulation Engine (deterministic steps & overrides)       │
│  - Authoritative Safety Engine (deterministic rules)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ stdin / stdout (spawnSync)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              PYTHON AGENT RUNTIME (agent-runtime/)          │
│  - run_lab_chain.py / run_agent.py                          │
│  - Fleet Agent (agents/fleet_agent.py)                      │
│  - Maintenance Agent (agents/maintenance_agent.py)          │
│  - Learning Agent (agents/learning_agent.py)                │
│  - Mock stub google_antigravity/                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Characteristics:
1. **Frontend**: React + TypeScript with Tailwind CSS and custom design tokens (`apps/web/`).
2. **Backend**: Fastify server (`apps/server/src/server.ts`), strictly typed with TypeScript and Zod schemas (`simulation.ts`, `safety.ts`, `types.ts`).
3. **Safety Engine**: Deterministic TypeScript module (`apps/server/src/safety.ts`), completely independent of LLMs, authoritative over all simulation operations.
4. **Agent Bridge**: Node.js `child_process.spawnSync` in `apps/server/src/pythonBridge.ts` invoking Python scripts with JSON payload over `stdin`.

---

## 2. Current Antigravity SDK Usage

A repository-wide search was conducted for `google-antigravity`, `antigravity`, `Antigravity SDK`, `LocalAgentConfig`, `Antigravity Agent`, `Antigravity tools`, `Antigravity sessions`, and `Antigravity policies`.

### Identified References & Dependencies:
1. **Runtime Dependency Specifications**:
   - `requirements.txt` (root): specifies `google-antigravity`, `pydantic`, `pytest`.
   - `agent-runtime/requirements.txt`: specifies `google-antigravity`, `pydantic`.
2. **Agent Implementations**:
   - `agent-runtime/agents/fleet_agent.py`: imports `from google_antigravity import Agent, LocalAgentConfig`.
   - `agent-runtime/agents/maintenance_agent.py`: imports `from google_antigravity import Agent, LocalAgentConfig`.
   - `agent-runtime/agents/learning_agent.py`: imports `from google_antigravity import Agent, LocalAgentConfig`.
   - `agent-runtime/main.py`: imports `from google.antigravity import AntigravityAgent`.
3. **Local Mock Stub**:
   - `google_antigravity/__init__.py`: Local mock package defining stub `LocalAgentConfig` and `Agent` classes to allow imports when the Antigravity SDK was not present.
4. **Documentation**:
   - Multiple documents (`ARCHITECTURE.md`, `DEVELOPMENT.md`, `AGENT_RUNTIME.md`, `DEMO_SCRIPT.md`, `DEMO_FLOW.md`, `AUDIT_REPORT.md`, `POSTER_CONTENT.md`) describe the runtime as powered by the "Antigravity SDK".

### Tooling Layer Separation:
- **Antigravity**: Development environment and IDE. Preserved completely.
- **Google Agents CLI + Skills**: Tooling for scaffolding, evaluation, and development workflows (`google-agents-cli==1.0.0`). Not a runtime dependency.
- **Google ADK 2.0 (`google-adk==1.18.0`)**: The sole runtime framework to be used by the application runtime.
- **Antigravity SDK**: Removed from application runtime dependencies and code imports.

---

## 3. Current Agent Graph / Workflow

In the current code:
- `agent-runtime/run_lab_chain.py` simulates a mock linear trace where `agentsInvoked: ["supervisor", "fleet", "maintenance", "safety", "learning"]`.
- `agent-runtime/run_agent.py` provides isolated single-agent runs for `fleet` and `maintenance`.
- There is currently no active graph orchestrator in Python; `supervisor_agent.py` was previously defined only as an artifact and not wired as an executable multi-agent workflow.

---

## 4. Existing Agent Contracts

The agent contracts are defined with Pydantic in Python and mirrored by TypeScript interfaces in `apps/server/src/types.ts`:

### Fleet Agent (`FleetAgentResponse`):
- `findings`: List of `AgentFinding` (`observation: str`, `severity: str`, `confidence: float`).
- `recommendation`: Optional `AgentRecommendation` (`recommendation: str`, `rationale: str`).
- `agent_id`: `str = "fleet_agent"`.
- `version`: `str = "0.1.0"`.

### Maintenance Agent (`MaintenanceAgentResponse`):
- `findings`: List of `MaintenanceFinding` (`observation: str`, `severity: str`, `confidence: float`).
- `recommendation`: Optional `MaintenanceRecommendation` (`recommendation: str`, `rationale: str`).
- `agent_id`: `str = "maintenance_agent"`.
- `version`: `str = "0.1.0"`.

### Learning Agent (`LearningExplanation`):
- `whatHappened`: `str`
- `importantSignals`: `str`
- `agentsInvolved`: `str`
- `decisionExplanation`: `str`
- `safetyExplanation`: `str`
- `learningTakeaway`: `str`
- `reflectionQuestion`: `str`

---

## 5. Existing Tools

- The `agent-runtime/tools/` directory is currently **empty**.
- Existing agents received full telemetry dumped as a JSON string in their prompt without calling external or specialized tools.
- Requirement for ADK 2.0: Provide clean, purpose-built read-only tools:
  - `get_simulation_state`
  - `get_equipment_signals`
  - `get_fleet_conditions`
  - `get_scenario_context`

---

## 6. Existing Schemas

- Python: Inline Pydantic schemas in each agent file (`fleet_agent.py`, `maintenance_agent.py`, `learning_agent.py`).
- TypeScript: Zod schemas and TypeScript interfaces in `apps/server/src/simulation.ts`, `safety.ts`, and `types.ts`.
- `agent-runtime/schemas/` directory is currently empty.
- Target structure: Dedicated schema definitions in `agent-runtime/schemas/` (`findings.py`, `recommendations.py`, `learning.py`).

---

## 7. Existing TypeScript / Python Boundary

- Fastify server invokes `invokePythonAgent` in `apps/server/src/pythonBridge.ts`.
- `invokePythonAgent`:
  - Spawns `python agent-runtime/run_lab_chain.py --agent <agentName>`.
  - Passes simulation/telemetry payload over `stdin`.
  - Collects JSON from `stdout`.
  - If process fails or times out (5000ms), returns a deterministic fallback trace (`AgentExecutionTrace`).
- The output JSON must conform to `AgentExecutionTrace` in `apps/server/src/types.ts`.

---

## 8. Components That Must Remain Untouched

The following components are strictly out of scope for changes:
1. **Simulation Engine** (`apps/server/src/simulation.ts`): All deterministic state progression, scenario definitions (`NORMAL_OPERATIONS`, `EQUIPMENT_ANOMALY`, `COMBINED_OPERATIONAL_RISK`), and telemetry generation.
2. **Deterministic Safety Engine** (`apps/server/src/safety.ts`): The rule evaluator (`evaluateSafety`), `SafetyStatus`, and safety thresholds. It remains authoritative and non-LLM.
3. **Fastify Server Routes & Endpoints** (`apps/server/src/server.ts`): Public API contracts (`/api/simulation/*`, `/api/scenario/*`, `/api/lab/*`).
4. **Web Frontend UX & Components** (`apps/web/`): All 5-stage educational navigation, tabs, cards, charts, What-If controls, and styling.

---

## 9. Proposed Google ADK 2.0 Architecture

The target architecture replaces the Antigravity SDK with Google ADK 2.0 (`google-adk==1.18.0`):

```text
                    START: Lab Run Request
                              │
                              ▼
                      Scenario Context
                              │
                              ▼
                    Supervisor ADK Agent
                         /          \
                        /            \
                       ▼              ▼
            Maintenance ADK Agent   Fleet ADK Agent
            (reads equipment)      (reads fleet)
                       \              /
                        \            /
                         ▼          ▼
                    Supervisor Synthesis
                   (ADK Recommendation)
                              │
                              ▼
                Deterministic Safety Engine
                (TypeScript - AUTHORITATIVE)
                          /          \
                         /            \
                      ALLOW      STOP_AND_INFORM
                         \            /
                          ▼          ▼
                        Final Decision
                              │
                              ▼
                     Learning ADK Agent
                     (Structured Reflection)
                              │
                              ▼
                             END
```

### Structural Layout:
```text
agent-runtime/
├── agents/
│   ├── supervisor.py      # ADK Agent for task decomposition & synthesis
│   ├── fleet.py           # ADK Agent for fleet telemetry analysis
│   ├── maintenance.py     # ADK Agent for equipment telemetry analysis
│   └── learning.py        # ADK Agent for post-decision educational takeaways
├── workflows/
│   └── ore_pulse_workflow.py  # Orchestrates ParallelAgent/SequentialAgent or Runner
├── tools/
│   ├── simulation_tools.py    # Narrow read-only tools using FunctionTool
│   └── scenario_tools.py      # Scenario context lookup
├── schemas/
│   ├── findings.py        # Pydantic AgentFinding, FleetFinding, MaintenanceFinding
│   ├── recommendations.py # Pydantic SupervisorRecommendation
│   └── learning.py        # Pydantic LearningExplanation
├── runtime/
│   └── runner.py          # ADK Runner execution, session management & fallback
├── run_lab_chain.py       # Main CLI bridge executed by Fastify
├── requirements.txt       # google-adk==1.18.0, google-genai, pydantic
└── README.md
```

---

## 10. Migration Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **API Key Absence in Local/CI** | Agents fail without `GEMINI_API_KEY` | Implement robust, deterministic fallback in `runner.py` that activates automatically when offline or unauthenticated, producing valid structured outputs. |
| **Pydantic / Schema Mismatch** | Fastify fails to deserialize Python output | Strictly validate all outputs against `AgentExecutionTrace` schema before stdout serialization. |
| **Subprocess Execution Latency** | Subprocess exceeds default 5000ms timeout | Optimize ADK agent graph initialization; support cached in-memory agent instances and efficient JSON serialization. |
| **Accidental Safety Logic Ingestion** | LLM attempts to make authoritative safety decisions | Enforce strict architectural boundary: ADK agents propose recommendations; TypeScript `evaluateSafety` independently validates and produces the final decision. |

---

## 11. Validation Strategy

1. **Unit Tests (`pytest`)**:
   - Test each agent (`supervisor`, `fleet`, `maintenance`, `learning`) produces valid structured Pydantic outputs.
   - Test rejection of malformed outputs and handling of execution errors.
2. **Workflow Tests**:
   - Verify execution graph order: Supervisor -> Fleet + Maintenance -> Supervisor Synthesis -> Safety -> Learning.
   - Verify combined operational risk scenario triggers specialist evaluations.
3. **Safety Engine Proof**:
   - Verify that an adversarial agent recommendation (e.g. proposing `halt` during normal operations, or proposing `adjustDrillSpeed` during equipment failure) is constrained or halted by the Safety Engine.
4. **Integration Tests (`vitest` / Fastify)**:
   - Run `npm test` across all server test suites (`apps/server/test/lab.test.ts`, `server.test.ts`, `safety.test.ts`).
5. **End-to-End Run**:
   - Trigger `/api/lab/run` with `COMBINED_OPERATIONAL_RISK`.
   - Verify the generated trace contains genuine ADK agent results, safety evaluation, and learning explanation.
6. **Cleanliness Verification**:
   - Verify complete removal of `google-antigravity` from code, dependencies, and file system.
