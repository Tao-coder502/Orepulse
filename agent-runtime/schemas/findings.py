"""Structured schemas for agent findings in Google ADK 2.0 runtime."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AgentFinding(BaseModel):
    """Detailed observation produced by a specialist agent."""
    agent: str = Field(..., description="Name of the agent reporting the finding.")
    status: str = Field(..., description="Operational status: e.g., NOMINAL, DEGRADED, CRITICAL.")
    relevantSignals: List[str] = Field(default_factory=list, description="Telemetry signals that triggered this finding.")
    concerns: List[str] = Field(default_factory=list, description="Specific operational or educational concerns.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0 and 1.")
    summary: str = Field(..., description="Concise educational summary of the finding.")


class AgentRecommendation(BaseModel):
    """Action recommendation proposed by an agent."""
    recommendation: str = Field(..., description="Suggested simulated action.")
    rationale: str = Field(..., description="Educational explanation for the recommendation.")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters associated with the action.")


class FleetAgentResponse(BaseModel):
    """Complete structured response from the Fleet Specialist Agent."""
    findings: List[AgentFinding] = Field(default_factory=list, description="List of fleet findings.")
    recommendation: Optional[AgentRecommendation] = Field(None, description="Proposed fleet action.")
    agent_id: str = Field(default="fleet_agent", description="Identifier of the fleet agent.")
    version: str = Field(default="2.0.0", description="ADK schema version.")


class MaintenanceAgentResponse(BaseModel):
    """Complete structured response from the Maintenance Specialist Agent."""
    findings: List[AgentFinding] = Field(default_factory=list, description="List of maintenance findings.")
    recommendation: Optional[AgentRecommendation] = Field(None, description="Proposed maintenance action.")
    agent_id: str = Field(default="maintenance_agent", description="Identifier of the maintenance agent.")
    version: str = Field(default="2.0.0", description="ADK schema version.")
