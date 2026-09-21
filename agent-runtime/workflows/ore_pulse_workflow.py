"""OrePulse Multi-Agent Workflow implemented with Google ADK 2.0 graph orchestration
and A2A (Agent2Agent) protocol-based specialist communication.
"""

import time
import logging
import uuid
from typing import Dict, Any, List
from google.adk.agents import ParallelAgent, SequentialAgent
from agents.fleet import FleetAgent, create_fleet_agent
from agents.maintenance import MaintenanceAgent, create_maintenance_agent
from agents.supervisor import SupervisorAgent, create_supervisor_agent
from agents.learning import LearningAgent, create_learning_agent
from schemas.findings import FleetAgentResponse, MaintenanceAgentResponse
from schemas.recommendations import SupervisorRecommendation
from schemas.learning import LearningExplanation
from schemas.a2a_messages import (
    FleetAnalysisRequest,
    MaintenanceAnalysisRequest,
    A2ATraceEvent,
)
from tools.simulation_tools import set_current_telemetry_context
from tools.scenario_tools import set_current_scenario_id
from a2a_protocol.transport import A2ATransport, A2ACommunicationError

logger = logging.getLogger(__name__)


def build_adk_specialist_parallel_agent(model: str = "gemini-3.6-flash") -> ParallelAgent:
    """Build a Google ADK ParallelAgent executing Fleet and Maintenance specialists in parallel."""
    fleet = create_fleet_agent(model=model)
    maintenance = create_maintenance_agent(model=model)
    return ParallelAgent(
        name="specialists_parallel_agent",
        description="Executes specialist domain evaluations (Fleet & Maintenance) concurrently.",
        sub_agents=[fleet, maintenance],
    )


class OrePulseWorkflow:
    """End-to-end multi-agent workflow for the OrePulse educational simulation.

    Orchestrates:
    1. Scenario Context & Intake (Supervisor)
    2. Parallel A2A Specialist Analysis (Fleet Agent + Maintenance Agent)
    3. Supervisor Synthesis (Structured Recommendation)
    4. Deterministic Safety Evaluation (Authoritative Constraint Boundary)
    5. Learning Reflection (Learning Agent)

    A2A protocol is used for communication between the Supervisor and specialist agents,
    enabling interoperable message exchange with structured AgentCards and JSON-RPC 2.0 envelopes.
    """

    def __init__(self, model: str = "gemini-3.6-flash"):
        self.model = model
        self.supervisor = SupervisorAgent(model=model)
        self.fleet = FleetAgent(model=model)
        self.maintenance = MaintenanceAgent(model=model)
        self.learning = LearningAgent(model=model)
        self.parallel_specialists = build_adk_specialist_parallel_agent(model=model)
        self.a2a_transport = A2ATransport(timeout_seconds=10.0)
        logger.info("OrePulseWorkflow initialized with Google ADK 2.0 agents and A2A transport.")

    def run(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the full agent workflow via A2A protocol with fallback.

        Args:
            payload: Simulation payload containing telemetry, scenarioId, and state.

        Returns:
            Dictionary strictly adhering to AgentExecutionTrace, including A2A event log.
        """
        start_time = time.time()
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start_time))
        scenario_id = payload.get("scenarioId", "COMBINED_OPERATIONAL_RISK")
        experiment_id = payload.get("experimentId") or payload.get("experiment_id") or f"exp-{uuid.uuid4().hex[:12]}"
        set_current_scenario_id(scenario_id)

        # 1. Extract telemetry context
        telemetry = payload.get("telemetry", payload)
        set_current_telemetry_context(telemetry)

        run_id = f"adk-trace-{int(start_time * 1000)}"
        trace_events: List[Dict[str, Any]] = []
        execution_mode = "a2a_adk"

        # 2. Stage 1: Supervisor Intake & Scoping
        intake_scope = self.supervisor.intake_and_scope(scenario_id, telemetry)
        supervisor_started = True
        agents_invoked = ["supervisor_agent"]

        # Record intake event
        trace_events.append(A2ATraceEvent(
            agent="supervisor_agent",
            event="SUPERVISOR_INTAKE_COMPLETE",
            status="SUCCESS",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            duration_ms=round((time.time() - start_time) * 1000, 2),
            transport="internal",
            requestId=experiment_id,
            details={"scenarioId": scenario_id, "experimentId": experiment_id},
        ).model_dump())

        # 3. Stage 2: Parallel Specialist Analysis via A2A
        dispatch_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        fleet_request = FleetAnalysisRequest(
            experiment_id=experiment_id,
            scenario_id=scenario_id,
            timestamp=dispatch_time,
            telemetry=telemetry,
        )
        maint_request = MaintenanceAnalysisRequest(
            experiment_id=experiment_id,
            scenario_id=scenario_id,
            timestamp=dispatch_time,
            telemetry=telemetry,
        )

        agents_invoked.extend(["fleet_agent", "maintenance_agent"])
        fleet_result_native: FleetAgentResponse
        maintenance_result_native: MaintenanceAgentResponse

        try:
            # Parallel A2A dispatch: Supervisor → Fleet and Supervisor → Maintenance
            fleet_a2a_resp, maint_a2a_resp, a2a_events = self.a2a_transport.dispatch_specialists_parallel(
                fleet_request=fleet_request,
                maint_request=maint_request,
                fleet_agent_handler=self.fleet,
                maint_agent_handler=self.maintenance,
            )

            # Record all A2A events in trace
            for ev in a2a_events:
                trace_events.append(ev.model_dump())

            # Convert A2A responses to internal schema
            fleet_result_native = FleetAgentResponse(
                findings=fleet_a2a_resp.findings,
                recommendation=fleet_a2a_resp.recommendation,
                agent_id=fleet_a2a_resp.agent_id,
                version="2.0.0-a2a",
            )
            maintenance_result_native = MaintenanceAgentResponse(
                findings=maint_a2a_resp.findings,
                recommendation=maint_a2a_resp.recommendation,
                agent_id=maint_a2a_resp.agent_id,
                version="2.0.0-a2a",
            )

        except A2ACommunicationError as a2a_err:
            logger.warning("A2A communication error: %s. Falling back to direct evaluation.", a2a_err)
            execution_mode = "deterministic_fallback"

            # Record fallback event
            trace_events.append(A2ATraceEvent(
                agent=a2a_err.agent,
                event="A2A_FALLBACK_ACTIVATED",
                status="ERROR",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=0.0,
                transport="a2a",
                requestId=experiment_id,
                details={"error": str(a2a_err), "fallback": "direct_evaluation"},
            ).model_dump())

            fleet_result_native = self.fleet.evaluate(telemetry)
            maintenance_result_native = self.maintenance.evaluate(telemetry)

        agent_results = {
            "fleet": getattr(fleet_result_native, "model_dump", fleet_result_native.dict)(),
            "maintenance": getattr(maintenance_result_native, "model_dump", maintenance_result_native.dict)(),
        }

        # 4. Stage 3: Supervisor Synthesis
        synth_start = time.time()
        supervisor_rec: SupervisorRecommendation = self.supervisor.synthesize(
            telemetry=telemetry,
            fleet_result=fleet_result_native,
            maintenance_result=maintenance_result_native,
            scenario_id=scenario_id,
        )
        proposed_decision = getattr(supervisor_rec, "model_dump", supervisor_rec.dict)()

        # Extract LLM + Offline AI metadata
        llm_meta = getattr(self.supervisor, "last_metadata", {})
        llm_used = bool(llm_meta.get("llmUsed", False))
        llm_provider = llm_meta.get("llmProvider")
        llm_model = llm_meta.get("llmModel")
        offline_ai_status = llm_meta.get("offlineAiStatus", "fallback")
        tools_used = llm_meta.get("toolsUsed", [])
        offline_knowledge_snippet = llm_meta.get("offlineKnowledgeSnippet")
        synth_duration = round((time.time() - synth_start) * 1000, 2)

        if llm_used:
            trace_events.append(A2ATraceEvent(
                agent="supervisor_agent",
                event="OFFLINE_AI_SYNTHESIS_COMPLETE",
                status="SUCCESS",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=synth_duration,
                transport="offline_ai",
                requestId=experiment_id,
                details={
                    "proposedDecision": supervisor_rec.decision,
                    "confidence": supervisor_rec.confidence,
                    "llmUsed": True,
                    "llmProvider": llm_provider,
                    "llmModel": llm_model,
                    "offlineAiStatus": offline_ai_status,
                    "toolsUsed": tools_used,
                },
            ).model_dump())
        else:
            trace_events.append(A2ATraceEvent(
                agent="supervisor_agent",
                event="SUPERVISOR_SYNTHESIS_COMPLETE",
                status="SUCCESS",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=synth_duration,
                transport="internal",
                requestId=experiment_id,
                details={
                    "proposedDecision": supervisor_rec.decision,
                    "confidence": supervisor_rec.confidence,
                    "llmUsed": False,
                    "offlineAiStatus": offline_ai_status,
                    "fallback": "deterministic_synthesis",
                },
            ).model_dump())

        # 5. Stage 4: Deterministic Safety Engine Boundary
        agents_invoked.append("safety_engine")
        safety_eval = self._evaluate_safety_boundary(telemetry, supervisor_rec)

        final_decision = {
            "decision": safety_eval["status"],
            "action": supervisor_rec.proposedAction if safety_eval["status"] == "ALLOW" else "halt",
            "enforcedRules": safety_eval["triggeredRules"],
        }
        human_oversight_required = safety_eval["humanOversightRequired"]
        is_overridden = proposed_decision.get("decision") != final_decision["decision"]

        trace_events.append(A2ATraceEvent(
            agent="safety_engine",
            event="SAFETY_ENGINE_EVALUATION_COMPLETE",
            status="SUCCESS",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            duration_ms=0.0,
            transport="internal",
            requestId=experiment_id,
            details={
                "decision": safety_eval["status"],
                "triggeredRules": safety_eval["triggeredRules"],
                "humanOversightRequired": human_oversight_required,
                "isOverridden": is_overridden,
            },
        ).model_dump())

        # 6. Stage 5: Learning Agent Reflection
        agents_invoked.append("learning_agent")
        learning_context = {
            "finalDecision": final_decision,
            "safetyEvaluation": safety_eval,
            "proposedDecision": proposed_decision,
            "importantSignals": supervisor_rec.contributingSignals,
            "agentsInvolved": agents_invoked,
        }
        learning_explanation: LearningExplanation = self.learning.explain(learning_context)
        learning_dict = getattr(learning_explanation, "model_dump", learning_explanation.dict)()

        trace_events.append(A2ATraceEvent(
            agent="learning_agent",
            event="LEARNING_AGENT_REFLECTION_COMPLETE",
            status="SUCCESS",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            duration_ms=0.0,
            transport="internal",
            requestId=experiment_id,
        ).model_dump())

        # Assemble full AgentExecutionTrace
        trace = {
            "executionId": run_id,
            "experimentId": experiment_id,
            "timestamp": timestamp,
            "inputSummary": f"Google ADK 2.0 + A2A multi-agent evaluation for scenario '{scenario_id}'",
            "executionMode": execution_mode,
            "llmUsed": llm_used,
            "llmProvider": llm_provider,
            "llmModel": llm_model,
            "offlineAiStatus": offline_ai_status,
            "toolsUsed": tools_used,
            "offlineKnowledgeSnippet": offline_knowledge_snippet,
            "supervisorStarted": supervisor_started,
            "intakeScope": intake_scope,
            "agentsInvoked": agents_invoked,
            "agentResults": agent_results,
            "proposedDecision": proposed_decision,
            "safetyEvaluation": safety_eval,
            "finalDecision": final_decision,
            "humanOversightRequired": human_oversight_required,
            "isOverridden": is_overridden,
            "learningExplanation": learning_dict,
            "events": trace_events,
        }

        return trace

    def _evaluate_safety_boundary(
        self,
        telemetry: Dict[str, Any],
        recommendation: SupervisorRecommendation
    ) -> Dict[str, Any]:
        """Deterministic safety evaluation mirroring authoritative safety constraints."""
        equipment = telemetry.get("equipment", {}) if isinstance(telemetry, dict) else {}
        ramp = telemetry.get("ramp", {}) if isinstance(telemetry, dict) else {}
        alert = equipment.get("alert") or {}

        temp = equipment.get("temperature", 85.0)
        congestion = ramp.get("congestionLevel", 25.0)
        alert_sev = alert.get("severity", "none").lower()

        # Check raw telemetry sensor values
        if "telemetry" in telemetry and isinstance(telemetry["telemetry"], list):
            for s in telemetry["telemetry"]:
                sid = s.get("sensorId", "").lower()
                if "temp" in sid:
                    temp = s.get("value", temp)
                elif "congestion" in sid:
                    congestion = s.get("value", congestion)

        triggered_rules: List[str] = []
        status = "ALLOW"
        explanation = "Recommendation passes all deterministic safety bounds."
        human_oversight = False

        # Rule 1: Critical Equipment Anomaly (Overheating or High Alert)
        if temp > 100.0 or alert_sev == "high":
            triggered_rules.append("criticalEquipmentAnomaly")
            status = "STOP_AND_INFORM_SUPERVISOR"
            explanation = (
                f"Equipment temperature ({temp}°C) exceeds safe limits; immediate supervisor intervention required."
            )
            human_oversight = True

        # Rule 2: High Ramp Congestion & Truck Overheat (Compounding Risk)
        if congestion > 60.0 and temp > 100.0:
            triggered_rules.append("combinedOperationalRisk")
            status = "STOP_AND_INFORM_SUPERVISOR"
            explanation = (
                f"Combined operational risk: severe ramp congestion ({congestion}%) and engine overheat ({temp}°C). "
                "Immediate halt mandated to clear haulway."
            )
            human_oversight = True

        # Rule 3: Conflicting / Prohibited actions
        if recommendation.proposedAction == "halt" and temp <= 90.0 and alert_sev == "none" and congestion < 40.0:
            triggered_rules.append("prohibitedInstruction")
            status = "CONSTRAIN"
            explanation = "Halting during nominal conditions is constrained without operational justification."

        return {
            "status": status,
            "decision": status,
            "triggeredRules": triggered_rules,
            "rationale": explanation,
            "explanation": explanation,
            "humanOversightRequired": human_oversight,
            "educationalNotice": "Deterministic safety rules govern simulated responses without LLM interference.",
        }
