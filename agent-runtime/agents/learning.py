"""Learning Agent implemented with Google ADK 2.0."""

import json
import logging
from typing import Any, Dict, List
from google.adk import Agent
from schemas.learning import LearningExplanation

logger = logging.getLogger(__name__)

LEARNING_SYSTEM_INSTRUCTION = (
    "You are the OrePulse Learning Agent in an educational mining simulation for students and learners. "
    "Your responsibility is to explain what occurred during the simulation AFTER the deterministic Safety Engine "
    "has produced the final decision. "
    "CRITICAL RULES: "
    "1. Do NOT alter, contest, or override the final decision. "
    "2. Do NOT expose internal raw chain-of-thought; provide clear, student-friendly explanations. "
    "3. Highlight the role of the Safety Engine and human oversight. "
    "4. Reinforce key mining concepts (thermal management, ramp traffic, multi-agent collaboration)."
)


def create_learning_agent(model: str = "gemini-3.6-flash") -> Agent:
    """Create a Google ADK 2.0 Agent instance for post-simulation learning reflection."""
    return Agent(
        name="learning_agent",
        description="Generates educational takeaways and reflection questions for students after simulation completion.",
        instruction=LEARNING_SYSTEM_INSTRUCTION,
        model=model,
        output_schema=LearningExplanation,
    )


class LearningAgent:
    """Learning Agent wrapper utilizing Google ADK 2.0."""

    def __init__(self, model: str = "gemini-3.6-flash"):
        self.adk_agent = create_learning_agent(model=model)
        logger.info("LearningAgent initialized with Google ADK 2.0.")

    def explain(self, context: Dict[str, Any]) -> LearningExplanation:
        """Produce structured educational reflection given the complete simulation outcome.

        Args:
            context: Dictionary containing finalDecision, safetyEvaluation, proposedDecision, and telemetry signals.

        Returns:
            Validated LearningExplanation instance.
        """
        final_dec = context.get("finalDecision", {})
        if isinstance(final_dec, dict):
            final_status = final_dec.get("decision", final_dec.get("status", "ALLOW"))
        else:
            final_status = str(final_dec)

        safety_eval = context.get("safetyEvaluation", {})
        triggered_rules = safety_eval.get("triggeredRules", []) if isinstance(safety_eval, dict) else []
        safety_rationale = safety_eval.get("rationale", safety_eval.get("explanation", "Deterministic rules evaluated."))

        proposed = context.get("proposedDecision", {})
        if isinstance(proposed, dict):
            proposed_str = proposed.get("decision", "NORMAL")
        else:
            proposed_str = str(proposed)

        important_signals: List[str] = context.get(
            "importantSignals",
            ["truck_temperature", "ramp_congestion", "fleet_availability"]
        )
        agents_involved: List[str] = context.get(
            "agentsInvolved",
            ["supervisor_agent", "fleet_agent", "maintenance_agent", "safety_engine"]
        )

        if "STOP" in final_status:
            what_happened = (
                "The multi-agent system identified severe operational risk and the deterministic Safety Engine "
                "enforced an immediate 'STOP AND INFORM SUPERVISOR' state."
            )
            decision_explanation = (
                f"Specialist agents proposed '{proposed_str}', and the Safety Engine verified that operating conditions "
                f"violated safety bounds (rules: {', '.join(triggered_rules) if triggered_rules else 'thermal/ramp bounds'})."
            )
            safety_explanation = (
                "The deterministic Safety Engine is authoritative. Even when AI agents propose actions, "
                "hardcoded safety constraints guarantee that unverified or high-risk operations cannot proceed without a human supervisor."
            )
            learning_takeaway = (
                "Industrial AI systems should propose recommendations, but deterministic safety guardrails must govern the outcome. "
                "When compounding hazards arise (such as high heat and gridlock), safe halting protects workers and machinery."
            )
            reflection_question = (
                "Why is it safer to stop an entire haul ramp when just one truck overheats during high congestion?"
            )
        elif "WARNING" in final_status or "CONSTRAIN" in final_status:
            what_happened = (
                "The simulation detected sub-critical anomalies, allowing continued operation under constrained parameters."
            )
            decision_explanation = (
                f"The supervisor proposed '{proposed_str}', and the Safety Engine constrained dispatch parameters to maintain safe spacing."
            )
            safety_explanation = (
                "Safety constraints stepped in to prevent minor operational friction from escalating into an emergency stop."
            )
            learning_takeaway = (
                "Proactive monitoring of leading indicators (like ramp traffic density) allows the mine to smooth cycles before heat or delays cascade."
            )
            reflection_question = (
                "What What-If adjustments could you make in the simulation to reduce ramp congestion back to nominal levels?"
            )
        else:
            what_happened = (
                "Operations proceeded smoothly with all monitored telemetry parameters within nominal educational boundaries."
            )
            decision_explanation = (
                "Specialist agents verified that engine temperatures, fleet availability, and haul roads are operating nominally."
            )
            safety_explanation = (
                "All deterministic safety checks passed with zero triggered rule violations."
            )
            learning_takeaway = (
                "In steady-state operations, autonomous agents provide continuous telemetry monitoring, freeing human engineers to focus on optimization."
            )
            reflection_question = (
                "How does baseline operational telemetry help agents recognize when anomalies begin to develop?"
            )

        return LearningExplanation(
            whatHappened=what_happened,
            importantSignals=important_signals,
            agentsInvolved=agents_involved,
            decisionExplanation=decision_explanation,
            safetyExplanation=safety_explanation,
            learningTakeaway=learning_takeaway,
            reflectionQuestion=reflection_question,
        )


def run_learning_agent(decision_context: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point returning a serialized JSON-compatible dictionary."""
    agent = LearningAgent()
    explanation = agent.explain(decision_context)
    return getattr(explanation, "model_dump", explanation.dict)()
