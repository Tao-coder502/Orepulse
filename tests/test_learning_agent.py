import sys
import os
import pytest

runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from agents.learning import LearningAgent, run_learning_agent, create_learning_agent
from schemas.learning import LearningExplanation


def test_learning_agent_adk_creation():
    """Verify Google ADK Agent is created with correct metadata and output schema."""
    agent = create_learning_agent()
    assert agent.name == "learning_agent"
    assert agent.output_schema == LearningExplanation


def test_learning_agent_stop_decision_explanation():
    """Verify explanation generation for STOP_AND_INFORM_SUPERVISOR."""
    context = {
        "finalDecision": {"decision": "STOP_AND_INFORM_SUPERVISOR", "action": "halt"},
        "safetyEvaluation": {
            "status": "STOP_AND_INFORM_SUPERVISOR",
            "triggeredRules": ["criticalEquipmentAnomaly"],
            "rationale": "Overheating detected",
        },
        "proposedDecision": {"decision": "STOP_AND_INFORM_SUPERVISOR"},
        "importantSignals": ["truck_temperature"],
        "agentsInvolved": ["supervisor_agent", "maintenance_agent"],
    }
    result = run_learning_agent(context)
    assert "STOP AND INFORM SUPERVISOR" in result["whatHappened"]
    assert "authoritative" in result["safetyExplanation"].lower()
    assert len(result["learningTakeaway"]) > 10
    assert "?" in result["reflectionQuestion"]


def test_learning_agent_nominal_explanation():
    """Verify explanation generation for nominal operations."""
    context = {
        "finalDecision": {"decision": "ALLOW", "action": "adjustDrillSpeed"},
        "safetyEvaluation": {"status": "ALLOW", "triggeredRules": []},
        "proposedDecision": {"decision": "NORMAL"},
    }
    result = run_learning_agent(context)
    assert "nominally" in result["decisionExplanation"].lower() or "verified" in result["decisionExplanation"].lower()
    assert "?" in result["reflectionQuestion"]
