"""Structured schemas for the Learning Agent in Google ADK 2.0 runtime."""

from typing import List, Union
from pydantic import BaseModel, Field


class LearningExplanation(BaseModel):
    """Educational takeaway and reflection explanation produced after final decision."""
    whatHappened: str = Field(
        ...,
        description="Clear narrative explanation of what occurred during the simulation."
    )
    importantSignals: List[str] = Field(
        default_factory=list,
        description="Key telemetry sensors or parameters that influenced the evaluation."
    )
    agentsInvolved: List[str] = Field(
        default_factory=list,
        description="List of specialist and orchestrator agents involved."
    )
    decisionExplanation: str = Field(
        ...,
        description="Explanation of why the final simulated decision was reached."
    )
    safetyExplanation: str = Field(
        ...,
        description="How the deterministic Safety Engine verified or constrained the outcome."
    )
    learningTakeaway: str = Field(
        ...,
        description="Core educational concept for the learner to remember."
    )
    reflectionQuestion: str = Field(
        ...,
        description="Inquiry question prompting the learner to think critically about system boundaries."
    )
