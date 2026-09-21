import sys
import os
import pytest

# Ensure agent-runtime is on PYTHONPATH
runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from agents.fleet import FleetAgent, run_fleet_agent, create_fleet_agent
from schemas.findings import FleetAgentResponse


def test_fleet_agent_adk_creation():
    """Verify Google ADK Agent is created with correct metadata and tools."""
    agent = create_fleet_agent()
    assert agent.name == "fleet_agent"
    assert "haul ramp" in agent.description.lower()
    assert len(agent.tools) >= 1
    assert agent.output_schema == FleetAgentResponse


def test_fleet_agent_nominal_telemetry():
    """Verify nominal conditions return NOMINAL status."""
    telemetry = {
        "ramp": {"congestionLevel": 15.0, "status": "open"},
        "fleet": {"availability": 95.0, "trucks": [{"id": "T1", "operational": True}]},
    }
    result = run_fleet_agent(telemetry)
    assert "findings" in result
    assert len(result["findings"]) > 0
    assert result["findings"][0]["status"] == "NOMINAL"
    assert result["findings"][0]["agent"] == "fleet_agent"
    assert result["recommendation"] is not None


def test_fleet_agent_critical_congestion():
    """Verify high congestion triggers CRITICAL status and throttling recommendation."""
    telemetry = {
        "ramp": {"congestionLevel": 85.0, "status": "open"},
        "fleet": {"availability": 55.0},
    }
    result = run_fleet_agent(telemetry)
    assert result["findings"][0]["status"] == "CRITICAL"
    assert "ramp_congestion_percent" in result["findings"][0]["relevantSignals"]
    assert "Throttle" in result["recommendation"]["recommendation"]


def test_fleet_agent_pydantic_validation():
    """Verify structured response adheres strictly to FleetAgentResponse schema."""
    agent = FleetAgent()
    telemetry = {"ramp": {"congestionLevel": 45.0}, "fleet": {"availability": 80.0}}
    response = agent.evaluate(telemetry)
    assert isinstance(response, FleetAgentResponse)
    assert response.agent_id == "fleet_agent"
    assert response.version == "2.0.0"
