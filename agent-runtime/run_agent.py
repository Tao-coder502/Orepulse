"""CLI entrypoint to run individual Google ADK 2.0 specialist agents."""

import sys
import json
import argparse
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from agents.fleet import run_fleet_agent
from agents.maintenance import run_maintenance_agent
from agents.supervisor import run_supervisor_agent
from agents.learning import run_learning_agent


def main():
    parser = argparse.ArgumentParser(description="Run specified Google ADK 2.0 agent")
    parser.add_argument(
        "--agent",
        choices=["fleet", "maintenance", "supervisor", "learning"],
        required=True,
        help="Agent to execute"
    )
    args = parser.parse_args()

    try:
        raw_input = sys.stdin.read()
        telemetry = json.loads(raw_input) if raw_input.strip() else {}
    except json.JSONDecodeError as e:
        sys.stderr.write(f"Invalid JSON input: {e}\n")
        sys.exit(1)

    if args.agent == "fleet":
        result = run_fleet_agent(telemetry)
    elif args.agent == "maintenance":
        result = run_maintenance_agent(telemetry)
    elif args.agent == "supervisor":
        result = run_supervisor_agent(telemetry)
    elif args.agent == "learning":
        result = run_learning_agent(telemetry)
    else:
        sys.stderr.write(f"Unknown agent: {args.agent}\n")
        sys.exit(1)

    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
