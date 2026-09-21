"""Abstract base class for OrePulse AI inference providers.

The provider abstraction ensures:
- The product layer never references a specific model name.
- Any provider (offline-local, future cloud, etc.) can be swapped without changing agent code.
- Health status is always tracked and surfaced to the workflow.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum


class ProviderStatus(str, Enum):
    """Lifecycle states for an AI provider."""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    TIMEOUT = "timeout"
    INVALID_OUTPUT = "invalid_output"
    FALLBACK = "fallback"


@dataclass
class ProviderResult:
    """Structured result returned by any AI provider synthesis call."""
    content: Optional[str]
    """Raw text content returned by the provider."""

    status: ProviderStatus
    """Outcome status of the inference call."""

    latency_ms: float = 0.0
    """Wall-clock latency in milliseconds for the inference request."""

    tools_used: List[str] = field(default_factory=list)
    """Names of tools called during the reasoning cycle."""

    knowledge_snippet: Optional[str] = None
    """Short excerpt from local knowledge base used during synthesis (if any)."""

    error: Optional[str] = None
    """Sanitized error message if the call failed."""

    token_count: Optional[int] = None
    """Approximate token count if returned by the provider."""


class AIProvider(ABC):
    """Abstract base for all OrePulse AI inference providers.

    Implementors must provide:
    - ``synthesize`` — async inference call producing structured JSON text.
    - ``health_check`` — synchronous connectivity probe.
    """

    @abstractmethod
    async def synthesize(
        self,
        prompt: str,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> ProviderResult:
        """Run inference and return structured provider result.

        Args:
            prompt: The complete synthesis prompt for the provider.
            tools: Optional list of tool definitions available to the provider.

        Returns:
            ProviderResult with content, status, and metadata.
        """
        ...

    @abstractmethod
    def health_check(self) -> ProviderStatus:
        """Probe provider availability without running a full inference.

        Returns:
            ProviderStatus indicating current provider state.
        """
        ...

    @property
    def provider_label(self) -> str:
        """Human-facing label for this provider (never exposes model name)."""
        return "offline"
