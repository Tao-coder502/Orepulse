# Agent Runtime Documentation

The **agent-runtime** is a Python package that utilizes **Google ADK 2.0** (`google-adk==1.18.0`) to provide specialized agents for OrePulse AI.

## Structure
```
agent-runtime/
├─ agents/      # Google ADK Agent implementations (Supervisor, Fleet, Maintenance, Learning)
├─ workflows/   # Google ADK workflow graph (ParallelAgent, SequentialAgent)
├─ tools/       # Read-only FunctionTool definitions (simulation_tools, scenario_tools)
├─ schemas/     # Pydantic schemas (findings, recommendations, learning)
├─ runtime/     # AdkRuntimeRunner with session management and fallback
├─ requirements.txt
├─ run_lab_chain.py
├─ run_agent.py
└─ main.py
```

## Quick Start
```bash
cd agent-runtime
python -m venv .venv
.venv\Scripts\activate   # Windows PowerShell
pip install -r requirements.txt
python main.py
```

The `main.py` script executes a smoke-test of the Google ADK 2.0 agents, parallel composition, and multi-agent workflow.
