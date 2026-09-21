# Development Guide

## Prerequisites
- **Node.js**: v20 LTS (recommended)
- **Python**: >=3.10
- **Git** (optional, for version control)

## Repository Layout
```
Orepulse/
├─ apps/
│   ├─ web/          # React + Vite frontend
│   └─ server/       # Fastify backend (TypeScript)
├─ docs/            # Architecture, safety, dev guides
├─ agent-runtime/   # Python Google ADK 2.0 agent runtime
└─ README.md
```

## Setup Steps
1. **Clone the repo** (if not already local)
   ```bash
   git clone <repo-url>
   cd Orepulse
   ```
2. **Install Node dependencies** for both runtimes:
   ```bash
   cd apps/web && npm install && cd ../../apps/server && npm install
   ```
3. **Run TypeScript type‑check**
   ```bash
   npx tsc --noEmit   # from each app directory
   ```
4. **Build the projects**
   ```bash
   cd apps/web && npm run build   # Vite build
   cd ../../apps/server && npm run build   # Fastify build (tsc)
   ```
5. **Python environment**
   ```bash
   cd agent-runtime
   python -m venv .venv
   .venv\Scripts\activate   # Windows PowerShell
   pip install -r requirements.txt
   python main.py   # sanity check
   ```

## Testing
- After building, start the Fastify server (`npm run dev` in `apps/server`) and the Vite dev server (`npm run dev` in `apps/web`).
- Verify the Python agents initialize using Google ADK 2.0 and pass the smoke test (`python agent-runtime/main.py`).

## Next Steps
- Implement simulation logic, safety engine details, and agent behaviors.
- Add unit and integration tests.
