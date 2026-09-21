"""Scenario context tools for Google ADK 2.0 agents."""

from typing import Dict, Any
from google.adk.tools import FunctionTool

_SCENARIO_DESCRIPTIONS: Dict[str, Dict[str, Any]] = {
    "NORMAL_OPERATIONS": {
        "id": "NORMAL_OPERATIONS",
        "name": "Normal Operations",
        "description": "Baseline steady-state mining operations with nominal parameters.",
        "simulated_temperature": 85.0,
        "simulated_congestion": 25.0,
        "simulated_availability": 95.0,
    },
    "EQUIPMENT_ANOMALY": {
        "id": "EQUIPMENT_ANOMALY",
        "name": "Equipment Anomaly",
        "description": "Haul truck engine overheating (120°C) with degraded mechanical status.",
        "simulated_temperature": 120.0,
        "simulated_congestion": 30.0,
        "simulated_availability": 75.0,
    },
    "COMBINED_OPERATIONAL_RISK": {
        "id": "COMBINED_OPERATIONAL_RISK",
        "name": "Combined Operational Risk",
        "description": "High haul ramp congestion (80%) combined with elevated truck temperature and reduced fleet availability.",
        "simulated_temperature": 115.0,
        "simulated_congestion": 80.0,
        "simulated_availability": 60.0,
    },
}

_CURRENT_SCENARIO_ID = "COMBINED_OPERATIONAL_RISK"


def set_current_scenario_id(scenario_id: str) -> None:
    """Set the active scenario identifier."""
    global _CURRENT_SCENARIO_ID
    if scenario_id:
        _CURRENT_SCENARIO_ID = scenario_id


def get_scenario_context() -> Dict[str, Any]:
    """Retrieve educational context and background for the active scenario.

    Returns:
        Dictionary describing the current simulated scenario context and expectations.
    """
    scenario = _SCENARIO_DESCRIPTIONS.get(
        _CURRENT_SCENARIO_ID,
        _SCENARIO_DESCRIPTIONS["COMBINED_OPERATIONAL_RISK"]
    )
    return {
        "scenario_id": scenario["id"],
        "scenario_name": scenario["name"],
        "description": scenario["description"],
        "is_educational_simulation": True,
        "guidance": (
            "Analyze synthetic telemetry only. Do not issue real mining commands. "
            "Deterministic safety constraints govern simulated responses."
        ),
    }


scenario_context_tool = FunctionTool(get_scenario_context)
