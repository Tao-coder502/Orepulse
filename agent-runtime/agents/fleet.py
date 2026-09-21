"""Fleet Specialist Agent implemented with Google ADK 2.0."""

import json
import logging
from typing import Any, Dict, List, Optional
from google.adk import Agent
from schemas.findings import AgentFinding, AgentRecommendation, FleetAgentResponse
from schemas.a2a_messages import FleetAnalysisRequest, FleetAnalysisResponse
from tools.simulation_tools import fleet_conditions_tool, set_current_telemetry_context

logger = logging.getLogger(__name__)

FLEET_SYSTEM_INSTRUCTION = (
    "You are the OrePulse Fleet Specialist Agent in an educational mining simulation. "
    "Your responsibility is to analyze simulated fleet availability, haul ramp congestion, "
    "and haul-road conditions, and provide an advisory simulated dispatch-response recommendation. "
    "Examine synthetic fleet conditions using the provided read-only tools or input context. "
    "Produce structured findings indicating whether ramp traffic flow or fleet availability poses an operational risk. "
    "DO NOT issue real mining commands or control actual vehicles. "
    "The deterministic Safety Engine maintains absolute authority over all operational actions."
)


def create_fleet_agent(model: str = "gemini-3.6-flash") -> Agent:
    """Create a Google ADK 2.0 Agent instance for fleet analysis."""
    return Agent(
        name="fleet_agent",
        description="Analyzes simulated fleet availability, haul road bottlenecks, and haul ramp congestion.",
        instruction=FLEET_SYSTEM_INSTRUCTION,
        model=model,
        tools=[fleet_conditions_tool],
        output_schema=FleetAgentResponse,
    )


class FleetAgent:
    """Fleet Specialist Agent wrapper utilizing Google ADK 2.0."""

    def __init__(self, model: str = "gemini-3.6-flash"):
        self.adk_agent = create_fleet_agent(model=model)
        logger.info("FleetAgent initialized with Google ADK 2.0.")

    def evaluate(self, telemetry: Dict[str, Any]) -> FleetAgentResponse:
        """Evaluate synthetic fleet telemetry and return structured findings.

        Args:
            telemetry: Synthetic fleet telemetry dictionary.

        Returns:
            Validated FleetAgentResponse instance.
        """
        set_current_telemetry_context(telemetry)
        
        # Extract telemetry parameters with educational defaults
        ramp = telemetry.get("ramp", {}) if isinstance(telemetry, dict) else {}
        fleet = telemetry.get("fleet", {}) if isinstance(telemetry, dict) else {}
        
        congestion = ramp.get("congestionLevel", 25.0)
        availability = fleet.get("availability", 90.0)
        
        # Check raw sensors if available
        if "telemetry" in telemetry and isinstance(telemetry["telemetry"], list):
            for s in telemetry["telemetry"]:
                sid = s.get("sensorId", "").lower()
                if "congestion" in sid:
                    congestion = s.get("value", congestion)
                elif "availability" in sid:
                    availability = s.get("value", availability)

        findings: List[AgentFinding] = []
        recommendation: Optional[AgentRecommendation] = None

        if congestion >= 70.0:
            findings.append(
                AgentFinding(
                    agent="fleet_agent",
                    status="CRITICAL",
                    relevantSignals=["ramp_congestion_percent", "haul_road_flow"],
                    concerns=[
                        f"Severe haul ramp congestion at {congestion}%",
                        "High collision risk on main decline route",
                    ],
                    confidence=0.96,
                    summary=f"Haul ramp congestion is elevated at {congestion}%, exceeding safe staging threshold (60%).",
                )
            )
            recommendation = AgentRecommendation(
                recommendation="Throttle haul truck dispatch to ramp entry",
                rationale="Excessive congestion on narrow haul ramps compromises safe passing distances.",
                parameters={"dispatchRateReduction": 0.5},
            )
        elif congestion > 40.0 or availability < 75.0:
            findings.append(
                AgentFinding(
                    agent="fleet_agent",
                    status="DEGRADED",
                    relevantSignals=["ramp_congestion_percent", "fleet_availability_percent"],
                    concerns=[f"Moderate congestion ({congestion}%) or reduced availability ({availability}%)"],
                    confidence=0.88,
                    summary=f"Moderate fleet bottleneck detected: congestion={congestion}%, availability={availability}%.",
                )
            )
            recommendation = AgentRecommendation(
                recommendation="Optimize cycle times and monitor ramp staging",
                rationale="Moderate congestion may escalate if haul cycles encounter minor delays.",
                parameters={"monitorIntervalSec": 30},
            )
        else:
            findings.append(
                AgentFinding(
                    agent="fleet_agent",
                    status="NOMINAL",
                    relevantSignals=["ramp_congestion_percent", "fleet_availability_percent"],
                    concerns=[],
                    confidence=0.98,
                    summary=f"Fleet operations steady: availability is {availability}% and ramp congestion is {congestion}%.",
                )
            )
            recommendation = AgentRecommendation(
                recommendation="Maintain standard dispatch intervals",
                rationale="Ramp and fleet metrics remain well within nominal educational limits.",
                parameters={},
            )

        return FleetAgentResponse(
            findings=findings,
            recommendation=recommendation,
            agent_id="fleet_agent",
            version="2.0.0",
        )

    def handle_a2a_request(self, request: FleetAnalysisRequest) -> FleetAnalysisResponse:
        """Process an incoming A2A protocol request and return a structured A2A response."""
        resp = self.evaluate(request.telemetry)
        primary_status = resp.findings[0].status if resp.findings else "NOMINAL"
        signals = resp.findings[0].relevantSignals if resp.findings else ["ramp_congestion_percent"]
        explanation = resp.findings[0].summary if resp.findings else "Fleet conditions nominal."
        confidence = resp.findings[0].confidence if resp.findings else 0.95
        
        severity_map = {"CRITICAL": "critical", "DEGRADED": "medium", "NOMINAL": "low"}
        severity = severity_map.get(primary_status, "low")

        return FleetAnalysisResponse(
            experiment_id=request.experiment_id,
            agent_id="fleet_agent",
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


def run_fleet_agent(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point returning a serialized JSON-compatible dictionary."""
    agent = FleetAgent()
    response = agent.evaluate(telemetry)
    return getattr(response, "model_dump", response.dict)()
