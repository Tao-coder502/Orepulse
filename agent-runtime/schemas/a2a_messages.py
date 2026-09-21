"""A2A (Agent2Agent) Protocol Message Contracts for OrePulse AI.

These schemas establish typed, validated contracts for communication
between the Supervisor Agent and Autonomous Specialist Agents (Fleet & Maintenance)
conforming to the A2A protocol specification.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from schemas.findings import AgentFinding, AgentRecommendation
from schemas.recommendations import SupervisorRecommendation


class FleetAnalysisRequest(BaseModel):
    """A2A Request sent from Supervisor Agent to Fleet Specialist Agent."""
    experiment_id: str = Field(..., description="Unique experiment correlation ID.")
    scenario_id: str = Field(..., description="Simulated scenario identifier.")
    timestamp: str = Field(..., description="ISO8601 creation timestamp.")
    telemetry: Dict[str, Any] = Field(..., description="Synthetic fleet & ramp telemetry context.")
    analysis_scope: List[str] = Field(
        default_factory=lambda: ["ramp_congestion", "fleet_availability"],
        description="Target signals requested for fleet analysis."
    )


class FleetAnalysisResponse(BaseModel):
    """A2A Response returned from Fleet Specialist Agent to Supervisor Agent."""
    experiment_id: str = Field(..., description="Correlated experiment ID.")
    agent_id: str = Field(default="fleet_agent", description="A2A Agent identifier.")
    status: str = Field(..., description="Simulated operational status: NOMINAL, DEGRADED, CRITICAL.")
    findings: List[AgentFinding] = Field(default_factory=list, description="Structured findings.")
    recommendation: Optional[AgentRecommendation] = Field(None, description="Proposed fleet advisory action.")
    signals: List[str] = Field(default_factory=list, description="Observable contributing signals.")
    severity: str = Field(default="low", description="Evaluated severity: low, medium, high, critical.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Agent confidence score.")
    explanation: str = Field(..., description="Concise educational summary without hidden chain-of-thought.")
    transport: str = Field(default="a2a", description="Protocol transport layer used.")
    protocol_version: str = Field(default="1.0", description="A2A protocol specification version.")


class MaintenanceAnalysisRequest(BaseModel):
    """A2A Request sent from Supervisor Agent to Maintenance Specialist Agent."""
    experiment_id: str = Field(..., description="Unique experiment correlation ID.")
    scenario_id: str = Field(..., description="Simulated scenario identifier.")
    timestamp: str = Field(..., description="ISO8601 creation timestamp.")
    telemetry: Dict[str, Any] = Field(..., description="Synthetic equipment telemetry context.")
    analysis_scope: List[str] = Field(
        default_factory=lambda: ["truck_temperature", "maintenance_alerts"],
        description="Target signals requested for maintenance analysis."
    )


class MaintenanceAnalysisResponse(BaseModel):
    """A2A Response returned from Maintenance Specialist Agent to Supervisor Agent."""
    experiment_id: str = Field(..., description="Correlated experiment ID.")
    agent_id: str = Field(default="maintenance_agent", description="A2A Agent identifier.")
    status: str = Field(..., description="Simulated operational status: NOMINAL, DEGRADED, CRITICAL.")
    findings: List[AgentFinding] = Field(default_factory=list, description="Structured findings.")
    recommendation: Optional[AgentRecommendation] = Field(None, description="Proposed maintenance advisory action.")
    signals: List[str] = Field(default_factory=list, description="Observable contributing signals.")
    severity: str = Field(default="low", description="Evaluated severity: low, medium, high, critical.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Agent confidence score.")
    explanation: str = Field(..., description="Concise educational summary without hidden chain-of-thought.")
    transport: str = Field(default="a2a", description="Protocol transport layer used.")
    protocol_version: str = Field(default="1.0", description="A2A protocol specification version.")


class SupervisorSynthesisRequest(BaseModel):
    """Request contract for Supervisor to synthesize specialist findings."""
    experiment_id: str = Field(..., description="Correlated experiment ID.")
    scenario_id: str = Field(..., description="Simulated scenario identifier.")
    fleet_response: FleetAnalysisResponse = Field(..., description="Structured findings from Fleet Agent.")
    maintenance_response: MaintenanceAnalysisResponse = Field(..., description="Structured findings from Maintenance Agent.")
    telemetry: Dict[str, Any] = Field(..., description="Current simulation telemetry.")


class A2ATraceEvent(BaseModel):
    """Observable trace event capturing A2A agent interaction."""
    agent: str = Field(..., description="Agent name involved in the event.")
    event: str = Field(..., description="Event name (e.g., A2A_REQUEST_SENT, A2A_RESPONSE_RECEIVED).")
    status: str = Field(..., description="Event execution status: SUCCESS, PENDING, ERROR.")
    timestamp: str = Field(..., description="ISO8601 timestamp.")
    duration_ms: float = Field(default=0.0, description="Measured execution duration in milliseconds.")
    transport: str = Field(default="a2a", description="Transport medium: a2a, local, internal.")
    requestId: str = Field(..., description="Correlation ID matching the experiment run.")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Observable metadata payload.")
