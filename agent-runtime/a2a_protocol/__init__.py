"""A2A (Agent2Agent) Protocol integration package for OrePulse AI."""

from a2a_protocol.agent_cards import (
    get_fleet_agent_card,
    get_maintenance_agent_card,
    get_supervisor_agent_card,
)
from a2a_protocol.transport import A2ATransport, A2ACommunicationError

__all__ = [
    "get_fleet_agent_card",
    "get_maintenance_agent_card",
    "get_supervisor_agent_card",
    "A2ATransport",
    "A2ACommunicationError",
]
