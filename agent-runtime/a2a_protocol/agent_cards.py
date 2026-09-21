"""A2A Agent Cards for OrePulse AI.

Conforms to the A2A (Agent2Agent) Protocol Specification, defining capabilities,
interfaces, and versioning for autonomous specialist agents.
"""

from a2a.types import AgentCard


def get_fleet_agent_card() -> AgentCard:
    """Return the official A2A AgentCard for the Fleet Specialist Agent."""
    return AgentCard(
        name="orepulse-fleet-agent",
        description=(
            "Autonomous specialist agent evaluating simulated haul ramp congestion, "
            "traffic bottlenecks, and fleet availability in the OrePulse mining laboratory."
        ),
        version="1.0.0",
        provider={"organization": "OrePulse AI Learning Laboratory"},
        documentation_url="https://orepulse.dev/docs/agents/fleet",
    )


def get_maintenance_agent_card() -> AgentCard:
    """Return the official A2A AgentCard for the Maintenance Specialist Agent."""
    return AgentCard(
        name="orepulse-maintenance-agent",
        description=(
            "Autonomous specialist agent detecting simulated equipment thermal anomalies, "
            "evaluating component health alerts, and analyzing engine stress signals."
        ),
        version="1.0.0",
        provider={"organization": "OrePulse AI Learning Laboratory"},
        documentation_url="https://orepulse.dev/docs/agents/maintenance",
    )


def get_supervisor_agent_card() -> AgentCard:
    """Return the official A2A AgentCard for the Supervisor Orchestration Agent."""
    return AgentCard(
        name="orepulse-supervisor-agent",
        description=(
            "Orchestration agent coordinating A2A specialist requests, synthesizing findings, "
            "and proposing advisory operational recommendations to the Deterministic Safety Engine."
        ),
        version="1.0.0",
        provider={"organization": "OrePulse AI Learning Laboratory"},
        documentation_url="https://orepulse.dev/docs/agents/supervisor",
    )
