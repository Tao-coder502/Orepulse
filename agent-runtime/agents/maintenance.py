"""Maintenance Specialist Agent implemented with Google ADK 2.0."""

import json
import logging
from typing import Any, Dict, List, Optional
from google.adk import Agent
from schemas.findings import AgentFinding, AgentRecommendation, MaintenanceAgentResponse
from schemas.a2a_messages import MaintenanceAnalysisRequest, MaintenanceAnalysisResponse
from tools.simulation_tools import equipment_signals_tool, set_current_telemetry_context

logger = logging.getLogger(__name__)

MAINTENANCE_SYSTEM_INSTRUCTION = (
    "You are the OrePulse Maintenance Specialist Agent in an educational mining simulation. "
    "Your responsibility is to detect simulated thermal anomalies and evaluate their severity from "
    "synthetic telemetry (engine temperatures, active alerts, and mechanical states). "
    "Inspect equipment telemetry using the provided read-only tools or input context. "
    "Classify simulated severity, identify simulated equipment-health concerns, and propose simulated "
    "inspection or cooldown responses. "
    "DO NOT prescribe real-world repair procedures or authorize live hardware maintenance. "
    "The deterministic Safety Engine maintains absolute authority over all operational actions."
)


def create_maintenance_agent(model: str = "gemini-3.6-flash") -> Agent:
    """Create a Google ADK 2.0 Agent instance for equipment maintenance analysis."""
    return Agent(
        name="maintenance_agent",
        description="Detects simulated thermal anomalies and evaluates their severity from synthetic equipment telemetry.",
        instruction=MAINTENANCE_SYSTEM_INSTRUCTION,
        model=model,
        tools=[equipment_signals_tool],
        output_schema=MaintenanceAgentResponse,
    )


class MaintenanceAgent:
    """Maintenance Specialist Agent wrapper utilizing Google ADK 2.0."""

    def __init__(self, model: str = "gemini-3.6-flash"):
        self.adk_agent = create_maintenance_agent(model=model)
        logger.info("MaintenanceAgent initialized with Google ADK 2.0.")

    def evaluate(self, telemetry: Dict[str, Any]) -> MaintenanceAgentResponse:
        """Evaluate synthetic equipment telemetry and return structured findings.

        Args:
            telemetry: Synthetic equipment telemetry dictionary.

        Returns:
            Validated MaintenanceAgentResponse instance.
        """
        set_current_telemetry_context(telemetry)
        
        equipment = telemetry.get("equipment", {}) if isinstance(telemetry, dict) else {}
        temp = equipment.get("temperature", 85.0)
        status = equipment.get("status", "operational")
        alert = equipment.get("alert") or {}
        if isinstance(alert, dict):
            alert_severity = alert.get("severity", "none").lower()
            alert_message = alert.get("message", "High thermal alert")
        elif isinstance(alert, str):
            alert_severity = "high" if any(w in alert.lower() for w in ["high", "critical", "thermal", "alert"]) else "none"
            alert_message = alert
        else:
            alert_severity = "none"
            alert_message = "None"

        # Check raw sensor streams
        if "telemetry" in telemetry and isinstance(telemetry["telemetry"], list):
            for s in telemetry["telemetry"]:
                sid = s.get("sensorId", "").lower()
                if "temp" in sid:
                    temp = s.get("value", temp)

        findings: List[AgentFinding] = []
        recommendation: Optional[AgentRecommendation] = None

        if temp > 100.0 or alert_severity == "high" or status == "failed":
            findings.append(
                AgentFinding(
                    agent="maintenance_agent",
                    status="CRITICAL",
                    relevantSignals=["truck_temperature_celsius", "maintenance_alert_code"],
                    concerns=[
                        f"Engine overheating at {temp}°C (safe ceiling: 100°C)",
                        f"Active alert: {alert_message}",
                    ],
                    confidence=0.99,
                    summary=f"Critical thermal threshold breached: haul truck engine reached {temp}°C with severity '{alert_severity}'.",
                )
            )
            recommendation = AgentRecommendation(
                recommendation="Halt haul truck operations immediately for inspection",
                rationale="Excess thermal accumulation risks permanent mechanical failure and thermal runaway.",
                parameters={"cooldownRequired": True, "targetTemp": 75.0},
            )
        elif temp > 90.0 or alert_severity in ("medium", "low") or status == "degraded":
            findings.append(
                AgentFinding(
                    agent="maintenance_agent",
                    status="DEGRADED",
                    relevantSignals=["truck_temperature_celsius"],
                    concerns=[f"Elevated engine temperature ({temp}°C) nearing thermal threshold"],
                    confidence=0.91,
                    summary=f"Equipment operating with elevated thermal signature at {temp}°C.",
                )
            )
            recommendation = AgentRecommendation(
                recommendation="Schedule preventive thermal inspection during next maintenance window",
                rationale="Operating near thermal limits increases component wear rate.",
                parameters={"inspectionWindow": "next_shift"},
            )
        else:
            findings.append(
                AgentFinding(
                    agent="maintenance_agent",
                    status="NOMINAL",
                    relevantSignals=["truck_temperature_celsius"],
                    concerns=[],
                    confidence=0.98,
                    summary=f"Equipment operating in nominal thermal band ({temp}°C).",
                )
            )
            recommendation = AgentRecommendation(
                recommendation="Continue standard equipment operation cycle",
                rationale="All thermal and mechanical metrics are within normal educational tolerances.",
                parameters={},
            )

        return MaintenanceAgentResponse(
            findings=findings,
            recommendation=recommendation,
            agent_id="maintenance_agent",
            version="2.0.0",
        )

    def handle_a2a_request(self, request: MaintenanceAnalysisRequest) -> MaintenanceAnalysisResponse:
        """Process an incoming A2A protocol request and return a structured A2A response."""
        resp = self.evaluate(request.telemetry)
        primary_status = resp.findings[0].status if resp.findings else "NOMINAL"
        signals = resp.findings[0].relevantSignals if resp.findings else ["truck_temperature_celsius"]
        explanation = resp.findings[0].summary if resp.findings else "Equipment operating nominally."
        confidence = resp.findings[0].confidence if resp.findings else 0.95

        severity_map = {"CRITICAL": "critical", "DEGRADED": "medium", "NOMINAL": "low"}
        severity = severity_map.get(primary_status, "low")

        return MaintenanceAnalysisResponse(
            experiment_id=request.experiment_id,
            agent_id="maintenance_agent",
            status=primary_status,
            findings=resp.findings,
            recommendation=resp.recommendation,
            signals=signals,
            severity=severity,
            confidence=confidence,
            explanation=explanation,
            transport="a2a",
            protocol_version="1.0",
        )


def run_maintenance_agent(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point returning a serialized JSON-compatible dictionary."""
    agent = MaintenanceAgent()
    response = agent.evaluate(telemetry)
    return getattr(response, "model_dump", response.dict)()
