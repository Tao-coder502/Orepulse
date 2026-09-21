"""OfflineAIProvider — local inference provider for OrePulse.

Communicates with a local inference server (Ollama-compatible API) over HTTP.
The specific model name is never exposed in product copy, UI, or prompts.
All configuration comes from environment variables or defaults.

Environment variables:
  OFFLINE_AI_ENDPOINT   — Base URL (default: http://127.0.0.1:11434)
  OFFLINE_AI_TIMEOUT    — Request timeout seconds (default: 12)
"""

import os
import re
import json
import time
import socket
import logging
import asyncio
from typing import Any, Dict, List, Optional
from urllib import request as urllib_request, error as urllib_error

from providers.base import AIProvider, ProviderResult, ProviderStatus

logger = logging.getLogger(__name__)

_DEFAULT_ENDPOINT = "http://127.0.0.1:11434"
_DEFAULT_TIMEOUT = 75


def _get_endpoint() -> str:
    return os.environ.get("OFFLINE_AI_ENDPOINT", _DEFAULT_ENDPOINT).rstrip("/")


def _get_timeout() -> int:
    try:
        return int(os.environ.get("OFFLINE_AI_TIMEOUT", _DEFAULT_TIMEOUT))
    except (ValueError, TypeError):
        return _DEFAULT_TIMEOUT


def _discover_available_model(endpoint: str, timeout: int) -> Optional[str]:
    """Query the local inference server for available models; return the first suitable one."""
    try:
        req = urllib_request.Request(
            f"{endpoint}/api/tags",
            headers={"Accept": "application/json"},
        )
        with urllib_request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("models", [])
            if models:
                # Prefer first available model; never surface name to product layer
                name = models[0].get("name", "")
                logger.info("Offline AI: discovered local model (count=%d).", len(models))
                return name
    except Exception as err:
        logger.debug("Offline AI: model discovery failed — %s", err)
    return None


def _sanitize_error(err: Exception) -> str:
    """Strip any API keys or tokens from error messages."""
    msg = str(err)[:300]
    msg = re.sub(r'(?:api[_-]?key|token|bearer)[=:\s]+[A-Za-z0-9_\-\.]{8,}', '[REDACTED]', msg, flags=re.IGNORECASE)
    return msg


class OfflineAIProvider(AIProvider):
    """Local inference provider that uses an Ollama-compatible HTTP API.

    The internal model name is an implementation detail — it is discovered
    at runtime and never surfaced to agents, UI, or product copy.
    """

    def __init__(self) -> None:
        self._endpoint = _get_endpoint()
        self._timeout = _get_timeout()
        self._model: Optional[str] = None  # discovered lazily
        logger.info("OfflineAIProvider initialized (endpoint=%s, timeout=%ds).", self._endpoint, self._timeout)

    # ------------------------------------------------------------------
    # AIProvider interface
    # ------------------------------------------------------------------

    def health_check(self) -> ProviderStatus:
        """Probe endpoint connectivity with a lightweight socket check."""
        try:
            host = self._endpoint.replace("http://", "").replace("https://", "").split(":")[0]
            port_str = self._endpoint.split(":")[-1].split("/")[0]
            port = int(port_str) if port_str.isdigit() else 11434
            with socket.create_connection((host, port), timeout=3):
                pass
            return ProviderStatus.AVAILABLE
        except (socket.timeout, ConnectionRefusedError, OSError):
            return ProviderStatus.UNAVAILABLE

    async def synthesize(
        self,
        prompt: str,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> ProviderResult:
        """Send a synthesis prompt to the local inference server and parse the response."""
        start = time.monotonic()

        # Lazy model discovery
        if not self._model:
            self._model = _discover_available_model(self._endpoint, self._timeout)
            if not self._model:
                elapsed = (time.monotonic() - start) * 1000
                return ProviderResult(
                    content=None,
                    status=ProviderStatus.UNAVAILABLE,
                    latency_ms=elapsed,
                    error="No local model available at offline inference endpoint.",
                )

        try:
            result = await asyncio.to_thread(self._blocking_generate, prompt)
            elapsed = (time.monotonic() - start) * 1000
            result.latency_ms = elapsed
            return result
        except Exception as err:
            elapsed = (time.monotonic() - start) * 1000
            return ProviderResult(
                content=None,
                status=ProviderStatus.UNAVAILABLE,
                latency_ms=elapsed,
                error=_sanitize_error(err),
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _blocking_generate(self, prompt: str) -> ProviderResult:
        """Blocking HTTP POST to /api/generate on the local inference server."""
        payload = json.dumps({
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,   # Low temperature for structured JSON output
                "num_predict": 192,
            },
        }).encode("utf-8")

        req = urllib_request.Request(
            f"{self._endpoint}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )

        try:
            with urllib_request.urlopen(req, timeout=self._timeout) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)

                # Ollama returns {"response": "...", "done": true, ...}
                response_text = data.get("response", "").strip()
                token_count = data.get("eval_count")

                if not response_text:
                    return ProviderResult(
                        content=None,
                        status=ProviderStatus.INVALID_OUTPUT,
                        error="Empty response from local inference server.",
                    )

                # Validate that response contains parseable JSON
                cleaned = self._extract_json(response_text)
                if cleaned is None:
                    return ProviderResult(
                        content=response_text,
                        status=ProviderStatus.INVALID_OUTPUT,
                        error="Response does not contain valid JSON.",
                    )

                return ProviderResult(
                    content=cleaned,
                    status=ProviderStatus.AVAILABLE,
                    token_count=token_count,
                )

        except urllib_error.URLError as err:
            reason = getattr(err, "reason", err)
            if isinstance(reason, socket.timeout):
                return ProviderResult(
                    content=None,
                    status=ProviderStatus.TIMEOUT,
                    error=f"Request timed out after {self._timeout}s.",
                )
            return ProviderResult(
                content=None,
                status=ProviderStatus.UNAVAILABLE,
                error=_sanitize_error(err),
            )

    @staticmethod
    def _extract_json(text: str) -> Optional[str]:
        """Extract a JSON object from a response that may contain prose or markdown fences."""
        # Strip markdown code fences
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if fenced:
            candidate = fenced.group(1).strip()
            try:
                json.loads(candidate)
                return candidate
            except json.JSONDecodeError:
                pass

        # Find first { ... } block
        brace_start = text.find("{")
        brace_end = text.rfind("}")
        if brace_start != -1 and brace_end > brace_start:
            candidate = text[brace_start:brace_end + 1].strip()
            try:
                json.loads(candidate)
                return candidate
            except json.JSONDecodeError:
                pass

        return None

    @property
    def provider_label(self) -> str:
        return "offline"
