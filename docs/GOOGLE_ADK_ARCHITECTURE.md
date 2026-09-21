# OrePulse AI — Google ADK 2.0 Architecture

**Framework**: Google ADK 2.0 (`google-adk==1.18.0`)  
**Development Tooling**: Google Agents CLI (`google-agents-cli==1.0.0`) & Installed Skills  
**Development Environment**: Google Antigravity IDE  
**Authoritative Safety Layer**: Deterministic TypeScript Safety Engine  

---

## 1. Executive Summary & Tooling Layers

OrePulse is an educational agentic learning laboratory designed for students in the mining value chain. The architecture enforces strict, non-negotiable separation between the development environment, tooling, agent runtime, and industrial safety governance:

```text
ANTIGRAVITY
Development environment & IDE
        │
        ▼
AGENTS CLI + INSTALLED SKILLS
Scaffolding / workflow / coding / evaluation assistance (google-agents-cli)
        │
        ▼
GOOGLE ADK 2.0
Sole application agent runtime framework (google-adk==1.18.0)
        │
        ▼
OREPULSE AGENTS
Supervisor / Fleet / Maintenance / Learning
        │
        ▼
DETERMINISTIC SAFETY ENGINE
Authoritative TypeScript safety engine (non-LLM)
```

**Core Principle**: AI proposes. Deterministic safety constraints govern the simulated response. Human oversight remains essential.

---

## 2. Google ADK 2.0 Workflow Graph

The agent runtime does not use isolated or ad-hoc LLM calls. It utilizes a genuine **Google ADK 2.0 graph workflow** with sequential and parallel composition:

```text
                    START: Simulation Run Request
                                  │
                                  ▼
                          Scenario Context
                                  │
                                  ▼
                        Supervisor ADK Agent
                      (Task Scoping & Context)
                             /          \
                            /            \
                           ▼              ▼
                Maintenance ADK Agent   Fleet ADK Agent
                 (Equipment Signals)    (Ramp Congestion)
                           \              /
                            \            /
                             ▼          ▼
                        Supervisor Synthesis
                       (Structured Recommendation)
                                  │
                                  ▼
                    Deterministic Safety Engine
                     (TypeScript - Authoritative)
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

---

## 3. Agent Responsibilities & Configurations

All agents inherit from `google.adk.Agent` and use strict Pydantic structured output contracts:

### 1. Supervisor Agent (`agent-runtime/agents/supervisor.py`)
- **ADK Agent Name**: `supervisor_agent`
- **Output Schema**: `SupervisorRecommendation`
- **Tools**: `simulation_state_tool`, `scenario_context_tool`
- **Responsibilities**:
  - Ingests scenario telemetry and baseline objectives.
  - Coordinates specialist analyses.
  - Synthesizes specialist findings into a single proposed simulated recommendation (`NORMAL`, `WARNING`, `ESCALATE`, `STOP_AND_INFORM_SUPERVISOR`).
  - **Constraint**: Must NOT be authoritative over the deterministic Safety Engine.

### 2. Fleet Specialist Agent (`agent-runtime/agents/fleet.py`)
- **ADK Agent Name**: `fleet_agent`
- **Output Schema**: `FleetAgentResponse`
- **Tools**: `fleet_conditions_tool`
- **Responsibilities**:
  - Analyzes simulated haul truck availability and haul ramp congestion.
  - Flags bottlenecking, traffic gridlock, and cycle delays.
  - **Constraint**: Must NOT control real vehicles, dispatch machinery, or issue operational instructions.

### 3. Maintenance Specialist Agent (`agent-runtime/agents/maintenance.py`)
- **ADK Agent Name**: `maintenance_agent`
- **Output Schema**: `MaintenanceAgentResponse`
- **Tools**: `equipment_signals_tool`
- **Responsibilities**:
  - Inspects simulated engine temperatures, vibration alerts, and degradation levels.
  - Identifies thermal ceiling violations (>100°C) and active alarms.
  - **Constraint**: Must NOT control real equipment or prescribe real maintenance procedures.

### 4. Learning Agent (`agent-runtime/agents/learning.py`)
- **ADK Agent Name**: `learning_agent`
- **Output Schema**: `LearningExplanation`
- **Responsibilities**:
  - Runs **strictly after** the final simulated decision has been reached.
  - Formulates concise, observable explanations for students.
  - Explains why the Safety Engine governed the outcome and prompts critical reflection.
  - **Constraint**: Must NOT alter the final decision or expose hidden chain-of-thought.

---

## 4. Purpose-Built Read-Only Tools (`agent-runtime/tools/`)

All agent tools use Google ADK's `FunctionTool` wrapper and are strictly read-only:
- `get_simulation_state`: Retrieves depth, ore grade, equipment state, and ramp status.
- `get_equipment_signals`: Retrieves engine temperatures, active maintenance codes, and alert severities.
- `get_fleet_conditions`: Retrieves haul ramp congestion percentage, fleet availability, and truck statuses.
- `get_scenario_context`: Provides educational description and context for the active scenario.

No tools allow arbitrary code execution, file writes, network access, or real equipment dispatch.

---

## 5. Structured Contracts & Schemas

### Cross-Runtime Interfaces:
- **Agent Finding** (`schemas.findings.AgentFinding`):
  `agent: str`, `status: str`, `relevantSignals: List[str]`, `concerns: List[str]`, `confidence: float`, `summary: str`
- **Supervisor Recommendation** (`schemas.recommendations.SupervisorRecommendation`):
  `decision: str`, `contributingSignals: List[str]`, `agentsConsulted: List[str]`, `explanation: str`, `proposedAction: str`, `parameters: Dict[str, Any]`, `confidence: float`
- **Learning Explanation** (`schemas.learning.LearningExplanation`):
  `whatHappened: str`, `importantSignals: List[str]`, `agentsInvolved: List[str]`, `decisionExplanation: str`, `safetyExplanation: str`, `learningTakeaway: str`, `reflectionQuestion: str`

---

## 6. Deterministic Safety Engine Boundary

The deterministic TypeScript Safety Engine (`apps/server/src/safety.ts`) is the single most critical architectural boundary:
```text
ADK Multi-Agent Analysis
          ↓
Supervisor Recommendation (PROPOSAL ONLY)
          ↓
TypeScript Safety Engine (AUTHORITATIVE DECISION)
          ↓
Final Simulated Decision
```
The Safety Engine evaluates hardcoded deterministic rules:
1. `criticalEquipmentAnomaly`: Overheating (>100°C) or high-severity alarm triggers `STOP_AND_INFORM_SUPERVISOR`.
2. `combinedOperationalRisk`: Elevated ramp congestion (>60%) combined with high heat triggers `STOP_AND_INFORM_SUPERVISOR`.
3. `prohibitedInstruction`: Unjustified halt during nominal steady-state triggers `CONSTRAIN`.
4. `humanSupervisionRequired`: Degraded operations mandate human supervisor sign-off.

**Agents cannot bypass, modify, or override the Safety Engine.**

---

## 7. Controlled Fallback & Offline Reliability

To ensure demo stability without relying on live external cloud model endpoints:
```text
ADK Workflow Execution
        │
        ├── success ──────► Live ADK Execution Trace
        │
        └── failure / offline
                ↓
         AdkRuntimeRunner
                ↓
         Deterministic Controlled Fallback Trace
                ↓
         Safety Engine Verification
                ↓
         Frontend UI
```
- Every fallback trace is tagged with `"executionMode": "deterministic_fallback"`, preventing false claims of live LLM execution while guaranteeing 100% demo availability.

---

## 8. Local Development & Testing Instructions

### Prerequisites:
- Node.js v18+ & npm
- Python 3.10+ with `google-adk==1.18.0` and `pydantic`
- Google Agents CLI (`google-agents-cli`)

### Run All Tests:
```bash
# Python ADK test suite (19 tests)
python -m pytest tests/

# TypeScript server test suite (15 tests)
npm --prefix apps/server test

# Full combined test suite
npm test
```

### Build Everything:
```bash
npm run build
```

### Launch Development Server:
```bash
npm run dev
```
Navigate to `http://localhost:5173` to open the 5-stage educational learning lab.
