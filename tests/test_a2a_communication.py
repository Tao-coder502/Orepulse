"""Test suite for OrePulse AI Agent2Agent (A2A) Protocol Communication.

Validates:
1. Direct structured A2A exchange between Supervisor and Fleet Agent.
2. Direct structured A2A exchange between Supervisor and Maintenance Agent.
3. Schema validation using Pydantic v2 (types, constraints, rejection of malformed data).
4. Correlation / Experiment ID propagation across requests, responses, and trace events.
5. Corrupted/invalid response rejection.
6. Timeout handling and deterministic fallback.
7. Agent failure handling and deterministic fallback.
8. Dynamic simulation live data flow (changing inputs produces genuinely distinct A2A messages).
9. Deterministic safety engine absolute authority over A2A proposals.
10. Execution mode distinction (a2a_adk on success vs deterministic_fallback on failure).
"""

import sys
import os
import time
import pytest
from pydantic import ValidationError

runtime_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agent-runtime"))
if runtime_path not in sys.path:
    sys.path.insert(0, runtime_path)

from schemas.a2a_messages import (
    FleetAnalysisRequest,
    FleetAnalysisResponse,
    MaintenanceAnalysisRequest,
    MaintenanceAnalysisResponse,
    A2ATraceEvent,
)
from a2a_protocol.transport import A2ATransport, A2ACommunicationError
from a2a_protocol.agent_cards import (
    get_fleet_agent_card,
    get_maintenance_agent_card,
    get_supervisor_agent_card,
)
from agents.fleet import FleetAgent
from agents.maintenance import MaintenanceAgent
from agents.supervisor import SupervisorAgent
from workflows.ore_pulse_workflow import OrePulseWorkflow
from runtime.runner import AdkRuntimeRunner


@pytest.mark.asyncio
async def test_a2a_supervisor_to_fleet_communication():
    """Verify direct structured A2A exchange between Supervisor and Fleet Agent."""
    transport = A2ATransport(timeout_seconds=5.0)
    fleet_agent = FleetAgent()
    request = FleetAnalysisRequest(
        experiment_id="exp-test-fleet-001",
        scenario_id="HAUL_RAMP_BOTTLENECK",
        timestamp="2026-09-16T12:00:00Z",
        telemetry={
            "ramp": {"congestionLevel": 75.0, "status": "congested"},
            "fleet": {"availability": 80.0},
        },
    )

    response, events = await transport.send_fleet_analysis(request, fleet_agent)

    assert isinstance(response, FleetAnalysisResponse)
    assert response.agent_id == "fleet_agent"
    assert response.status == "CRITICAL"
    assert response.confidence >= 0.90
    assert len(response.findings) >= 1
    assert "ramp_congestion_percent" in response.signals

    # Verify event traces emitted
    assert len(events) == 2
    sent_event, rec_event = events[0], events[1]
    assert sent_event.event == "FLEET_A2A_REQUEST_SENT"
    assert sent_event.requestId == "exp-test-fleet-001"
    assert sent_event.transport == "a2a"
    assert rec_event.event == "FLEET_A2A_RESPONSE_RECEIVED"
    assert rec_event.status == "SUCCESS"
    assert rec_event.requestId == "exp-test-fleet-001"


@pytest.mark.asyncio
async def test_a2a_supervisor_to_maintenance_communication():
    """Verify direct structured A2A exchange between Supervisor and Maintenance Agent."""
    transport = A2ATransport(timeout_seconds=5.0)
    maint_agent = MaintenanceAgent()
    request = MaintenanceAnalysisRequest(
        experiment_id="exp-test-maint-001",
        scenario_id="THERMAL_RUNAWAY",
        timestamp="2026-09-16T12:00:00Z",
        telemetry={
            "equipment": {"temperature": 112.0, "status": "critical", "alert": "High thermal alert"},
        },
    )

    response, events = await transport.send_maintenance_analysis(request, maint_agent)

    assert isinstance(response, MaintenanceAnalysisResponse)
    assert response.agent_id == "maintenance_agent"
    assert response.status == "CRITICAL"
    assert response.confidence >= 0.95
    assert len(response.findings) >= 1
    assert "truck_temperature_celsius" in response.signals

    # Verify event traces emitted
    assert len(events) == 2
    sent_event, rec_event = events[0], events[1]
    assert sent_event.event == "MAINTENANCE_A2A_REQUEST_SENT"
    assert sent_event.requestId == "exp-test-maint-001"
    assert sent_event.transport == "a2a"
    assert rec_event.event == "MAINTENANCE_A2A_RESPONSE_RECEIVED"
    assert rec_event.status == "SUCCESS"
    assert rec_event.requestId == "exp-test-maint-001"


def test_a2a_structured_schema_validation():
    """Verify strict Pydantic v2 validation rejects invalid payloads and accepts valid ones."""
    # Valid request
    valid_req = FleetAnalysisRequest(
        experiment_id="exp-val-001",
        scenario_id="NORMAL_OPERATIONS",
        timestamp="2026-09-16T12:00:00Z",
        telemetry={"ramp": {"congestionLevel": 10.0}},
    )
    assert valid_req.experiment_id == "exp-val-001"

    # Missing required field
    with pytest.raises(ValidationError):
        FleetAnalysisRequest(
            experiment_id="exp-invalid",
            # scenario_id missing
            timestamp="2026-09-16T12:00:00Z",
            telemetry={},
        )

    # Invalid status in FleetAnalysisResponse
    with pytest.raises(ValidationError):
        FleetAnalysisResponse(
            experiment_id="exp-invalid",
            agent_id="fleet_agent",
            status="INVALID_STATUS_VALUE",  # must be NOMINAL, DEGRADED, CRITICAL, etc.
            findings=[],
            recommendation={"recommendation": "Hold", "rationale": "Test"},
            confidence=0.9,
            signals=[],
        )


def test_a2a_correlation_id_propagation():
    """Verify experiment_id propagates from client request through all A2A events and trace."""
    workflow = OrePulseWorkflow()
    custom_exp_id = "exp-correlation-verified-777"
    payload = {
        "experimentId": custom_exp_id,
        "scenarioId": "COMBINED_OPERATIONAL_RISK",
        "telemetry": {
            "equipment": {"temperature": 105.0},
            "ramp": {"congestionLevel": 70.0},
            "fleet": {"availability": 65.0},
        },
    }

    trace = workflow.run(payload)

    assert trace["experimentId"] == custom_exp_id
    assert "events" in trace
    assert len(trace["events"]) >= 5

    # Every event must carry the correlation ID
    for ev in trace["events"]:
        assert ev["requestId"] == custom_exp_id, f"Event {ev['event']} has requestId {ev.get('requestId')}"


@pytest.mark.asyncio
async def test_a2a_invalid_response_rejection():
    """Verify that an agent returning a malformed response triggers validation error and failure event."""
    transport = A2ATransport(timeout_seconds=2.0)

    class MalformedAgent:
        def handle_a2a_request(self, req):
            # Missing mandatory fields 'findings' and 'status'
            return {"bogus": "data"}

    req = FleetAnalysisRequest(
        experiment_id="exp-malformed",
        scenario_id="TEST",
        timestamp="2026-09-16T12:00:00Z",
        telemetry={},
    )

    with pytest.raises(A2ACommunicationError) as exc_info:
        await transport.send_fleet_analysis(req, MalformedAgent())

    assert "fleet_agent" in str(exc_info.value)


@pytest.mark.asyncio
async def test_a2a_timeout_handling():
    """Verify that a slow or hanging agent triggers a timeout error and failure event."""
    transport = A2ATransport(timeout_seconds=0.1)

    class SlowAgent:
        def handle_a2a_request(self, req):
            time.sleep(0.3)
            return FleetAnalysisResponse(
                experiment_id=req.experiment_id,
                agent_id="fleet_agent",
                status="NOMINAL",
                findings=[],
                recommendation={"recommendation": "OK", "rationale": "OK"},
                confidence=0.9,
                signals=[],
            )

    req = FleetAnalysisRequest(
        experiment_id="exp-timeout",
        scenario_id="TEST",
        timestamp="2026-09-16T12:00:00Z",
        telemetry={},
    )

    with pytest.raises(A2ACommunicationError) as exc_info:
        await transport.send_fleet_analysis(req, SlowAgent())

    assert "Timed out" in str(exc_info.value)


def test_a2a_agent_failure_fallback():
    """Verify that an A2A transport failure cleanly engages deterministic fallback without crashing."""
    workflow = OrePulseWorkflow()

    # Intentionally corrupt the transport timeout to near-zero to force an A2A failure
    workflow.a2a_transport.timeout_seconds = 0.0001

    class FailingFleet:
        def handle_a2a_request(self, req):
            raise RuntimeError("Simulated network/agent failure")

    workflow.fleet.handle_a2a_request = FailingFleet().handle_a2a_request

    payload = {
        "scenarioId": "COMBINED_OPERATIONAL_RISK",
        "telemetry": {
            "equipment": {"temperature": 110.0},
            "ramp": {"congestionLevel": 75.0},
        },
    }

    # Should NOT raise, but cleanly fall back
    trace = workflow.run(payload)

    assert trace["executionMode"] == "deterministic_fallback"
    assert "events" in trace
    # Ensure fallback event was recorded
    fallback_events = [e for e in trace["events"] if e["event"] == "A2A_FALLBACK_ACTIVATED"]
    assert len(fallback_events) >= 1
    # System still reaches valid safe decision
    assert trace["finalDecision"]["decision"] == "STOP_AND_INFORM_SUPERVISOR"


def test_dynamic_simulation_live_data_flow():
    """Verify changing simulation variables dynamically alters A2A messages, findings, and safety actions."""
    workflow = OrePulseWorkflow()

    # Run 1: Nominal parameters
    payload_nominal = {
        "scenarioId": "NORMAL_OPERATIONS",
        "telemetry": {
            "equipment": {"temperature": 75.0, "status": "nominal"},
            "ramp": {"congestionLevel": 15.0, "status": "open"},
            "fleet": {"availability": 95.0},
        },
    }
    trace_nominal = workflow.run(payload_nominal)

    # Run 2: Critical parameters
    payload_critical = {
        "scenarioId": "COMBINED_OPERATIONAL_RISK",
        "telemetry": {
            "equipment": {"temperature": 115.0, "status": "critical"},
            "ramp": {"congestionLevel": 85.0, "status": "congested"},
            "fleet": {"availability": 55.0},
        },
    }
    trace_critical = workflow.run(payload_critical)

    # Dynamic distinction in specialist findings
    assert trace_nominal["agentResults"]["fleet"]["findings"][0]["status"] == "NOMINAL"
    assert trace_critical["agentResults"]["fleet"]["findings"][0]["status"] == "CRITICAL"

    assert trace_nominal["agentResults"]["maintenance"]["findings"][0]["status"] == "NOMINAL"
    assert trace_critical["agentResults"]["maintenance"]["findings"][0]["status"] == "CRITICAL"

    # Dynamic distinction in decisions
    assert trace_nominal["proposedDecision"]["decision"] == "NORMAL"
    assert trace_critical["proposedDecision"]["decision"] == "STOP_AND_INFORM_SUPERVISOR"

    assert trace_nominal["finalDecision"]["decision"] == "ALLOW"
    assert trace_critical["finalDecision"]["decision"] == "STOP_AND_INFORM_SUPERVISOR"

    # Distinct learning explanations
    assert trace_nominal["learningExplanation"]["learningTakeaway"] != trace_critical["learningExplanation"]["learningTakeaway"]


def test_safety_engine_absolute_authority_over_a2a_proposal():
    """Verify that if A2A agents proposed an unsafe action (e.g. NORMAL during overheat), Safety Engine overrules."""
    workflow = OrePulseWorkflow()

    # Telemetry with critical temperature violation
    payload = {
        "scenarioId": "THERMAL_RUNAWAY",
        "telemetry": {
            "equipment": {"temperature": 118.0, "status": "critical"},
            "ramp": {"congestionLevel": 20.0},
        },
    }

    # Simulate adversarial proposal from LLM synthesis proposing NORMAL
    class AdversarialSupervisor(SupervisorAgent):
        def synthesize(self, telemetry, fleet_result, maintenance_result, scenario_id):
            rec = super().synthesize(telemetry, fleet_result, maintenance_result, scenario_id)
            rec.decision = "NORMAL"
            rec.proposedAction = "increaseSpeed"
            return rec

    workflow.supervisor = AdversarialSupervisor()
    trace = workflow.run(payload)

    # The proposed decision was overridden by the deterministic safety boundary
    assert trace["proposedDecision"]["decision"] == "NORMAL"
    assert trace["safetyEvaluation"]["status"] == "STOP_AND_INFORM_SUPERVISOR"
    assert trace["finalDecision"]["decision"] == "STOP_AND_INFORM_SUPERVISOR"
    assert trace["finalDecision"]["action"] == "halt"
    assert trace["isOverridden"] is True
    assert trace["humanOversightRequired"] is True


def test_execution_mode_distinction():
    """Verify that successful execution sets executionMode: 'a2a_adk', while runner error sets 'deterministic_fallback'."""
    runner = AdkRuntimeRunner()

    # 1. Normal run
    trace_ok = runner.run_workflow({
        "scenarioId": "NORMAL_OPERATIONS",
        "telemetry": {"equipment": {"temperature": 80.0}, "ramp": {"congestionLevel": 20.0}},
    })
    assert trace_ok["executionMode"] == "a2a_adk"

    # 2. Corrupt workflow to trigger runner's controlled fallback
    runner.workflow = None
    trace_fallback = runner.run_workflow({
        "scenarioId": "NORMAL_OPERATIONS",
        "telemetry": {"equipment": {"temperature": 80.0}, "ramp": {"congestionLevel": 20.0}},
    })
    assert trace_fallback["executionMode"] == "deterministic_fallback"
    assert trace_fallback["supervisorStarted"] is True
