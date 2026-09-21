"""Supervisor Orchestrator Agent implemented with Google ADK 2.0 and Offline AI provider.

The Supervisor synthesizes Fleet and Maintenance specialist findings into a
unified advisory recommendation submitted to the deterministic Safety Engine.

AI reasoning is powered by the local Offline AI provider. The specific model
or provider name is never exposed in the product UI, agents, or prompts.
"""

import os
import re
import time
import json
import uuid
import asyncio
import logging
import concurrent.futures
from typing import Any, Dict, List, Optional

from google.adk import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from schemas.findings import FleetAgentResponse, MaintenanceAgentResponse
from schemas.recommendations import SupervisorRecommendation
from tools.simulation_tools import simulation_state_tool, set_current_telemetry_context
from tools.scenario_tools import scenario_context_tool, set_current_scenario_id
from tools.knowledge_tools import query_local_knowledge
from providers.offline_provider import OfflineAIProvider
from providers.base import ProviderStatus

logger = logging.getLogger(__name__)

SUPERVISOR_SYSTEM_INSTRUCTION = (
    "You are the OrePulse Supervisor Agent in an educational mining simulation. "
    "Your responsibility is to orchestrate specialist evaluations (Fleet and Maintenance), "
    "synthesize their findings, and produce a unified educational recommendation. "
    "You may propose: NORMAL, WARNING, ESCALATE, or STOP_AND_INFORM_SUPERVISOR. "
    "CRITICAL GOVERNANCE RULE: You are NOT authoritative over the deterministic Safety Engine. "
    "Your output is a proposal submitted to the Safety Engine for validation. "
    "Do NOT issue live industrial commands or real mining instructions."
)


def _sanitize_error_message(err: Exception) -> str:
    """Sanitize error messages to ensure credentials are never exposed in logs."""
    msg = str(err)
    for env_var in ("GOOGLE_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENAI_API_KEY"):
        val = os.environ.get(env_var)
        if val and len(val) > 4:
            msg = msg.replace(val, "[REDACTED_API_KEY]")
    msg = re.sub(r'(?:api[_-]?key|token|bearer)[=:\s]+[A-Za-z0-9_\-\.]{8,}', '[REDACTED_SECRET]', msg, flags=re.IGNORECASE)
    return msg[:200]


def _build_supervisor_synthesis_prompt(
    scenario_id: str,
    telemetry: Dict[str, Any],
    fleet_result: FleetAgentResponse,
    maintenance_result: MaintenanceAgentResponse,
    knowledge_snippet: str = "",
) -> str:
    """Construct structured operational context for the Supervisor Offline AI prompt."""
    equipment = telemetry.get("equipment", {}) if isinstance(telemetry, dict) else {}
    ramp = telemetry.get("ramp", {}) if isinstance(telemetry, dict) else {}
    fleet = telemetry.get("fleet", {}) if isinstance(telemetry, dict) else {}

    fleet_summary = [
        f"- Status: {f.status}, Concerns: {', '.join(f.concerns) if f.concerns else 'None'}, "
        f"Signals: {', '.join(f.relevantSignals)}, Summary: {f.summary}"
        for f in fleet_result.findings
    ]
    maintenance_summary = [
        f"- Status: {f.status}, Concerns: {', '.join(f.concerns) if f.concerns else 'None'}, "
        f"Signals: {', '.join(f.relevantSignals)}, Summary: {f.summary}"
        for f in maintenance_result.findings
    ]

    knowledge_section = ""
    if knowledge_snippet:
        knowledge_section = f"\n### Relevant Domain Knowledge (Offline Knowledge Base):\n{knowledge_snippet[:600]}\n"

    return f"""You are the OrePulse Supervisor Agent synthesizing specialist findings in an educational mining simulation.
Your objective is to review structured telemetry and specialist analyses, then produce a concise, advisory operational recommendation for the deterministic Safety Engine.

### Operational Context:
- Scenario: {scenario_id}
- Depth: {telemetry.get('depth', 'N/A')} m | Ore Grade: {telemetry.get('oreGrade', 'N/A')}
- Equipment: Temp={equipment.get('temperature', 'N/A')}°C, Status={equipment.get('status', 'N/A')}
- Haul Ramp: Congestion={ramp.get('congestionLevel', 'N/A')}%, Status={ramp.get('status', 'N/A')}
- Fleet Availability: {fleet.get('availability', 'N/A')}%

### Specialist Fleet Findings:
{chr(10).join(fleet_summary) if fleet_summary else 'No fleet findings.'}
Fleet Specialist Recommendation: {fleet_result.recommendation.recommendation if fleet_result.recommendation else 'N/A'}

### Specialist Maintenance Findings:
{chr(10).join(maintenance_summary) if maintenance_summary else 'No maintenance findings.'}
Maintenance Specialist Recommendation: {maintenance_result.recommendation.recommendation if maintenance_result.recommendation else 'N/A'}
{knowledge_section}
### Task Instructions:
1. Synthesize these specialist findings into a single advisory recommendation.
2. Select one decision from: ["NORMAL", "WARNING", "ESCALATE", "STOP_AND_INFORM_SUPERVISOR"]
3. Select one proposedAction from: ["adjustDrillSpeed", "rerouteOre", "scheduleMaintenance", "halt"]
4. Provide a concise operational rationale in explanation (max 2-3 sentences).
5. List the contributingSignals that materially influenced this decision.
6. List agentsConsulted: ["fleet_agent", "maintenance_agent"].
7. Assign a confidence score between 0.0 and 1.0.
8. CRITICAL: Return ONLY a single valid JSON object. No prose, no markdown, no chain-of-thought.
9. Return ONLY this JSON structure:
{{
  "decision": "NORMAL | WARNING | ESCALATE | STOP_AND_INFORM_SUPERVISOR",
  "contributingSignals": ["string"],
  "agentsConsulted": ["fleet_agent", "maintenance_agent"],
  "explanation": "Concise operational synthesis",
  "proposedAction": "adjustDrillSpeed | rerouteOre | scheduleMaintenance | halt",
  "parameters": {{}},
  "confidence": 0.95
}}
"""


def _run_async_safely(coro: Any) -> Any:
    """Run an async coroutine safely, supporting both synchronous code and running loops."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(asyncio.run, coro).result()
    else:
        return asyncio.run(coro)


async def _invoke_offline_ai(
    provider: OfflineAIProvider,
    prompt: str,
) -> Optional[SupervisorRecommendation]:
    """Invoke the Offline AI provider and parse a structured SupervisorRecommendation."""
    from providers.base import ProviderResult
    result: ProviderResult = await provider.synthesize(prompt)

    if result.status not in (ProviderStatus.AVAILABLE,):
        logger.warning(
            "Offline AI synthesis failed: status=%s, error=%s",
            result.status.value,
            result.error or "unknown"
        )
        return None

    if not result.content:
        return None

    # Try to parse structured recommendation
    try:
        rec = SupervisorRecommendation.model_validate_json(result.content)
    except Exception:
        try:
            data = json.loads(result.content)
            rec = SupervisorRecommendation.model_validate(data)
        except Exception as parse_err:
            logger.warning("Offline AI output failed JSON validation: %s", parse_err)
            return None

    # Validate allowed values
    valid_decisions = {"NORMAL", "WARNING", "ESCALATE", "STOP_AND_INFORM_SUPERVISOR"}
    valid_actions = {"adjustDrillSpeed", "rerouteOre", "scheduleMaintenance", "halt"}
    if rec.decision not in valid_decisions or rec.proposedAction not in valid_actions:
        logger.warning(
            "Offline AI proposed invalid decision '%s' or action '%s'; rejecting.",
            rec.decision, rec.proposedAction
        )
        return None

    return rec


def create_supervisor_agent(model: str = "gemini-2.0-flash") -> Agent:
    """Create a Google ADK 2.0 Agent instance for supervisor orchestration (ADK graph only)."""
    return Agent(
        name="supervisor_agent",
        description="Coordinates Fleet and Maintenance specialists and synthesizes overall operational recommendation.",
        instruction=SUPERVISOR_SYSTEM_INSTRUCTION,
        model=model,
        tools=[simulation_state_tool, scenario_context_tool],
        output_schema=SupervisorRecommendation,
    )


class SupervisorAgent:
    """Supervisor Agent wrapper utilizing Offline AI provider via Google ADK 2.0.

    Primary path: OfflineAIProvider → structured JSON synthesis → SupervisorRecommendation.
    Fallback path: deterministic rule-based synthesis (always safe, always available).
    """

    def __init__(self, model: str = "gemini-2.0-flash"):
        self.model = model
        self.adk_agent = create_supervisor_agent(model=model)
        self._offline_provider = OfflineAIProvider()
        self.last_metadata: Dict[str, Any] = {
            "llmUsed": False,
            "llmProvider": None,
            "llmModel": None,
            "offlineAiStatus": "fallback",
            "toolsUsed": [],
            "offlineKnowledgeSnippet": None,
        }
        logger.info("SupervisorAgent initialized with Offline AI provider.")

    def intake_and_scope(self, scenario_id: str, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """Stage A — Intake & Scoping: establish analysis scope from scenario context."""
        set_current_telemetry_context(telemetry)
        set_current_scenario_id(scenario_id)
        return {
            "scenario_id": scenario_id,
            "supervisor_started": True,
            "relevant_specialists": ["fleet_agent", "maintenance_agent"],
            "scope_summary": f"Intake complete for scenario '{scenario_id}'. Dispatching parallel specialist analyses.",
        }

    def _deterministic_synthesize(
        self,
        telemetry: Dict[str, Any],
        fleet_result: FleetAgentResponse,
        maintenance_result: MaintenanceAgentResponse,
        scenario_id: str = "COMBINED_OPERATIONAL_RISK",
    ) -> SupervisorRecommendation:
        """Deterministic synthesis logic — verified fallback when Offline AI is unavailable."""
        fleet_critical = any(f.status == "CRITICAL" for f in fleet_result.findings)
        fleet_degraded = any(f.status == "DEGRADED" for f in fleet_result.findings)

        maint_critical = any(f.status == "CRITICAL" for f in maintenance_result.findings)
        maint_degraded = any(f.status == "DEGRADED" for f in maintenance_result.findings)

        contributing_signals: List[str] = []
        for f in fleet_result.findings:
            contributing_signals.extend(f.relevantSignals)
        for f in maintenance_result.findings:
            contributing_signals.extend(f.relevantSignals)
        contributing_signals = list(dict.fromkeys(contributing_signals))

        agents_consulted = ["fleet_agent", "maintenance_agent"]

        if maint_critical and fleet_critical:
            decision = "STOP_AND_INFORM_SUPERVISOR"
            proposed_action = "halt"
            explanation = (
                "Combined operational risk detected: haul truck thermal threshold breached while haul ramp "
                "is experiencing severe congestion. High congestion prevents rapid emergency retreat or staging. "
                "Supervisor intervention required to halt operations and clear haulway."
            )
            confidence = 0.98
        elif maint_critical:
            decision = "STOP_AND_INFORM_SUPERVISOR"
            proposed_action = "halt"
            explanation = (
                "Critical equipment anomaly: haul truck engine temperature exceeds safe operational ceiling. "
                "Immediate halt proposed for safety engine verification."
            )
            confidence = 0.95
        elif fleet_critical:
            decision = "WARNING"
            proposed_action = "rerouteOre"
            explanation = (
                "Severe ramp congestion observed. Specialist recommends throttling dispatch and rerouting "
                "haulage to secondary access ramps to avoid bottlenecking."
            )
            confidence = 0.90
        elif maint_degraded or fleet_degraded:
            decision = "WARNING"
            proposed_action = "scheduleMaintenance"
            explanation = (
                "Sub-critical operational degradation observed. Preventive maintenance and staging adjustments "
                "recommended before the next production shift."
            )
            confidence = 0.88
        else:
            decision = "NORMAL"
            proposed_action = "adjustDrillSpeed"
            explanation = (
                "Nominal operating parameters verified across all monitored telemetry. Standard production "
                "operations may continue under normal automated supervision."
            )
            confidence = 0.97

        return SupervisorRecommendation(
            decision=decision,
            contributingSignals=contributing_signals,
            agentsConsulted=agents_consulted,
            explanation=explanation,
            proposedAction=proposed_action,
            parameters={"targetSpeed": 1.0} if proposed_action == "adjustDrillSpeed" else {},
            confidence=confidence,
            llmUsed=False,
            llmProvider=None,
            llmModel=None,
        )

    def synthesize(
        self,
        telemetry: Dict[str, Any],
        fleet_result: FleetAgentResponse,
        maintenance_result: MaintenanceAgentResponse,
        scenario_id: str = "COMBINED_OPERATIONAL_RISK",
    ) -> SupervisorRecommendation:
        """Synthesize specialist findings using Offline AI with deterministic fallback.

        Execution flow:
        1. Query local knowledge base for relevant domain context.
        2. Probe Offline AI provider health.
        3. If available: synthesize via Offline AI with knowledge-enriched prompt.
        4. If unavailable/timeout/invalid: fall back to deterministic synthesis.
        5. Record provider status and tools used in last_metadata.
        """
        set_current_telemetry_context(telemetry)
        set_current_scenario_id(scenario_id)

        tools_used: List[str] = []
        knowledge_snippet: Optional[str] = None
        start_time = time.time()

        # Step 1: Query local knowledge base (always offline, always available)
        equipment = telemetry.get("equipment", {}) if isinstance(telemetry, dict) else {}
        ramp = telemetry.get("ramp", {}) if isinstance(telemetry, dict) else {}
        temp = equipment.get("temperature", 85.0)
        congestion = ramp.get("congestionLevel", 25.0)

        kb_query = f"engine temperature {temp}°C ramp congestion {congestion}% mining haul truck safety threshold"
        kb_result = query_local_knowledge(kb_query)
        if kb_result.get("status") == "ok":
            knowledge_snippet = kb_result.get("snippet", "")
            tools_used.append("query_local_knowledge")
            logger.info("Local knowledge retrieved for synthesis (query=%s).", kb_query[:60])

        # Step 2: Check Offline AI health
        provider_status = self._offline_provider.health_check()
        logger.info("Offline AI health check: %s", provider_status.value)

        if provider_status == ProviderStatus.AVAILABLE:
            # Step 3: Attempt Offline AI synthesis
            prompt = _build_supervisor_synthesis_prompt(
                scenario_id, telemetry, fleet_result, maintenance_result,
                knowledge_snippet=knowledge_snippet or ""
            )
            tools_used.append("get_simulation_state")

            try:
                rec = _run_async_safely(_invoke_offline_ai(self._offline_provider, prompt))
                if rec is not None:
                    duration_ms = (time.time() - start_time) * 1000.0
                    logger.info(
                        "Offline AI synthesis succeeded: decision=%s, confidence=%.2f, latency_ms=%.2f",
                        rec.decision, rec.confidence, duration_ms
                    )
                    self.last_metadata = {
                        "llmUsed": True,
                        "llmProvider": "offline",
                        "llmModel": "offline-ai",
                        "offlineAiStatus": "active",
                        "toolsUsed": tools_used,
                        "offlineKnowledgeSnippet": knowledge_snippet[:200] if knowledge_snippet else None,
                    }
                    rec.llmUsed = True
                    rec.llmProvider = "offline"
                    rec.llmModel = "offline-ai"
                    return rec
                else:
                    logger.warning("Offline AI returned invalid output; falling back to deterministic synthesis.")
                    offline_ai_status = "invalid_output"
            except Exception as err:
                sanitized = _sanitize_error_message(err)
                logger.warning("Offline AI synthesis error: %s; falling back to deterministic synthesis.", sanitized)
                offline_ai_status = "unavailable"
        else:
            offline_ai_status = provider_status.value

        # Step 4: Deterministic fallback
        self.last_metadata = {
            "llmUsed": False,
            "llmProvider": None,
            "llmModel": None,
            "offlineAiStatus": offline_ai_status,
            "toolsUsed": tools_used,
            "offlineKnowledgeSnippet": knowledge_snippet[:200] if knowledge_snippet else None,
        }
        rec = self._deterministic_synthesize(telemetry, fleet_result, maintenance_result, scenario_id)
        rec.llmUsed = False
        rec.llmProvider = None
        rec.llmModel = None
        return rec


def run_supervisor_agent(context: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience entry point for single-agent evaluation."""
    agent = SupervisorAgent()
    telemetry = context.get("telemetry", context)
    fleet_resp = FleetAgentResponse(**context.get("fleet_result", {})) if "fleet_result" in context else FleetAgentResponse()
    maint_resp = MaintenanceAgentResponse(**context.get("maintenance_result", {})) if "maintenance_result" in context else MaintenanceAgentResponse()
    scenario_id = context.get("scenario_id", "COMBINED_OPERATIONAL_RISK")
    rec = agent.synthesize(telemetry, fleet_resp, maint_resp, scenario_id)
    return getattr(rec, "model_dump", rec.dict)()
