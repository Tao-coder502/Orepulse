"""CLI entrypoint for Fastify server: executes Google ADK 2.0 multi-agent workflow."""

import sys
import json
import argparse
import os

# Ensure agent-runtime is on PYTHONPATH
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from runtime.runner import AdkRuntimeRunner


def main():
    parser = argparse.ArgumentParser(description="Execute Google ADK 2.0 agent runtime workflow")
    parser.add_argument("--agent", required=False, default="supervisor", help="Target agent or orchestrator")
    args = parser.parse_args()

    # Read payload from stdin
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input) if raw_input.strip() else {}
    except Exception as e:
        sys.stderr.write(f"Invalid JSON payload: {e}\n")
        sys.exit(1)

    runner = AdkRuntimeRunner()
    trace = runner.run_workflow(payload)

    # Output verified AgentExecutionTrace JSON to stdout
    json.dump(trace, sys.stdout)


if __name__ == "__main__":
    main()
