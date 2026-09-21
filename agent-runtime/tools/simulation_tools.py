"""Read-only deterministic simulation tools for Google ADK 2.0 agents."""

from typing import Dict, Any, List
from google.adk.tools import FunctionTool

# Thread-safe / session-local context holder for current evaluation telemetry
_CURRENT_CONTEXT: Dict[str, Any] = {}


def set_current_telemetry_context(telemetry: Dict[str, Any]) -> None:
    """Store the current simulation telemetry for read-only tools."""
    global _CURRENT_CONTEXT
    _CURRENT_CONTEXT = telemetry or {}


def get_simulation_state() -> Dict[str, Any]:
    """Retrieve the high-level simulated mine state.

    Returns:
        Dictionary containing ore grade, depth, equipment status, and ramp state.
    """
    ctx = _CURRENT_CONTEXT
    equipment = ctx.get("equipment", {})
    ramp = ctx.get("ramp", {})
    fleet = ctx.get("fleet", {})
    return {
        "timestamp": ctx.get("timestamp", "2026-09-16T00:00:00Z"),
        "depth_meters": ctx.get("depth", 350),
        "ore_grade_arbitrary": ctx.get("oreGrade", 1.42),
        "equipment_status": equipment.get("status", "operational"),
        "equipment_temperature_celsius": equipment.get("temperature", 85.0),
        "ramp_status": ramp.get("status", "open"),
        "ramp_congestion_percent": ramp.get("congestionLevel", 25.0),
        "fleet_availability_percent": fleet.get("availability", 90.0),
    }


def get_equipment_signals() -> Dict[str, Any]:
    """Inspect simulated equipment-health signals and telemetry.

    Returns:
        Dictionary containing temperature, alerts, and operational status.
    """
    ctx = _CURRENT_CONTEXT
    equipment = ctx.get("equipment", {})
    alert = equipment.get("alert") or {}
    
    # Also parse raw sensor stream if present
    sensors: List[Dict[str, Any]] = ctx.get("telemetry", [])
    temp_sensors = [s for s in sensors if "temp" in s.get("sensorId", "").lower()]
    
    return {
        "temperature_celsius": equipment.get("temperature", 85.0),
        "mechanical_status": equipment.get("status", "operational"),
        "active_alert": {
            "code": alert.get("code", "NONE"),
            "severity": alert.get("severity", "none"),
            "message": alert.get("message", "No active maintenance alert"),
        },
        "sensor_telemetry_readings": temp_sensors,
        "is_safe_threshold": equipment.get("temperature", 85.0) <= 100.0,
    }


def get_fleet_conditions() -> Dict[str, Any]:
    """Inspect simulated fleet availability and ramp congestion.

    Returns:
        Dictionary containing ramp congestion, fleet availability, and truck statuses.
    """
    ctx = _CURRENT_CONTEXT
    ramp = ctx.get("ramp", {})
    fleet = ctx.get("fleet", {})
    trucks = fleet.get("trucks", [])
    
    return {
        "ramp_status": ramp.get("status", "open"),
        "ramp_congestion_percent": ramp.get("congestionLevel", 25.0),
        "fleet_availability_percent": fleet.get("availability", 90.0),
        "total_trucks": len(trucks) if trucks else 4,
        "operational_trucks": sum(1 for t in trucks if t.get("operational", True)) if trucks else 4,
        "congestion_alert": ramp.get("congestionLevel", 25.0) > 60.0,
    }


# Export ADK FunctionTool wrappers
simulation_state_tool = FunctionTool(get_simulation_state)
equipment_signals_tool = FunctionTool(get_equipment_signals)
fleet_conditions_tool = FunctionTool(get_fleet_conditions)
