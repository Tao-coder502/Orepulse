import sys
import os
import pytest

runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from agents.maintenance import MaintenanceAgent, run_maintenance_agent, create_maintenance_agent
from schemas.findings import MaintenanceAgentResponse


def test_maintenance_agent_adk_creation():
    """Verify Google ADK Agent is created with correct metadata and tools."""
    agent = create_maintenance_agent()
    assert agent.name == "maintenance_agent"
    assert "thermal" in agent.description.lower()
    assert len(agent.tools) >= 1
    assert agent.output_schema == MaintenanceAgentResponse


def test_maintenance_agent_nominal_telemetry():
    """Verify nominal conditions return NOMINAL status."""
    telemetry = {
        "equipment": {"temperature": 82.0, "status": "operational", "alert": None}
    }
    result = run_maintenance_agent(telemetry)
    assert "findings" in result
    assert result["findings"][0]["status"] == "NOMINAL"
    assert result["findings"][0]["agent"] == "maintenance_agent"


def test_maintenance_agent_critical_overheat():
    """Verify overheating above 100°C triggers CRITICAL status and halt recommendation."""
    telemetry = {
        "equipment": {
            "temperature": 118.0,
            "status": "degraded",
            "alert": {"code": "THERM_HIGH", "severity": "high", "message": "Critical engine temperature"},
        }
    }
    result = run_maintenance_agent(telemetry)
    assert result["findings"][0]["status"] == "CRITICAL"
    assert "truck_temperature_celsius" in result["findings"][0]["relevantSignals"]
    assert "Halt" in result["recommendation"]["recommendation"]


def test_maintenance_agent_pydantic_validation():
    """Verify structured response adheres strictly to MaintenanceAgentResponse schema."""
    agent = MaintenanceAgent()
    telemetry = {"equipment": {"temperature": 92.0, "status": "operational"}}
    response = agent.evaluate(telemetry)
    assert isinstance(response, MaintenanceAgentResponse)
    assert response.agent_id == "maintenance_agent"
    assert response.version == "2.0.0"
