import sys
import os
import pytest

runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from agents.supervisor import SupervisorAgent, run_supervisor_agent, create_supervisor_agent
from schemas.recommendations import SupervisorRecommendation
from schemas.findings import FleetAgentResponse, MaintenanceAgentResponse, AgentFinding


def test_supervisor_agent_adk_creation():
    """Verify Google ADK Agent is created with correct metadata and output schema."""
    agent = create_supervisor_agent()
    assert agent.name == "supervisor_agent"
    assert agent.output_schema == SupervisorRecommendation
    assert len(agent.tools) >= 2


def test_supervisor_synthesis_combined_risk():
    """Verify combined critical fleet + maintenance findings lead to STOP_AND_INFORM_SUPERVISOR."""
    agent = SupervisorAgent()
    telemetry = {"depth": 350, "oreGrade": 1.4}
    
    fleet_resp = FleetAgentResponse(
        findings=[AgentFinding(
            agent="fleet_agent",
            status="CRITICAL",
            relevantSignals=["ramp_congestion"],
            concerns=["Severe ramp gridlock"],
            confidence=0.95,
            summary="Ramp gridlock detected"
        )]
    )
    maint_resp = MaintenanceAgentResponse(
        findings=[AgentFinding(
            agent="maintenance_agent",
            status="CRITICAL",
            relevantSignals=["engine_temp"],
            concerns=["Overheating above 115C"],
            confidence=0.98,
            summary="Thermal ceiling exceeded"
        )]
    )

    rec = agent.synthesize(telemetry, fleet_resp, maint_resp, scenario_id="COMBINED_OPERATIONAL_RISK")
    assert rec.decision == "STOP_AND_INFORM_SUPERVISOR"
    assert rec.proposedAction == "halt"
    assert "fleet_agent" in rec.agentsConsulted
    assert "maintenance_agent" in rec.agentsConsulted
    assert "Combined operational risk" in rec.explanation


def test_supervisor_synthesis_nominal():
    """Verify all nominal findings synthesize into NORMAL recommendation."""
    agent = SupervisorAgent()
    telemetry = {}
    fleet_resp = FleetAgentResponse(
        findings=[AgentFinding(agent="fleet_agent", status="NOMINAL", confidence=0.99, summary="Nominal fleet")]
    )
    maint_resp = MaintenanceAgentResponse(
        findings=[AgentFinding(agent="maintenance_agent", status="NOMINAL", confidence=0.99, summary="Nominal equipment")]
    )

    rec = agent.synthesize(telemetry, fleet_resp, maint_resp, scenario_id="NORMAL_OPERATIONS")
    assert rec.decision == "NORMAL"
    assert rec.proposedAction == "adjustDrillSpeed"
