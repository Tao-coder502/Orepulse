import sys
import os
import pytest

runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from workflows.ore_pulse_workflow import OrePulseWorkflow, build_adk_specialist_parallel_agent
from runtime.runner import AdkRuntimeRunner


def test_adk_parallel_agent_composition():
    """Verify Google ADK ParallelAgent combines specialist sub-agents."""
    parallel = build_adk_specialist_parallel_agent()
    assert parallel.name == "specialists_parallel_agent"
    sub_names = [a.name for a in parallel.sub_agents]
    assert "fleet_agent" in sub_names
    assert "maintenance_agent" in sub_names


def test_workflow_combined_operational_risk_execution():
    """Verify end-to-end execution of the combined risk scenario."""
    workflow = OrePulseWorkflow()
    payload = {
        "scenarioId": "COMBINED_OPERATIONAL_RISK",
        "telemetry": {
            "equipment": {"temperature": 115.0, "status": "degraded"},
            "ramp": {"congestionLevel": 80.0, "status": "open"},
            "fleet": {"availability": 60.0},
        }
    }
    trace = workflow.run(payload)

    # 1. Verify execution timeline and ordering
    assert trace["supervisorStarted"] is True
    expected_agents = ["supervisor_agent", "fleet_agent", "maintenance_agent", "safety_engine", "learning_agent"]
    for ag in expected_agents:
        assert ag in trace["agentsInvoked"]

    # 2. Verify specialist results present
    assert "fleet" in trace["agentResults"]
    assert "maintenance" in trace["agentResults"]
    assert trace["agentResults"]["fleet"]["findings"][0]["status"] == "CRITICAL"
    assert trace["agentResults"]["maintenance"]["findings"][0]["status"] == "CRITICAL"

    # 3. Verify synthesis & safety engine outcome
    assert trace["proposedDecision"]["decision"] == "STOP_AND_INFORM_SUPERVISOR"
    assert trace["safetyEvaluation"]["status"] == "STOP_AND_INFORM_SUPERVISOR"
    assert trace["finalDecision"]["decision"] == "STOP_AND_INFORM_SUPERVISOR"
    assert trace["humanOversightRequired"] is True

    # 4. Verify learning explanation generated post-decision
    assert "learningExplanation" in trace
    assert trace["learningExplanation"]["whatHappened"] != ""


def test_workflow_what_if_congestion_drop():
    """Verify changing ramp congestion from 80% to 15% changes fleet finding and system state."""
    workflow = OrePulseWorkflow()
    
    # Run with low congestion and normal temperature
    payload_low = {
        "scenarioId": "COMBINED_OPERATIONAL_RISK",
        "telemetry": {
            "equipment": {"temperature": 85.0, "status": "operational"},
            "ramp": {"congestionLevel": 15.0, "status": "open"},
            "fleet": {"availability": 95.0},
        }
    }
    trace_low = workflow.run(payload_low)
    assert trace_low["agentResults"]["fleet"]["findings"][0]["status"] == "NOMINAL"
    assert trace_low["proposedDecision"]["decision"] == "NORMAL"
    assert trace_low["safetyEvaluation"]["status"] == "ALLOW"
    assert trace_low["finalDecision"]["decision"] == "ALLOW"


def test_safety_engine_absolute_authority_over_adversarial_proposal():
    """Prove: Agent recommendation != Final decision.

    Safety Engine halts operation even if an agent proposed adjustDrillSpeed during critical overheat.
    """
    workflow = OrePulseWorkflow()
    from schemas.recommendations import SupervisorRecommendation
    
    # Craft a critical overheat condition
    telemetry = {
        "equipment": {"temperature": 125.0, "status": "failed"},
        "ramp": {"congestionLevel": 20.0},
    }
    # Adversarial / reckless recommendation: proposing adjustDrillSpeed despite severe engine failure
    reckless_rec = SupervisorRecommendation(
        decision="NORMAL",
        contributingSignals=[],
        agentsConsulted=["rogue_agent"],
        explanation="Ignoring engine heat to maximize production quota",
        proposedAction="adjustDrillSpeed",
        parameters={"targetSpeed": 2.0},
        confidence=0.99,
    )

    safety_eval = workflow._evaluate_safety_boundary(telemetry, reckless_rec)
    
    # Assert safety engine overrides the recommendation
    assert safety_eval["status"] == "STOP_AND_INFORM_SUPERVISOR"
    assert "criticalEquipmentAnomaly" in safety_eval["triggeredRules"]
    assert safety_eval["humanOversightRequired"] is True


def test_runtime_runner_fallback_resilience():
    """Verify runtime runner produces valid fallback trace if workflow encounters unexpected error."""
    runner = AdkRuntimeRunner()
    
    # Pass an invalid payload type to trigger fallback
    bad_payload = "not-a-dict"
    trace = runner.run_workflow(bad_payload)
    
    assert trace["executionMode"] == "deterministic_fallback"
    assert "adk-fallback" in trace["executionId"]
    assert "safetyEvaluation" in trace
    assert "finalDecision" in trace
    assert "learningExplanation" in trace
