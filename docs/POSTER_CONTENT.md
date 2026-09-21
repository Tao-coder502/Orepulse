# OrePulse AI – Kansanshi AI Hackathon 2026 Poster

## TITLE
**OrePulse AI**

## SUBTITLE
**Interactive Agentic Mining Learning Laboratory**

---

### PROBLEM
Learners often encounter AI as an abstract technology rather than understanding how AI could participate in real-world mining workflows. Real mining operations are too dangerous and costly for novices to test what-if decisions or observe AI agent interactions.

---

### SOLUTION
A safe educational simulation laboratory where learners observe multiple AI agents analyze synthetic mining scenarios, collaborate in real time, encounter deterministic safety constraints, and explain their decisions.

---

### INNOVATION & ARCHITECTURE
- **Google ADK 2.0-Powered Agent Runtime**: Specialized agents (Supervisor, Fleet, Maintenance, Learning) running autonomously.
- **Multi-Agent Collaboration**: Supervisor decomposes telemetry and aggregates specialist findings.
- **Synthetic Mining Simulation**: Realistic parameters (haul truck engine temperature, haul ramp congestion %, fleet availability, ore grade).
- **Authoritative Deterministic Safety Layer**: Fastify/TypeScript Safety Engine that evaluates AI proposals against hard mechanical & human safety thresholds.
- **Learner-Controlled What-If Experimentation**: Interactive parameter tuning allowing learners to test edge cases.
- **Explainable Decisions**: Dedicated Learning Agent breaking down what happened, why safety intervened, and pedagogical takeaways.
- **Human Oversight**: Mandatory "Stop and Inform a Supervisor" decision states whenever risk is elevated.

---

### RESPONSIBLE AI (Kansanshi Section 9 Compliance)
1. **Fairness**: Objective, bias-free synthetic thresholds.
2. **Safety**: Educational sandbox only; agents never issue commands to real physical mining equipment.
3. **Privacy**: 100% synthetic, anonymized telemetry (trucks T1, T2; simulated pit depth & grades).
4. **Transparency**: Clear, interpretable execution traces and WHY explanation panels.
5. **Human Oversight**: Explicit `STOP_AND_INFORM_SUPERVISOR` fail-safe stopping points.
