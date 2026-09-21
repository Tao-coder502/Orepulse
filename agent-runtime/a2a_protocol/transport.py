"""A2A (Agent2Agent) Protocol Transport Dispatcher.

Coordinates structured, asynchronous message exchanges between the Supervisor
Agent and Autonomous Specialist Agents (Fleet & Maintenance) over the A2A protocol.
"""

import time
import asyncio
import logging
from typing import Dict, Any, List, Tuple, Optional
from schemas.a2a_messages import (
    FleetAnalysisRequest,
    FleetAnalysisResponse,
    MaintenanceAnalysisRequest,
    MaintenanceAnalysisResponse,
    A2ATraceEvent,
)
from a2a_protocol.agent_cards import get_fleet_agent_card, get_maintenance_agent_card

logger = logging.getLogger(__name__)


class A2ACommunicationError(Exception):
    """Raised when an A2A protocol message fails, times out, or violates schema."""
    def __init__(self, agent: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(f"[A2A Error] {agent}: {message}")
        self.agent = agent
        self.details = details or {}


class A2ATransport:
    """Protocol transport layer for Agent-to-Agent message exchange."""

    def __init__(self, timeout_seconds: float = 5.0):
        self.timeout_seconds = timeout_seconds
        self.fleet_card = get_fleet_agent_card()
        self.maintenance_card = get_maintenance_agent_card()

    async def send_fleet_analysis(
        self,
        request: FleetAnalysisRequest,
        fleet_agent_handler: Any,
    ) -> Tuple[FleetAnalysisResponse, List[A2ATraceEvent]]:
        """Dispatch structured A2A request to Fleet Agent and receive response."""
        events: List[A2ATraceEvent] = []
        req_start = time.perf_counter()
        req_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # 1. Log A2A Request Sent event
        events.append(
            A2ATraceEvent(
                agent="fleet_agent",
                event="FLEET_A2A_REQUEST_SENT",
                status="PENDING",
                timestamp=req_time,
                duration_ms=0.0,
                transport="a2a",
                requestId=request.experiment_id,
                details={
                    "targetAgent": self.fleet_card.name,
                    "targetVersion": self.fleet_card.version,
                    "scenarioId": request.scenario_id,
                    "analysisScope": request.analysis_scope,
                },
            )
        )

        try:
            # Envelope conforming to standard JSON-RPC 2.0 / A2A RPC
            a2a_envelope = {
                "jsonrpc": "2.0",
                "method": "analyzeFleetTelemetry",
                "id": request.experiment_id,
                "params": getattr(request, "model_dump", request.dict)(),
            }

            # Execute agent handler with timeout
            raw_response = await asyncio.wait_for(
                asyncio.to_thread(fleet_agent_handler.handle_a2a_request, request),
                timeout=self.timeout_seconds,
            )

            req_duration = (time.perf_counter() - req_start) * 1000.0
            resp_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            # Validate response schema strictly
            if isinstance(raw_response, dict):
                validated_response = FleetAnalysisResponse(**raw_response)
            elif isinstance(raw_response, FleetAnalysisResponse):
                validated_response = raw_response
            else:
                raise ValueError(f"Unrecognized response type: {type(raw_response)}")

            # 2. Log A2A Response Received event
            events.append(
                A2ATraceEvent(
                    agent="fleet_agent",
                    event="FLEET_A2A_RESPONSE_RECEIVED",
                    status="SUCCESS",
                    timestamp=resp_time,
                    duration_ms=round(req_duration, 2),
                    transport="a2a",
                    requestId=request.experiment_id,
                    details={
                        "status": validated_response.status,
                        "confidence": validated_response.confidence,
                        "findingsCount": len(validated_response.findings),
                        "signals": validated_response.signals,
                    },
                )
            )

            return validated_response, events

        except asyncio.TimeoutError as err:
            duration = (time.perf_counter() - req_start) * 1000.0
            fail_event = A2ATraceEvent(
                agent="fleet_agent",
                event="FLEET_A2A_TIMEOUT",
                status="ERROR",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=round(duration, 2),
                transport="a2a",
                requestId=request.experiment_id,
                details={"error": f"A2A request timed out after {self.timeout_seconds}s"},
            )
            events.append(fail_event)
            raise A2ACommunicationError("fleet_agent", f"Timed out after {self.timeout_seconds}s") from err

        except Exception as err:
            duration = (time.perf_counter() - req_start) * 1000.0
            fail_event = A2ATraceEvent(
                agent="fleet_agent",
                event="FLEET_A2A_FAILED",
                status="ERROR",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=round(duration, 2),
                transport="a2a",
                requestId=request.experiment_id,
                details={"error": str(err)},
            )
            events.append(fail_event)
            raise A2ACommunicationError("fleet_agent", str(err)) from err

    async def send_maintenance_analysis(
        self,
        request: MaintenanceAnalysisRequest,
        maint_agent_handler: Any,
    ) -> Tuple[MaintenanceAnalysisResponse, List[A2ATraceEvent]]:
        """Dispatch structured A2A request to Maintenance Agent and receive response."""
        events: List[A2ATraceEvent] = []
        req_start = time.perf_counter()
        req_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # 1. Log A2A Request Sent event
        events.append(
            A2ATraceEvent(
                agent="maintenance_agent",
                event="MAINTENANCE_A2A_REQUEST_SENT",
                status="PENDING",
                timestamp=req_time,
                duration_ms=0.0,
                transport="a2a",
                requestId=request.experiment_id,
                details={
                    "targetAgent": self.maintenance_card.name,
                    "targetVersion": self.maintenance_card.version,
                    "scenarioId": request.scenario_id,
                    "analysisScope": request.analysis_scope,
                },
            )
        )

        try:
            # Envelope conforming to standard JSON-RPC 2.0 / A2A RPC
            a2a_envelope = {
                "jsonrpc": "2.0",
                "method": "analyzeEquipmentHealth",
                "id": request.experiment_id,
                "params": getattr(request, "model_dump", request.dict)(),
            }

            # Execute agent handler with timeout
            raw_response = await asyncio.wait_for(
                asyncio.to_thread(maint_agent_handler.handle_a2a_request, request),
                timeout=self.timeout_seconds,
            )

            req_duration = (time.perf_counter() - req_start) * 1000.0
            resp_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            # Validate response schema strictly
            if isinstance(raw_response, dict):
                validated_response = MaintenanceAnalysisResponse(**raw_response)
            elif isinstance(raw_response, MaintenanceAnalysisResponse):
                validated_response = raw_response
            else:
                raise ValueError(f"Unrecognized response type: {type(raw_response)}")

            # 2. Log A2A Response Received event
            events.append(
                A2ATraceEvent(
                    agent="maintenance_agent",
                    event="MAINTENANCE_A2A_RESPONSE_RECEIVED",
                    status="SUCCESS",
                    timestamp=resp_time,
                    duration_ms=round(req_duration, 2),
                    transport="a2a",
                    requestId=request.experiment_id,
                    details={
                        "status": validated_response.status,
                        "confidence": validated_response.confidence,
                        "findingsCount": len(validated_response.findings),
                        "signals": validated_response.signals,
                    },
                )
            )

            return validated_response, events

        except asyncio.TimeoutError as err:
            duration = (time.perf_counter() - req_start) * 1000.0
            fail_event = A2ATraceEvent(
                agent="maintenance_agent",
                event="MAINTENANCE_A2A_TIMEOUT",
                status="ERROR",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=round(duration, 2),
                transport="a2a",
                requestId=request.experiment_id,
                details={"error": f"A2A request timed out after {self.timeout_seconds}s"},
            )
            events.append(fail_event)
            raise A2ACommunicationError("maintenance_agent", f"Timed out after {self.timeout_seconds}s") from err

        except Exception as err:
            duration = (time.perf_counter() - req_start) * 1000.0
            fail_event = A2ATraceEvent(
                agent="maintenance_agent",
                event="MAINTENANCE_A2A_FAILED",
                status="ERROR",
                timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                duration_ms=round(duration, 2),
                transport="a2a",
                requestId=request.experiment_id,
                details={"error": str(err)},
            )
            events.append(fail_event)
            raise A2ACommunicationError("maintenance_agent", str(err)) from err

    def dispatch_specialists_parallel(
        self,
        fleet_request: FleetAnalysisRequest,
        maint_request: MaintenanceAnalysisRequest,
        fleet_agent_handler: Any,
        maint_agent_handler: Any,
    ) -> Tuple[FleetAnalysisResponse, MaintenanceAnalysisResponse, List[A2ATraceEvent]]:
        """Synchronously execute parallel A2A requests to Fleet and Maintenance specialists."""
        async def _run():
            fleet_task = asyncio.create_task(
                self.send_fleet_analysis(fleet_request, fleet_agent_handler)
            )
            maint_task = asyncio.create_task(
                self.send_maintenance_analysis(maint_request, maint_agent_handler)
            )
            (fleet_res, fleet_evs), (maint_res, maint_evs) = await asyncio.gather(
                fleet_task, maint_task
            )
            return fleet_res, maint_res, fleet_evs + maint_evs

        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(_run())
        finally:
            loop.close()
