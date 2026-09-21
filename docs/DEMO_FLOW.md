# Demo Flow – OrePulse AI Interactive Lab

1. **Scenario Selection**:
   - The learner selects **COMBINED_OPERATIONAL_RISK** in the OrePulse Learning Lab.
2. **Telemetry Inspection**:
   - The learner reviews synthetic sensors: Haul Truck T1 temperature (110°C), Ramp Congestion (80%), Fleet Availability (40%).
3. **What-If Tuning**:
   - Learner observes baseline values or uses sliders to inject simulated edge cases.
4. **Execution Trigger**:
   - Learner clicks **Run Simulation**.
5. **Supervisor Orchestration**:
   - Google ADK Supervisor Agent receives synthetic telemetry, partitions tasks, and invokes the Fleet and Maintenance agents.
6. **Specialist Agent Analysis**:
   - **Fleet Agent**: Highlights extreme ramp congestion and bottlenecks.
   - **Maintenance Agent**: Flags abnormal engine heat and thermal degradation.
7. **Proposed AI Action**:
   - The multi-agent system aggregates findings into a tentative mitigation proposal.
8. **Authoritative Safety Enforcement**:
   - Deterministic Safety Engine intercepts the proposal, checks critical thresholds (>115°C / >75% congestion), and overrides to **STOP & INFORM SUPERVISOR**.
9. **Pedagogical Explanation**:
   - Learning Agent generates an educational breakdown: "What happened", "Triggering signals", "Safety rationale", and a "Reflection question".
10. **What-If Exploration & Contrast**:
    - Learner lowers ramp congestion from 80% to 15% and reruns.
    - Learner observes the decision transition from **STOP & INFORM SUPERVISOR** to **NORMAL**, reinforcing cause-and-effect learning.
