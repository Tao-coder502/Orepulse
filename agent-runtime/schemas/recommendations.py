"""Structured schemas for supervisor recommendations in Google ADK 2.0 runtime."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SupervisorRecommendation(BaseModel):
    """Synthesized recommendation produced by the Supervisor Agent."""
    decision: str = Field(
        ...,
        description="Proposed high-level decision: NORMAL, WARNING, ESCALATE, or STOP_AND_INFORM_SUPERVISOR."
    )
    contributingSignals: List[str] = Field(
        default_factory=list,
        description="Key telemetry signals driving this recommendation."
    )
    agentsConsulted: List[str] = Field(
        default_factory=list,
        description="Specialist agents consulted during orchestration."
    )
    explanation: str = Field(
        ...,
        description="Human-readable synthesis explaining why this recommendation is proposed."
    )
    proposedAction: str = Field(
        default="halt",
        description="Simulated action passed to safety engine: adjustDrillSpeed, rerouteOre, scheduleMaintenance, halt."
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Action parameters passed to the deterministic safety engine."
    )
    confidence: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Confidence level of the recommendation."
    )
    llmUsed: Optional[bool] = Field(
        default=None,
        description="Whether an actual LLM was used to generate this recommendation."
    )
    llmProvider: Optional[str] = Field(
        default=None,
        description="Provider of the LLM if used."
    )
    llmModel: Optional[str] = Field(
        default=None,
        description="Model identifier of the LLM if used."
    )

