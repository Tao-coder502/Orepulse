"""Smoke test for Google ADK 2.0 Agent Runtime.

Verifies initialization of Google ADK 2.0 agents, parallel execution, and structured workflows.
"""

import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

import google.adk as adk
from google.adk import Agent
from agents.supervisor import create_supervisor_agent
from agents.fleet import create_fleet_agent
from agents.maintenance import create_maintenance_agent
from agents.learning import create_learning_agent
from workflows.ore_pulse_workflow import build_adk_specialist_parallel_agent, OrePulseWorkflow


def main():
    print(f"=== OrePulse Google ADK 2.0 Runtime Smoke Test ===")
    print(f"Google ADK Version: {getattr(adk, '__version__', 'unknown')}")

    # 1. Test Agent Creation
    supervisor = create_supervisor_agent()
    fleet = create_fleet_agent()
    maintenance = create_maintenance_agent()
    learning = create_learning_agent()

    print(f"Created ADK Supervisor Agent: {supervisor.name}")
    print(f"Created ADK Fleet Agent: {fleet.name}")
    print(f"Created ADK Maintenance Agent: {maintenance.name}")
    print(f"Created ADK Learning Agent: {learning.name}")

    # 2. Test ParallelAgent Composition
    parallel = build_adk_specialist_parallel_agent()
    print(f"Created ADK Parallel Agent: {parallel.name} with {[a.name for a in parallel.sub_agents]}")

    # 3. Test Full Workflow Execution
    workflow = OrePulseWorkflow()
    test_payload = {
        "scenarioId": "COMBINED_OPERATIONAL_RISK",
        "telemetry": {
            "equipment": {"temperature": 115.0, "status": "degraded"},
            "ramp": {"congestionLevel": 80.0, "status": "open"},
            "fleet": {"availability": 60.0},
        }
    }
    trace = workflow.run(test_payload)
    print(f"\nWorkflow Execution Result:")
    print(f"  Execution ID: {trace['executionId']}")
    print(f"  Agents Invoked: {trace['agentsInvoked']}")
    print(f"  Proposed Decision: {trace['proposedDecision']['decision']}")
    print(f"  Safety Engine Final: {trace['finalDecision']['decision']}")
    print(f"  Learning Takeaway: {trace['learningExplanation']['learningTakeaway'][:80]}...")
    print(f"\n[PASS] Google ADK 2.0 runtime operational.")


if __name__ == "__main__":
    main()
