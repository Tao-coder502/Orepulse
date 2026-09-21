# Demo Checklist – Kansanshi AI Hackathon (5-Minute Prep)

## Pre-Demo Checklist
- [ ] Fastify backend running on `http://127.0.0.1:3000` (`npm run dev` in `apps/server`).
- [ ] React frontend running on `http://127.0.0.1:5173` (`npm run dev` in `apps/web`).
- [ ] Python runtime ready (`python agent-runtime/run_lab_chain.py` responds cleanly).
- [ ] Browser window sized to 1080p, zoom at 100%, dev tools closed.
- [ ] Timer set for 4 minutes 30 seconds (leaves 30s buffer).

## Timing Matrix
| Time Window | Segment | Key Action / Screen Focus | Success Indicator |
|---|---|---|---|
| 0:00 - 0:30 | Problem Statement | Presenter camera / intro slide | Mining context clearly articulated |
| 0:30 - 1:00 | OrePulse Value Prop | Main UI Header & Badge visible | "Educational Simulation Lab" badge highlighted |
| 1:00 - 2:15 | Primary Demo Run | Select `COMBINED_OPERATIONAL_RISK` -> Run | STOP & INFORM SUPERVISOR banner triggers |
| 2:15 - 3:15 | What-If Experiment | Move Ramp Congestion slider from 80% to 20% -> Run | Status transforms to NORMAL |
| 3:15 - 4:00 | Architecture & SDK | Show Mermaid Architecture Diagram | Agent vs Safety distinction made clear |
| 4:00 - 4:30 | Responsible AI | Show Responsible AI panel | All 5 Section 9 pillars verified |
| 4:30 - 5:00 | Closing & Q&A | Final slide / Contact info | Finished within 5 minutes |

## Fallback Procedures
- **Network / API drop**: The system runs 100% locally with offline fallback traces.
- **Python worker unavailable**: Fastify pythonBridge automatically activates deterministic offline fallback trace without crashing.
- **Accidental reload**: Local in-memory state restores upon selecting scenario.
