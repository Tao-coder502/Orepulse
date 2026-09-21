# Agent Architecture Diagram — OrePulse AI

**System Classification**: EDUCATIONAL SIMULATION • SYNTHETIC DATA  
**Agent Runtime**: Google ADK 2.0 (`google-adk==1.18.0`)  
**Safety Engine**: AUTHORITATIVE • DETERMINISTIC • NON-LLM  

---

## 1. End-to-End Workflow & Governance Graph

```mermaid
flowchart TD
    A[Simulated Mine Telemetry<br/><i>Synthetic Zambian Haulage Data</i>]
        --> B[Supervisor Agent<br/><i>Stage A: Intake &amp; Scoping</i>]

    B --> C[Fleet Agent<br/><i>ADK Parallel Specialist</i>]
    B --> D[Maintenance Agent<br/><i>ADK Parallel Specialist</i>]

    C --> E[Supervisor Agent<br/><i>Stage B: Synthesis</i>]
    D --> E

    E --> F[SupervisorRecommendation<br/><i>Advisory Proposal</i>]

    F --> G[Deterministic Safety Engine<br/><b>AUTHORITATIVE • NON-LLM</b>]
    A --> G

    G --> H{Safety Evaluation}

    H -->|Simulated response permitted| I[Final Simulated Outcome<br/><i>ALLOW / CONSTRAIN</i>]
    H -->|Constraint triggered| J[STOP + INFORM SUPERVISOR<br/><i>Immediate Fail-Safe Halt</i>]

    I --> K[Learning Agent<br/><i>Post-Decision Reflection</i>]
    J --> K

    K --> L[Student Explanation<br/>Reflection Question]

    J -. Human oversight required .-> M[Human Supervisor<br/><b>Mandatory Review</b>]

    classDef sim fill:#0f172a,stroke:#a855f7,stroke-width:2px,color:#f8fafc;
    classDef ai fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef safety fill:#450a0a,stroke:#ef4444,stroke-width:2px,color:#fef2f2;
    classDef human fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ecfdf5;

    class A sim;
    class B,C,D,E,F,K,L ai;
    class G,H,I,J safety;
    class M human;
```

---

## 2. Component Authority & Responsibility Matrix

| Component | Authority | Responsibility | Runtime Layer |
| :--- | :--- | :--- | :--- |
| **Fleet Agent** | Advisory | Analyze simulated fleet availability, haul road flow, and ramp congestion. | Python / Google ADK 2.0 |
| **Maintenance Agent** | Advisory | Detect simulated thermal anomalies and evaluate mechanical stress severity. | Python / Google ADK 2.0 |
| **Supervisor Agent** | Advisory | Stage A: Intake & Scoping. Stage B: Multi-signal synthesis into a structured proposal. | Python / Google ADK 2.0 |
| **Safety Engine** | **Authoritative** | Apply deterministic simulated safety constraints; overrule AI proposals when safety bounds breach. | TypeScript (`apps/server/src/safety.ts`) |
| **Learning Agent** | Pedagogical | Explain the final simulated outcome post-decision and encourage student reflection. | Python / Google ADK 2.0 |
| **Human Supervisor** | **Human Oversight** | Review escalated simulated situations requiring human operational intervention. | Human in the Loop |

---

## 3. Core Architectural Principle

> **Observe → Analyze → Collaborate → Propose → Govern → Explain → Reflect.**
> 
> *The AI agents provide analysis and proposals.*  
> *The deterministic Safety Engine governs the simulated outcome.*  
> *Human oversight remains essential.*  
> *The learner remains the person making sense of the experiment.*
