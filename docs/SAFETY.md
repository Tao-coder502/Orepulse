# Deterministic Safety Engine — OrePulse AI

**Location**: `apps/server/src/safety.ts`  
**Classification**: AUTHORITATIVE • DETERMINISTIC • NON-LLM  
**Governance Invariant**: AI proposes. Deterministic safety constraints govern the simulated outcome. Human oversight remains essential.

---

## 1. Safety Principles & Invariants

1. **Non-Negotiable Authority**:
   - The TypeScript Safety Engine is the sole authoritative gatekeeper for simulated mining decisions.
   - Google ADK 2.0 agents produce **advisory proposals** (`SupervisorRecommendation`).
   - The Safety Engine evaluates every proposal against current physical mine telemetry and can strictly override unsafe proposals.

2. **Pure Determinism**:
   - The engine contains zero LLMs, zero stochastic sampling, and zero external network calls.
   - Given identical `MineState` and `AgentRecommendation` inputs, it always produces the exact same `SafetyEvaluation`.

3. **Human-in-the-Loop Escalation**:
   - When critical thresholds are breached (e.g. engine temperature > 100°C or compounding ramp congestion), the system locks into `STOP_AND_INFORM_SUPERVISOR`.
   - Operations cannot resume without explicit human supervisor review in the simulation.

---

## 2. Canonical Deterministic Safety Rules

The engine evaluates actions from `AgentRecommendationSchema` (`adjustDrillSpeed`, `rerouteOre`, `scheduleMaintenance`, `halt`) against the `MineState`:

1. **Critical Simulated Equipment Anomaly (`criticalEquipmentAnomaly`)**:
   - **Condition**: `equipment.temperature > 100°C` OR `equipment.alert.severity === 'high'`.
   - **Enforced Outcome**: `STOP_AND_INFORM_SUPERVISOR`.
   - **Human Oversight**: `true`.
   - **Rationale**: Equipment operating beyond thermal ceiling risks irreversible mechanical breakdown.

2. **Compounding Combined Operational Risk (`combinedOperationalRisk`)**:
   - **Condition**: `ramp.congestionLevel > 60%` AND `equipment.temperature > 100°C`.
   - **Enforced Outcome**: `STOP_AND_INFORM_SUPERVISOR`.
   - **Human Oversight**: `true`.
   - **Rationale**: Thermal distress during haul ramp gridlock prevents safe vehicle retreat, creating compound hazard.

3. **Conflicting Recommendation (`conflictingRecommendation`)**:
   - **Condition**: Action is `adjustDrillSpeed` while equipment status is `failed`.
   - **Enforced Outcome**: `CONSTRAIN`.
   - **Rationale**: Production adjustments are invalid on broken equipment.

4. **Insufficient Information (`insufficientInformation`)**:
   - **Condition**: Required operational parameters are missing from the proposal.
   - **Enforced Outcome**: `CONSTRAIN`.

5. **Prohibited Operational Instruction (`prohibitedInstruction`)**:
   - **Condition**: Proposing `halt` while equipment and fleet are completely nominal (`operational`, temp $\le$ 90°C, congestion < 40%).
   - **Enforced Outcome**: `CONSTRAIN`.
   - **Rationale**: Unjustified shutdowns disrupt steady-state operations without safety justification.

6. **Human Supervision Required (`humanSupervisionRequired`)**:
   - **Condition**: Adjustments requested on `degraded` machinery.
   - **Enforced Outcome**: `ALLOW` with `humanOversightRequired = true`.

---

## 3. Implementation Reference (`apps/server/src/safety.ts`)

```typescript
export enum SafetyStatus {
  ALLOW = 'ALLOW',
  CONSTRAIN = 'CONSTRAIN',
  STOP_AND_INFORM_SUPERVISOR = 'STOP_AND_INFORM_SUPERVISOR'
}

export interface SafetyEvaluation {
  status: SafetyStatus;
  triggeredRules: string[];
  explanation: string;
  humanOversightRequired: boolean;
  educationalNotice: string;
}

export const evaluateSafety = (
  recommendation: AgentRecommendation,
  state: MineState
): SafetyEvaluation => {
  // Evaluates deterministic rules against state
};
```

---

## 4. Educational Disclaimer

> **OrePulse is an educational mining simulation using synthetic data. It does not control real mining equipment, authorize real mining operations, or provide real-world operational instructions.**
