"""Tests for Supervisor LLM activation via Google ADK Runner.

Mocking strategy:
  Patch `agents.supervisor._invoke_adk_runner` — the stable internal async
  coroutine boundary between SupervisorAgent and the ADK Runner.
  This is cleaner than patching deep google.genai internals.

Tests A–F:
  A – Real ADK execution boundary
  B – Structured output validation / fallback on malformed response
  C – Missing API key → deterministic fallback, llmUsed=False
  D – Runtime ADK failure → deterministic fallback, llmUsed=False
  E – Safety Engine authority: LLM says NORMAL, safety says STOP → STOP wins
  F – Credential security: fake key never leaks into logs/trace/recommendation
"""

import sys
import os
import json
import logging
import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock

runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from agents.supervisor import (
    SupervisorAgent,
    create_supervisor_agent,
    _get_api_key,
    _sanitize_error_message,
    _build_supervisor_synthesis_prompt,
    _invoke_adk_runner,
)
from schemas.recommendations import SupervisorRecommendation
from schemas.findings import FleetAgentResponse, MaintenanceAgentResponse, AgentFinding, AgentRecommendation
from workflows.ore_pulse_workflow import OrePulseWorkflow


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

NOMINAL_TELEMETRY = {
    "depth": 200,
    "oreGrade": 1.2,
    "equipment": {"temperature": 80.0, "status": "operational"},
    "ramp": {"congestionLevel": 20.0, "status": "open"},
    "fleet": {"availability": 95.0},
}

UNSAFE_TELEMETRY = {
    "depth": 350,
    "oreGrade": 1.4,
    "equipment": {"temperature": 115.0, "status": "degraded"},
    "ramp": {"congestionLevel": 75.0, "status": "open"},
    "fleet": {"availability": 60.0},
}

NOMINAL_FLEET = FleetAgentResponse(
    findings=[AgentFinding(
        agent="fleet_agent", status="NOMINAL",
        relevantSignals=["ramp_congestion_percent"],
        concerns=[], confidence=0.95, summary="Ramp clear"
    )],
    recommendation=AgentRecommendation(
        recommendation="Maintain standard dispatch",
        rationale="All nominal"
    )
)
NOMINAL_MAINT = MaintenanceAgentResponse(
    findings=[AgentFinding(
        agent="maintenance_agent", status="NOMINAL",
        relevantSignals=["truck_temperature_celsius"],
        concerns=[], confidence=0.95, summary="Engine nominal"
    )],
    recommendation=AgentRecommendation(
        recommendation="Continue standard cycle",
        rationale="All nominal"
    )
)
CRITICAL_FLEET = FleetAgentResponse(
    findings=[AgentFinding(
        agent="fleet_agent", status="CRITICAL",
        relevantSignals=["ramp_congestion_percent"],
        concerns=["Severe congestion 75%"], confidence=0.97, summary="Ramp gridlock"
    )],
    recommendation=AgentRecommendation(
        recommendation="Suspend dispatch",
        rationale="Congestion critical"
    )
)
CRITICAL_MAINT = MaintenanceAgentResponse(
    findings=[AgentFinding(
        agent="maintenance_agent", status="CRITICAL",
        relevantSignals=["truck_temperature_celsius"],
        concerns=["Overheat 115°C"], confidence=0.98, summary="Thermal ceiling exceeded"
    )],
    recommendation=AgentRecommendation(
        recommendation="Emergency shutdown",
        rationale="Thermal overheat"
    )
)

VALID_REC = SupervisorRecommendation(
    decision="NORMAL",
    contributingSignals=["ramp_congestion_percent"],
    agentsConsulted=["fleet_agent", "maintenance_agent"],
    explanation="All systems nominal. Standard operations may continue.",
    proposedAction="adjustDrillSpeed",
    parameters={"targetSpeed": 1.0},
    confidence=0.95,
)


async def _fake_adk_success(agent, prompt):
    """Simulates successful ADK Runner call returning a valid recommendation."""
    return VALID_REC


async def _fake_adk_none(agent, prompt):
    """Simulates ADK Runner returning None (invalid/malformed response)."""
    return None


async def _fake_adk_raises(agent, prompt):
    """Simulates ADK Runner throwing a runtime error."""
    raise RuntimeError("Simulated ADK network failure")


# ---------------------------------------------------------------------------
# Test A – Real ADK execution boundary
# ---------------------------------------------------------------------------

class TestA_RealADKPath:
    """Test A: Supervisor.synthesize() calls ADK Runner and propagates metadata."""

    def test_synthesize_invokes_adk_and_returns_llm_recommendation(self):
        """When API key present and ADK returns valid rec, llmUsed must be True."""
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_success):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-test-key-adk"}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(
                    telemetry=NOMINAL_TELEMETRY,
                    fleet_result=NOMINAL_FLEET,
                    maintenance_result=NOMINAL_MAINT,
                    scenario_id="NORMAL_OPERATIONS",
                )

        assert rec.llmUsed is True, "llmUsed must be True after real ADK Runner execution"
        assert rec.llmProvider == "google"
        assert rec.llmModel == "gemini-2.0-flash"
        assert rec.decision == "NORMAL"
        assert rec.proposedAction == "adjustDrillSpeed"
        assert isinstance(rec, SupervisorRecommendation)

    def test_synthesize_last_metadata_set_after_llm_success(self):
        """last_metadata dict must reflect llmUsed=True after successful Gemini call."""
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_success):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-test-key-adk"}, clear=False):
                agent = SupervisorAgent()
                agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert agent.last_metadata["llmUsed"] is True
        assert agent.last_metadata["llmProvider"] == "google"
        assert agent.last_metadata["llmModel"] == "gemini-2.0-flash"


# ---------------------------------------------------------------------------
# Test B – Structured output validation
# ---------------------------------------------------------------------------

class TestB_StructuredOutputValidation:
    """Test B: Valid rec → llmUsed=True; invalid/None rec → deterministic fallback."""

    def test_valid_recommendation_from_adk_sets_llm_used_true(self):
        """A well-formed rec from ADK must result in llmUsed=True."""
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_success):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert isinstance(rec, SupervisorRecommendation)
        assert rec.llmUsed is True

    def test_none_from_adk_triggers_deterministic_fallback(self):
        """ADK returning None (malformed / validation failure) → deterministic fallback, llmUsed=False."""
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_none):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert isinstance(rec, SupervisorRecommendation)
        assert rec.llmUsed is False, "None from ADK must result in llmUsed=False (deterministic fallback)"

    def test_fallback_recommendation_is_structurally_valid(self):
        """Deterministic fallback must always produce a fully valid SupervisorRecommendation."""
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_none):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert rec.decision in {"NORMAL", "WARNING", "ESCALATE", "STOP_AND_INFORM_SUPERVISOR"}
        assert rec.proposedAction in {"adjustDrillSpeed", "rerouteOre", "scheduleMaintenance", "halt"}
        assert isinstance(rec.confidence, float)
        assert 0.0 <= rec.confidence <= 1.0


# ---------------------------------------------------------------------------
# Test C – Missing API key
# ---------------------------------------------------------------------------

class TestC_MissingApiKey:
    """Test C: No API key → deterministic fallback, no crash, llmUsed=False."""

    def _clean_env(self):
        return {k: v for k, v in os.environ.items()
                if k not in ("GOOGLE_API_KEY", "GEMINI_API_KEY", "GOOGLE_GENAI_API_KEY")}

    def test_missing_api_key_returns_deterministic_recommendation(self):
        with patch("agents.supervisor._get_api_key", return_value=None):
            with patch.dict(os.environ, self._clean_env(), clear=True):
                agent = SupervisorAgent()
                rec = agent.synthesize(
                    telemetry=NOMINAL_TELEMETRY,
                    fleet_result=NOMINAL_FLEET,
                    maintenance_result=NOMINAL_MAINT,
                    scenario_id="NORMAL_OPERATIONS",
                )

        assert isinstance(rec, SupervisorRecommendation)
        assert rec.llmUsed is False
        assert rec.llmProvider is None
        assert rec.llmModel is None
        assert rec.decision == "NORMAL"

    def test_missing_api_key_does_not_crash(self):
        with patch("agents.supervisor._get_api_key", return_value=None):
            with patch.dict(os.environ, self._clean_env(), clear=True):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, CRITICAL_FLEET, CRITICAL_MAINT)

        assert isinstance(rec, SupervisorRecommendation)
        assert rec.llmUsed is False

    def test_missing_api_key_never_calls_adk_runner(self):
        """_invoke_adk_runner must never be called when API key is absent."""
        called = []

        async def _track_call(agent, prompt):
            called.append(True)
            return VALID_REC

        with patch("agents.supervisor._invoke_adk_runner", new=_track_call):
            with patch("agents.supervisor._get_api_key", return_value=None):
                with patch.dict(os.environ, self._clean_env(), clear=True):
                    agent = SupervisorAgent()
                    agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert len(called) == 0, "_invoke_adk_runner must not be called when API key is absent"


# ---------------------------------------------------------------------------
# Test D – Runtime ADK failure
# ---------------------------------------------------------------------------

class TestD_RuntimeFailure:
    """Test D: ADK/Gemini runtime exception → deterministic fallback, llmUsed=False."""

    def test_adk_exception_triggers_deterministic_fallback(self):
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_raises):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert isinstance(rec, SupervisorRecommendation)
        assert rec.llmUsed is False
        assert agent.last_metadata["llmUsed"] is False

    def test_adk_exception_sets_correct_metadata(self):
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_raises):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}, clear=False):
                agent = SupervisorAgent()
                agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert agent.last_metadata["llmProvider"] is None
        assert agent.last_metadata["llmModel"] is None

    def test_adk_exception_does_not_propagate_to_caller(self):
        """ADK exception must be swallowed internally; caller must receive a valid rec."""
        async def raise_timeout(agent, prompt):
            raise TimeoutError("Simulated Gemini timeout")

        with patch("agents.supervisor._invoke_adk_runner", new=raise_timeout):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": "fake-key"}, clear=False):
                agent = SupervisorAgent()
                # Must not raise
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        assert isinstance(rec, SupervisorRecommendation)


# ---------------------------------------------------------------------------
# Test E – Safety Engine authority
# ---------------------------------------------------------------------------

class TestE_SafetyEngineAuthority:
    """Test E: LLM says NORMAL but telemetry is unsafe → Safety Engine must win."""

    def test_safety_engine_overrides_llm_normal_recommendation(self):
        """On critical telemetry, Safety Engine enforces STOP regardless of LLM decision."""
        workflow = OrePulseWorkflow()
        llm_rec = SupervisorRecommendation(
            decision="NORMAL",
            contributingSignals=["ramp_congestion_percent"],
            agentsConsulted=["fleet_agent", "maintenance_agent"],
            explanation="LLM says everything is fine",
            proposedAction="adjustDrillSpeed",
            parameters={"targetSpeed": 1.0},
            confidence=0.95,
        )
        safety_eval = workflow._evaluate_safety_boundary(UNSAFE_TELEMETRY, llm_rec)

        assert safety_eval["status"] == "STOP_AND_INFORM_SUPERVISOR", (
            "Safety Engine must enforce STOP when temperature exceeds threshold, "
            "regardless of LLM recommendation"
        )
        assert safety_eval["humanOversightRequired"] is True
        assert "criticalEquipmentAnomaly" in safety_eval["triggeredRules"]

    def test_safety_engine_overrides_even_with_high_llm_confidence(self):
        """High confidence LLM recommendations (0.99) do not override the Safety Engine."""
        llm_rec = SupervisorRecommendation(
            decision="NORMAL",
            contributingSignals=[],
            agentsConsulted=["fleet_agent", "maintenance_agent"],
            explanation="High confidence: all systems go",
            proposedAction="adjustDrillSpeed",
            parameters={"targetSpeed": 2.0},
            confidence=0.99,
        )
        workflow = OrePulseWorkflow()
        safety_eval = workflow._evaluate_safety_boundary(UNSAFE_TELEMETRY, llm_rec)

        assert safety_eval["status"] == "STOP_AND_INFORM_SUPERVISOR"

    def test_safety_engine_allows_nominal_telemetry(self):
        """On nominal telemetry with normal LLM recommendation, Safety Engine allows."""
        workflow = OrePulseWorkflow()
        safety_eval = workflow._evaluate_safety_boundary(NOMINAL_TELEMETRY, VALID_REC)

        assert safety_eval["status"] == "ALLOW"
        assert safety_eval["humanOversightRequired"] is False


# ---------------------------------------------------------------------------
# Test F – Credential security
# ---------------------------------------------------------------------------

class TestF_CredentialSecurity:
    """Test F: Fake API key must never appear in logs, trace, or recommendation objects."""

    FAKE_KEY = "TEST_SECRET_DO_NOT_LEAK_XYZ_98765"

    def test_api_key_not_in_recommendation_object(self):
        """API key must not appear in any field of the returned SupervisorRecommendation."""
        async def _inject_key_in_error(agent, prompt):
            raise RuntimeError(f"Auth failed with key={self.FAKE_KEY}")

        with patch("agents.supervisor._invoke_adk_runner", new=_inject_key_in_error):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": self.FAKE_KEY}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        rec_json = rec.model_dump_json()
        assert self.FAKE_KEY not in rec_json, (
            f"API key must not appear in SupervisorRecommendation JSON. Got: {rec_json[:200]}"
        )

    def test_api_key_not_in_successful_recommendation(self):
        """Successful rec must not accidentally embed the API key."""
        with patch("agents.supervisor._invoke_adk_runner", new=_fake_adk_success):
            with patch.dict(os.environ, {"GOOGLE_API_KEY": self.FAKE_KEY}, clear=False):
                agent = SupervisorAgent()
                rec = agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)

        rec_json = rec.model_dump_json()
        assert self.FAKE_KEY not in rec_json

    def test_sanitize_error_message_removes_api_key(self):
        """_sanitize_error_message must remove API key values from exception strings."""
        with patch.dict(os.environ, {"GOOGLE_API_KEY": self.FAKE_KEY}, clear=False):
            exc = RuntimeError(f"Auth failed with api_key={self.FAKE_KEY}")
            sanitized = _sanitize_error_message(exc)

        assert self.FAKE_KEY not in sanitized, (
            f"Sanitized message still contains fake key: {sanitized}"
        )

    def test_logged_error_does_not_contain_api_key(self):
        """Log records from fallback path must not contain the API key."""
        log_records = []

        class CapturingHandler(logging.Handler):
            def emit(self, record):
                log_records.append(self.format(record))

        handler = CapturingHandler()
        handler.setLevel(logging.DEBUG)
        sup_logger = logging.getLogger("agents.supervisor")
        sup_logger.addHandler(handler)
        sup_logger.setLevel(logging.DEBUG)

        async def _inject_key_error(agent, prompt):
            raise RuntimeError(f"Credential error with key={self.FAKE_KEY}")

        try:
            with patch("agents.supervisor._invoke_adk_runner", new=_inject_key_error):
                with patch.dict(os.environ, {"GOOGLE_API_KEY": self.FAKE_KEY}, clear=False):
                    agent = SupervisorAgent()
                    agent.synthesize(NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT)
        finally:
            sup_logger.removeHandler(handler)

        combined_log = "\n".join(log_records)
        assert self.FAKE_KEY not in combined_log, (
            f"API key leaked into log output:\n{combined_log[:500]}"
        )


# ---------------------------------------------------------------------------
# Deterministic fallback standalone tests
# ---------------------------------------------------------------------------

class TestDeterministicFallback:
    """Verify _deterministic_synthesize produces correct results independently."""

    def _no_api_env(self):
        return {k: v for k, v in os.environ.items()
                if k not in ("GOOGLE_API_KEY", "GEMINI_API_KEY")}

    def test_deterministic_synthesize_critical_combined_risk(self):
        with patch.dict(os.environ, self._no_api_env(), clear=True):
            agent = SupervisorAgent()
            rec = agent._deterministic_synthesize(
                UNSAFE_TELEMETRY, CRITICAL_FLEET, CRITICAL_MAINT
            )
        assert rec.decision == "STOP_AND_INFORM_SUPERVISOR"
        assert rec.proposedAction == "halt"

    def test_deterministic_synthesize_nominal_conditions(self):
        with patch.dict(os.environ, self._no_api_env(), clear=True):
            agent = SupervisorAgent()
            rec = agent._deterministic_synthesize(
                NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT
            )
        assert rec.decision == "NORMAL"
        assert rec.proposedAction == "adjustDrillSpeed"

    def test_deterministic_synthesize_always_returns_supervisor_recommendation(self):
        with patch.dict(os.environ, self._no_api_env(), clear=True):
            agent = SupervisorAgent()
            rec = agent._deterministic_synthesize(
                NOMINAL_TELEMETRY, NOMINAL_FLEET, NOMINAL_MAINT
            )
        assert isinstance(rec, SupervisorRecommendation)
        assert rec.llmUsed is False
