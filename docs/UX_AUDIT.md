# OrePulse AI — Minimalist Learner-First UI/UX Audit

**Date**: September 16, 2026  
**Auditor**: Senior Product Designer, UX Engineer & Frontend Architect  
**Evaluation Target**: `apps/web` (React + TypeScript + Tailwind/CSS)  
**Guiding Principle**: *"Complexity belongs in the AI and simulation architecture, not in the learner's interface."*

---

## 1. Executive Summary

OrePulse AI demonstrates a powerful multi-agent architecture (Google ADK 2.0 Supervisor, Fleet, Maintenance, and Learning agents with a deterministic TypeScript Safety Engine). However, the previous UI suffered from **cognitive overload**:
1. **Simultaneous Exposure**: All 11 sections (welcome guide, step tracker, 3 scenario cards, 3 condition cards, 3 sliders, action buttons, progress banner, comparison alert, outcome card, 5-step agent timeline, WHY panel, LEARN panel, callout box, and 5 responsible AI cards) were rendered onto a single monolithic page simultaneously.
2. **Lack of Progressive Disclosure**: A first-time student arriving at the page was immediately greeted by dozens of competing visual elements before even understanding what scenario they were testing.
3. **Cluttered Navigation**: Navigation contained 4 tabs including redundant hackathon briefing items ("Storyboard & Brief") rather than focusing strictly on the educational experience.
4. **Visual Competition**: The Safety Engine, while functionally distinct, visually blended into the timeline as if it were just another LLM agent.
5. **No Guided Journey**: The learner lacked a clear, staged progression (`Scenario → Experiment → Agent Analysis → Outcome → Why? → What-If → Learn`).

---

## 2. Detailed Audit Findings

### A. Navigation & Top-Level Architecture
- **Problem**: The top navbar has 4 tabs (`What-If Lab`, `Agent Architecture`, `Responsible AI`, `Storyboard & Brief`).
- **Issue**: The learner is distracted by presentation briefs and complex diagrams before experiencing the laboratory.
- **Redesign**:
  - Simplify navigation to 3 clean destinations:
    1. **Laboratory** (Primary interactive laboratory experience)
    2. **How It Works** (Learner-friendly explanation of the 3-tier architecture)
    3. **Responsible AI** (5 core ethical pillars tailored to student understanding)
  - Add a persistent, subtle simulation indicator in the header:
    `● EDUCATIONAL SIMULATION | Synthetic data • No real mining operations`

### B. Landing & First-Time Experience
- **Problem**: The page ran a simulation automatically on mount (`useEffect(() => runSimulation(), [])`) and immediately filled the viewport with results, timeline markers, and telemetry alerts.
- **Issue**: The learner never got the chance to choose an experiment or understand the initial baseline before seeing an outcome.
- **Redesign**:
  - Introduce an elegant **Laboratory Landing Screen**:
    - Clean hero heading: `OrePulse AI — Interactive Mining Learning Laboratory`.
    - Purpose statement: *Explore how AI agents analyse simulated mining conditions, collaborate on problems, and make explainable recommendations under human oversight.*
    - Simple experiment selection cards:
      - **Equipment Anomaly** (thermal signals & maintenance alarms)
      - **Combined Operational Risk** (compounding traffic + heat hazards)
      - **Normal Operations** (steady-state baseline)
    - Single, prominent primary action: `[ Start Experiment ]`.

### C. Guided Journey & Progressive Disclosure
- **Problem**: Everything is visible at once. Sliders, timeline, decision, and why panels compete for attention.
- **Redesign**:
  - Implement genuine **Progressive Disclosure**:
    ```text
    Stage 1: SCENARIO SELECTION (Choose experiment)
       ↓
    Stage 2: SIMULATED CONDITIONS (Inspect baseline signals & Start)
       ↓
    Stage 3: AGENT ANALYSIS (Real observable ADK execution)
       ↓
    Stage 4: OUTCOME (Authoritative Safety Decision)
       ↓
    Stage 5: UNDERSTAND WHY & WHAT-IF (Cause-and-effect experimentation)
       ↓
    Stage 6: EDUCATIONAL REFLECTION (Takeaways & thought experiment)
    ```
  - Use a sleek, non-intrusive progress breadcrumb so students always know:
    *Where am I? What is happening? What should I do next?*

### D. Simulated Conditions & Primary Action
- **Problem**: 3 separate live cards plus 3 slider items plus legend bars plus reset buttons all crowded the top grid.
- **Redesign**:
  - Display clean, high-contrast condition cards with large readable metrics and concise status badges (`Safe Operating`, `Elevated Heat`, `Ramp Gridlock`).
  - Clear single primary action: `[ Run Experiment ]`.

### E. Agent Analysis Experience & Safety Engine Distinction
- **Problem**: The Safety Engine was rendered as Step 4 in a 5-step agent timeline, making it appear as if the Safety Engine were an AI agent that "thinks".
- **Redesign**:
  - Graphically isolate the **Deterministic Safety Engine**:
    ```text
    AI Agent Proposals (Supervisor, Fleet, Maintenance)
             ↓
    DETERMINISTIC SAFETY CHECK (Rule-based guardrail)
             ↓
    Simulated System Outcome
    ```
  - Visually emphasize: *"AI proposes. Deterministic safety rules govern the simulated response."*

### F. What-If Experimentation & Before/After Comparison
- **Problem**: After changing a slider, the user had to scan the page to deduce what changed. The comparison banner was a thin text box.
- **Redesign**:
  - A dedicated **Before / After Comparison Card** displayed upon re-running:
    - Side-by-side metric comparison (e.g. Ramp Congestion 80% → 15%, Temperature 110°C → 85°C).
    - Outcome shift: `STOP & INFORM SUPERVISOR` → `NORMAL / ALLOW`.
    - Concise explanation: *"What changed? Reducing ramp congestion cleared haul traffic, allowing cooling airflow and eliminating the emergency halt."*

### G. Responsive Layouts & Accessibility
- **Problem**: Fixed widths and multiple horizontal columns cause horizontal scrolling and cramped cards on 320px–414px mobile screens.
- **Redesign**:
  - Fluid flex and auto-fit grid layouts that collapse seamlessly to a single column on mobile.
  - Large touch targets (min 44px) for all slider handles and buttons.
  - Full keyboard navigation with visible focus rings (`focus-visible: outline 2px #38bdf8`).
  - High WCAG AAA contrast ratios across dark slate background (`#090d16` / `#0f172a`).

---

## 3. Components to Preserve vs Redesign

| Component | Status | Strategy |
| :--- | :--- | :--- |
| **API Integration (`/api/lab/run`)** | **PRESERVE** | Keep contract strictly intact; feeds real ADK backend trace. |
| **Safety Engine Logic (`evaluateSafety`)** | **PRESERVE** | Retain deterministic safety rules and authoritative statuses. |
| **WhatIfLab.tsx** | **REDESIGN** | Refactor into clean, progressive disclosure views with state machine. |
| **Navigation.tsx** | **REDESIGN** | Streamline to 3 tabs (`Laboratory`, `How It Works`, `Responsible AI`) + simulation badge. |
| **ArchitectureView.tsx** | **REDESIGN** | Transform into clean, visual, learner-friendly "How It Works" diagram. |
| **ResponsibleAIView.tsx** | **POLISH** | Minimalist cards covering the 6 mandatory educational safety pillars. |
| **ProjectBriefView.tsx** | **REMOVE FROM NAV** | Content merged cleanly into How It Works / README to eliminate clutter. |
| **Styling (CSS / Tailwind)** | **REDESIGN** | Clean minimalist design tokens in `App.css` and `WhatIfLab.css`. |
