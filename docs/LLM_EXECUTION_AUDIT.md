# OrePulse AI — LLM Execution Audit

**Audit Date:** 2026-09-17
**Scope:** `agent-runtime/agents/`, `agent-runtime/workflows/`, `agent-runtime/tools/`, `agent-runtime/runtime/`, `requirements.txt`

---

## Executive Finding

```
NO_ACTIVE_LLM
```

All four ADK `Agent` objects are instantiated with `model="gemini-2.0-flash"` and are of type
`LlmAgent` (confirmed at runtime), but **no agent ever invokes its `.adk_agent` instance**.
All agent reasoning is implemented as deterministic `if/elif` Python logic that runs entirely
locally, without any network call to a Gemini or Google GenAI endpoint.

The label `executionMode: "a2a_adk"` currently means:

> A2A transport and ADK agent *objects* participated in the workflow orchestration.
> **It does not mean an LLM was called.**

---

## Agent Matrix

| Agent       | ADK Instantiated | `.adk_agent` Invoked | LLM Called | Deterministic Logic | A2A |
|-------------|:----------------:|:--------------------:|:----------:|:-------------------:|:---:|
| Fleet       | YES `LlmAgent`   | NO                   | NO         | YES (congestion/availability thresholds) | YES |
| Maintenance | YES `LlmAgent`   | NO                   | NO         | YES (temperature/alert thresholds)       | YES |
| Supervisor  | YES `LlmAgent`   | NO                   | NO         | YES (status aggregation rules)           | NO  |
| Learning    | YES `LlmAgent`   | NO                   | NO         | YES (status-string matching)             | NO  |

---

## Actual Call Path

```
Fastify POST /api/lab/run
      |
      v
pythonBridge.ts -> spawnSync -> run_lab_chain.py
      |
      v
AdkRuntimeRunner.run_workflow(payload)
      |
      v
OrePulseWorkflow.run(payload)
      |
      +-- supervisor.intake_and_scope()           <- pure Python dict, no LLM
      |
      +-- a2a_transport.dispatch_specialists_parallel()
      |       +-- fleet.handle_a2a_request()
      |       |       +-- fleet.evaluate()        <- if/elif on congestion/availability
      |       +-- maint.handle_a2a_request()
      |               +-- maint.evaluate()        <- if/elif on temperature/alert
      |
      +-- supervisor.synthesize()                 <- if/elif on CRITICAL/DEGRADED statuses
      |
      +-- _evaluate_safety_boundary()             <- deterministic rules (correct by design)
      |
      +-- learning.explain()                      <- if/elif on "STOP"/"WARNING" string
```

Every leaf function is pure Python. No HTTP request is made. No LLM prompt is sent.

### Runtime Proof

```
adk_agent type: LlmAgent                   <- object exists and is the correct type
adk_agent referenced in evaluate(): False  <- it is never called
```

---

## Model Configuration

| Field                    | Value |
|--------------------------|-------|
| Provider                 | Google (google-adk >= 2.9.1, google-genai >= 1.49.0) |
| Model                    | `gemini-2.0-flash` (default string in every `Agent(model=...)`) |
| Configuration location   | Hardcoded default in each `create_*_agent()` factory |
| Authentication mechanism | `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `GOOGLE_GENAI_API_KEY` expected by ADK |
| Agents using model       | Fleet, Maintenance, Supervisor, Learning (all four) |
| Actual invocation        | **NONE** — model string is declared but agent is never called |

---

## Environment Configuration

| Variable               | Expected by ADK | .env file | System Environment |
|------------------------|:---------------:|:---------:|:------------------:|
| `GOOGLE_API_KEY`       | YES             | NOT SET   | NOT SET            |
| `GEMINI_API_KEY`       | YES             | NOT SET   | NOT SET            |
| `GOOGLE_GENAI_API_KEY` | YES             | NOT SET   | NOT SET            |

There is no `.env` file and no `.env.example` in the repository.
Even if `adk_agent` were invoked, it would fail immediately with an authentication error.

---

## Runtime Evidence — Two-Experiment Comparison

### Experiment A — Nominal Conditions
```
temperature=85, congestion=20, fleetAvailability=95
```
| Field              | Result    |
|--------------------|-----------|
| executionMode      | a2a_adk   |
| Fleet status       | NOMINAL   |
| Maintenance status | NOMINAL   |
| Proposed decision  | NORMAL    |
| Final decision     | ALLOW     |

### Experiment B — Critical Conditions
```
temperature=110, congestion=80, fleetAvailability=65
```
| Field              | Result                      |
|--------------------|-----------------------------|
| executionMode      | a2a_adk                     |
| Fleet status       | CRITICAL                    |
| Maintenance status | CRITICAL                    |
| Proposed decision  | STOP_AND_INFORM_SUPERVISOR  |
| Final decision     | STOP_AND_INFORM_SUPERVISOR  |

**Analysis:** Results change correctly between experiments solely because the hardcoded `if/elif`
thresholds in each agent's `evaluate()` method respond to different numeric inputs. The LLM is
not involved at any stage.

---

## Separation of Deterministic vs AI Layers

| Layer                  | Mechanism                       | Correct by Design? |
|------------------------|---------------------------------|--------------------|
| Simulation Engine      | Deterministic TypeScript rules  | YES                |
| Fleet Agent reasoning  | Deterministic if/elif           | NO — should be LLM |
| Maintenance reasoning  | Deterministic if/elif           | NO — should be LLM |
| Supervisor synthesis   | Deterministic if/elif           | NO — should be LLM |
| Learning reflection    | Deterministic if/elif           | NO — should be LLM |
| Safety Engine          | Deterministic TypeScript rules  | YES                |

The Simulation Engine and Safety Engine are correctly deterministic by architectural design.
The four agent reasoning layers are incorrectly deterministic — they should be LLM-powered.

---

## Does A2A Carry LLM-Generated Findings?

**No.**

The A2A transport correctly dispatches structured FleetAnalysisRequest / MaintenanceAnalysisRequest
messages using JSON-RPC 2.0 envelopes and receives typed response objects. However, the *content*
of those responses is populated by deterministic `evaluate()` functions, not an LLM. A2A is
functioning correctly as a structured transport protocol but is currently carrying deterministic
findings.

---

## Is the Current Fallback Functioning?

**Yes — but the distinction is currently academic.**

The `deterministic_fallback` path (triggered by A2ACommunicationError or runner exceptions)
and the primary `a2a_adk` path both ultimately execute deterministic Python logic. The fallback
is a correct and resilient safety net — it just has nothing to fall back *from* yet.

---

## Smallest Change Required to Activate a Real LLM

Only the **Supervisor's `synthesize()` method** needs to change first.

1. Add `GOOGLE_API_KEY=...` to a `.env` file at repository root.
2. In `supervisor.py`, replace the `if/elif` synthesis block (lines 76–143) with an ADK
   `Runner` invocation:
   - Construct a prompt from fleet findings + maintenance findings + telemetry context.
   - Use `google.adk.runners.Runner` with `InMemorySessionService` to execute `self.adk_agent`.
   - Parse the structured `SupervisorRecommendation` from the model's response via `output_schema`.
3. Keep Fleet and Maintenance deterministic initially — their structured outputs are
   clean, reliable inputs to the Supervisor LLM prompt.
4. Keep Safety Engine and Learning Agent deterministic — Safety Engine must never use an LLM;
   Learning Agent's hardcoded explanations are acceptable for the current phase.

This single change in `supervisor.py` (~30 lines) makes the project's core claim —
*LLM-synthesized recommendations governed by a deterministic safety engine* — actually true,
without touching A2A, the Safety Engine, the TypeScript layer, or existing tests.

---

## Risks Introduced by Adding the LLM

| Risk                              | Severity | Mitigation Already in Place |
|-----------------------------------|----------|-----------------------------|
| Non-deterministic outputs         | Medium   | Safety Engine always has final authority |
| LLM hallucinated action names     | Medium   | `output_schema=SupervisorRecommendation` constrains output to Pydantic model |
| API auth failure at runtime       | High     | Fallback activates automatically via `_build_controlled_fallback()` |
| API latency / timeout             | Medium   | `pythonBridge.ts` 15s `timeoutMs` triggers fallback |
| Cost in demo                      | Low      | `gemini-2.0-flash` is lowest-cost Gemini tier |

---

## Recommended Next Step

Wire ADK `Runner` into `SupervisorAgent.synthesize()` only.

- **File:** `agent-runtime/agents/supervisor.py`
- **Method:** `SupervisorAgent.synthesize()` (lines 55–143)
- **Change:** Replace `if/elif` decision block with ADK Runner invocation targeting `gemini-2.0-flash`
- **Add:** `.env` file at repository root with `GOOGLE_API_KEY`

This is a surgical, targeted change. Nothing else changes.

