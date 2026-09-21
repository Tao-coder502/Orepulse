# OrePulse AI — Comprehensive Learner-Centred UX Audit

**Date**: September 15, 2026  
**Auditor**: Antigravity UX & Educational Design System  
**Target User Persona**: Secondary-school students and junior learners with zero prior knowledge of mining or agentic AI.  
**Guiding Principle**: *"Build for a learner first. Demonstrate the technology second."*

---

## 1. Executive Summary & Current Strengths

### Existing Strengths
1. **Clear Educational Framing**: The application already presents itself as an "Interactive Agentic Mining Learning Laboratory" rather than an industrial control room or chatbot.
2. **Authoritative Safety Engine Visibility**: The distinct separation between AI proposal and deterministic safety rule enforcement is already functionally implemented.
3. **Structured Reflection**: The inclusion of a dedicated LEARN panel with a pedagogical takeaway and reflection question aligns well with educational pedagogy.
4. **Clean Technical Baseline**: Zero TypeScript build errors, zero Vitest test failures (15/15), zero Pytest failures (11/11). Both Vite and Tailwind/CSS bundle reliably.

---

## 2. UX & Cognitive-Load Problems Identified

### A. Information Overload & Lack of Guided Progression
- **Problem**: Upon loading, the learner is confronted with 6 large cards, 5 sensor metrics, 3 sliders, a multi-step timeline, a decision banner, and a 5-pillar governance grid all simultaneously on one long scrolling screen.
- **Learner Impact**: A secondary-school learner feels lost ("Where do I look first? What am I supposed to do?"). It lacks a clear, guided step sequence:
  $$\text{1. Choose Scenario} \longrightarrow \text{2. Set Experiment} \longrightarrow \text{3. Run & Observe Agents} \longrightarrow \text{4. View Outcome} \longrightarrow \text{5. Understand & Reflect}$$

### B. Missing First-Time Learner Welcome & Orientation
- **Problem**: The app immediately drops the learner into parameters without an orientation card answering the 3 foundational questions:
  1. *What is this?*
  2. *What can I do?*
  3. *Is this real mining data?* (Synthetic guarantee).
- **Learner Impact**: Without context, terms like "COMBINED_OPERATIONAL_RISK" look intimidating.

### C. Confusing & Irrelevant Secondary Telemetry
- **Problem**: The telemetry overview displays "Simulated Pit Depth: 120m (BENCH 4B)" and "Simulated Cu Grade: 1.15% (PRIMARY ORE)". Neither pit depth nor copper grade impacts whether the haul truck engine overheats or if the ramp is blocked.
- **Learner Impact**: Distracts from the core cause-and-effect relationship (Ramp Bottleneck $\times$ High Engine Temperature $\rightarrow$ Emergency Safety Intervention).

### D. Static Execution Feedback During Simulation Run
- **Problem**: Clicking "Run Simulation" changes the button label to "Executing Agentic Pipeline..." with a generic spinner for 100ms. The timeline below does not show animated progression through the 5 stages:
  1. *Supervisor Agent coordinating...*
  2. *Fleet Agent analyzing ramp congestion...*
  3. *Maintenance Agent inspecting engine heat...*
  4. *Safety Engine evaluating rules...*
  5. *Learning Agent writing explanation...*
- **Learner Impact**: Misses the key educational opportunity to *see* how multi-agent collaboration actually works.

### E. Redundant / Orphaned Code
- **Problem**: `apps/web/src/components/Header.tsx`, `ScenarioSelector.tsx`, and `LabContext.tsx` exist as dead code, while `WhatIfLab.tsx` is an unwieldy 618-line monolithic component.
- **Learner Impact**: Makes future refinements error-prone and causes inconsistencies.

---

## 3. Responsiveness & Screen-Fitting Problems

| Viewport | Current Behaviour | Defect / Risk |
| :--- | :--- | :--- |
| **Mobile (320px - 375px)** | Top grid collapses into single column, but card padding (`1.5rem`) and large heading fonts (`2rem`) consume excessive vertical space before controls appear. | Learner must scroll 3 full screens before seeing the "Run Simulation" button. |
| **Tablet (768px - 1024px)** | Dual grid (`WHY` & `LEARN`) wraps awkwardly if screen width is near breakpoint. | Asymmetrical card heights. |
| **Desktop (1280px - 1440px)** | The layout is very tall; cards stretch across wide screens leaving excess empty space inside metric rows. | Poor vertical space utilization on 1080p laptop presentation screens. |

---

## 4. Accessibility Audit

1. **Input Labeling**: Sliders have visual `<label>` text but lack explicit `id`, `htmlFor`, and `aria-valuetext` (e.g. "Haul truck temperature, currently 110 degrees Celsius, safe limit is 100").
2. **Color Independence**: The Decision Banner uses colors (Green, Amber, Red), which is good, but the status metrics (`metric-status`) rely heavily on colored text without accompanying icons or screen-reader cues.
3. **Keyboard Accessibility**: Scenario selection buttons are keyboard focusable, but need clearer `:focus-visible` rings with high-contrast outlines for accessible tab navigation.
4. **Button Loading State**: The Run button lacks `aria-busy="true"` during simulation execution.

---

## 5. Feature-Fit Analysis

| Feature | Educational Value | Verdict |
| :--- | :---: | :--- |
| **Scenario Selector** | High | **KEEP & SIMPLIFY**: Use clear friendly titles and 1-sentence explanations. |
| **What-If Sliders (Temp, Congestion, Fleet)** | Essential | **KEEP & ENHANCE**: Add micro-explanations below each control ("How crowded is the haul route?"). |
| **Simulated Pit Depth & Copper Grade** | Zero | **REMOVE**: Irrelevant to the mechanical/fleet safety lesson. |
| **Agent Execution Timeline** | High | **KEEP & ANIMATE**: Show step-by-step progress when running. |
| **Decision Banner (STOP / WARNING / NORMAL)** | Essential | **KEEP & EXPAND**: Explicitly state what the condition means in plain language. |
| **WHY Panel (Decision Transparency)** | High | **KEEP**: Answer "What signals mattered?" and "Why safety intervened". |
| **LEARN Panel (Takeaway & Reflection)** | Essential | **KEEP**: Interactive question with expandable instructor hint. |
| **Responsible AI Panel** | Required by Brief | **KEEP**: Clean, compact 5-pillar grid (Fairness, Safety, Privacy, Transparency, Oversight). |
| **What-If Diff Banner** | High | **KEEP**: Clearly tells the learner: *"You changed Congestion from 80% to 20%, which turned STOP into NORMAL!"* |

---

## 6. Recommended Action Plan

1. **Step-Based Visual Progress Bar**:
   Add a clean 5-step header bar:
   `1. Scenario` $\rightarrow$ `2. Conditions` $\rightarrow$ `3. Agent Analysis` $\rightarrow$ `4. Decision` $\rightarrow$ `5. Learning`
2. **First-Time Welcome Card**:
   Add a collapsible "Welcome to OrePulse" quick-start banner that answers the 3 core questions.
3. **Streamlined What-If Controls**:
   Include helper captions directly beneath each slider:
   - *Equipment Temperature*: "How hot is the haul truck engine?"
   - *Ramp Congestion*: "How crowded is the haul road gradient?"
   - *Fleet Availability*: "How many haul trucks are actively running?"
4. **Simulated Agent Progression during Run**:
   When "Run Simulation" is pressed, sequence through the 5 agents with visual highlight pulses so the learner sees the collaborative relay in real time.
5. **Remove Distracting Metrics**:
   Eliminate raw mining jargon like bench numbers and ore grade; replace with immediate cause-and-effect indicators (e.g. Staging Delay, Overheat Risk).
6. **Mobile & Laptop Viewport Optimization**:
   Refine margins, card paddings, and font clamp scales so the core experiment fits comfortably on a standard 1080p screen without infinite scrolling.

---

## 7. Changes Deliberately NOT Made (Unnecessary Rewrites)
- **NO CSS-in-JS or Tailwind Purge**: The combination of Tailwind utilities and `WhatIfLab.css` works cleanly and builds in 2 seconds. We will not needlessly convert working CSS to pure Tailwind.
- **NO Backend Contract Changes**: The Fastify API (`/api/lab/run`, `/api/scenario/list`, `/api/lab/trace/:runId`) and Python Antigravity agent runtime remain intact.
- **NO Fake Actuation / Real Mine Controls**: Absolutely no real machinery APIs or external cloud databases will be introduced.
