# Safety Engine Specification — OrePulse AI

**Canonical Component**: `apps/server/src/safety.ts`  
**Role**: Authoritative non-LLM safety boundary for the OrePulse educational simulation.

---

## 1. Guarantees

- **Deterministic**: Given the same `MineState` and structured `AgentRecommendation`, the output is mathematically identical.
- **Independent of LLMs**: The Safety Engine never processes free-form natural language. It evaluates structured properties against deterministic thresholds.
- **Authoritative**: The engine is the sole source of truth for the simulated safety outcome; any rule breach results in `CONSTRAIN` or `STOP_AND_INFORM_SUPERVISOR`.
- **Inviolable**: AI proposals cannot override the Safety Engine.

---

## 2. SafetyStatus Outcomes

| Status | Meaning | Action Taken |
| :--- | :--- | :--- |
| `ALLOW` | Recommendation passes all checks within safe operating limits. | Proposed action permitted in simulation. |
| `CONSTRAIN` | Recommendation permitted only under constrained operating limits. | Action constrained (e.g. speed limited). |
| `STOP_AND_INFORM_SUPERVISOR` | Immediate safety halt triggered. | Operations paused; mandatory human supervisor escalation. |

---

## 3. Advisory vs. Authoritative Thresholds

| Domain | Advisory Threshold (AI Agent) | Authoritative Constraint (Safety Engine) | Why They Differ |
| :--- | :--- | :--- | :--- |
| **Ramp Traffic** | Congestion $\ge$ 70% $\rightarrow$ Advisory throttle | Congestion > 60% with Temp > 100°C $\rightarrow$ Mandated Halt | Specialist identifies traffic bottlenecks early; Safety Engine enforces emergency halt only when compounded by equipment distress. |
| **Thermal Health** | Temp > 100°C $\rightarrow$ Advisory halt for cooldown | Temp > 100°C or High Alert $\rightarrow$ Mandatory Halt | Specialist proposes cooldown schedule; Safety Engine enforces hard equipment boundary. |

---

## 4. Policy Statement

> *Google ADK 2.0 policies structure the agent runtime proposals.*  
> *OrePulse TypeScript Safety Engine governs the simulated mining outcome.*  
> *Human oversight remains essential.*

---
*This document lives at `docs/SAFETY_SPEC.md`.*
