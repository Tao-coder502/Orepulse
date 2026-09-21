"""Runtime execution engine and session management for OrePulse AI."""

import logging
import time
from typing import Any, Dict

from google.adk.sessions import InMemorySessionService
from workflows.ore_pulse_workflow import OrePulseWorkflow

logger = logging.getLogger(__name__)


class AdkRuntimeRunner:
    """
    Executes the OrePulse ADK workflow.

    Python/ADK produces agent proposals.
    TypeScript safety.ts remains the authoritative safety decision-maker.
    """

    def __init__(self, model: str = "gemma4:latest"):
        self.model = model
        self.session_service = InMemorySessionService()
        self.workflow = OrePulseWorkflow(model=model)

        logger.info(
            "AdkRuntimeRunner initialized with model=%s",
            self.model,
        )

    def run_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the OrePulse ADK workflow.

        The payload must be the canonical MineState object supplied
        by TypeScript. Do not invent or reinterpret telemetry values.
        """

        if not isinstance(payload, dict):
            raise TypeError("OrePulse runtime payload must be a dictionary.")

        try:
            trace = self.workflow.run(payload)

            if not isinstance(trace, dict):
                raise TypeError(
                    "OrePulse workflow returned a non-dictionary trace."
                )

            if "executionMode" not in trace:
                trace["executionMode"] = "adk"

            # Explicitly identify the Python result as advisory.
            trace["decisionAuthority"] = "typescript_safety_engine"
            trace["agentRole"] = "proposal_only"

            return trace

        except Exception as err:
            logger.exception(
                "ADK workflow execution failed. "
                "Returning controlled proposal fallback."
            )

            return self._build_controlled_fallback(
                payload=payload,
                error_msg=str(err),
            )

    def _build_controlled_fallback(
        self,
        payload: Dict[str, Any],
        error_msg: str,
    ) -> Dict[str, Any]:
        """
        Produce a deterministic fallback proposal.

        IMPORTANT:
        This fallback must NOT make an authoritative safety decision.

        TypeScript safety.ts must independently evaluate the canonical
        MineState.

        Do not invent telemetry defaults.
        """

        scenario_id = payload.get(
            "scenarioId",
            "UNKNOWN_SCENARIO",
        )

        now = time.strftime(
            "%Y-%m-%dT%H:%M:%SZ",
            time.gmtime(),
        )

        return {
            "executionId": f"adk-fallback-{int(time.time() * 1000)}",
            "timestamp": now,
            "inputSummary": (
                f"ADK execution failed for scenario '{scenario_id}'. "
                "Returning proposal-only fallback."
            ),
            "executionMode": "deterministic_fallback",
            "llmUsed": False,
            "llmProvider": None,
            "llmModel": None,
            "offlineAiStatus": "fallback",
            "toolsUsed": [],
            "offlineKnowledgeSnippet": None,

            "supervisorStarted": False,
            "agentsInvoked": [],

            "agentResults": {
                "fleet": {
                    "findings": [],
                    "recommendation": {
                        "recommendation": "Unable to evaluate telemetry",
                        "rationale": "ADK workflow unavailable.",
                    },
                    "agent_id": "fleet_agent",
                    "version": "2.0.0-fallback",
                },
                "maintenance": {
                    "findings": [],
                    "recommendation": {
                        "recommendation": "Unable to evaluate telemetry",
                        "rationale": "ADK workflow unavailable.",
                    },
                    "agent_id": "maintenance_agent",
                    "version": "2.0.0-fallback",
                },
            },

            "proposedDecision": {
                "decision": "DEFER_TO_SAFETY_ENGINE",
                "contributingSignals": [],
                "agentsConsulted": [],
                "explanation": (
                    "Offline AI execution failed. "
                    "The TypeScript safety engine must evaluate "
                    "the canonical MineState directly."
                ),
                "proposedAction": "defer",
                "confidence": 0.0,
            },

            "safetyEvaluation": {
                "status": "DEFERRED",
                "decision": "DEFER_TO_TYPESCRIPT_SAFETY_ENGINE",
                "triggeredRules": [],
                "rationale": (
                    "Python runtime is not authoritative for safety."
                ),
                "humanOversightRequired": True,
                "educationalNotice": (
                    "Offline AI execution was unavailable. "
                    "The deterministic TypeScript safety engine "
                    "retains authority."
                ),
            },

            "finalDecision": {
                "decision": "DEFER_TO_TYPESCRIPT_SAFETY_ENGINE",
                "action": "defer",
            },

            "humanOversightRequired": True,

            "decisionAuthority": "typescript_safety_engine",
            "agentRole": "proposal_only",

            "learningExplanation": {
                "whatHappened": (
                    "The AI agent runtime was unavailable, so the system "
                    "returned a controlled proposal-only fallback."
                ),
                "importantSignals": [],
                "agentsInvolved": [],
                "decisionExplanation": (
                    "The Python runtime does not make the authoritative "
                    "safety decision."
                ),
                "safetyExplanation": (
                    "The deterministic TypeScript safety engine evaluates "
                    "the canonical MineState independently."
                ),
                "learningTakeaway": (
                    "Safety-critical decisions remain deterministic even "
                    "when AI inference is unavailable."
                ),
                "reflectionQuestion": (
                    "Why should a safety engine remain independent of "
                    "AI model availability?"
                ),
            },

            "runtimeError": error_msg,
        }
