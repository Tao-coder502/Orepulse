"""Optional web search tool for OrePulse agent runtime.

IMPORTANT: This tool is explicitly NON-AUTHORITATIVE.
- Web search results are informational only and are never used by the Safety Engine.
- When the application is offline, the tool gracefully reports unavailability.
- The tool's output is clearly marked as non-authoritative in all returned data.
"""

import logging
import socket
from typing import Any, Dict

logger = logging.getLogger(__name__)

_CONNECTIVITY_HOST = "8.8.8.8"
_CONNECTIVITY_PORT = 53
_CONNECTIVITY_TIMEOUT = 2


def _is_online() -> bool:
    """Check internet connectivity with a lightweight DNS socket probe."""
    try:
        socket.setdefaulttimeout(_CONNECTIVITY_TIMEOUT)
        with socket.create_connection((_CONNECTIVITY_HOST, _CONNECTIVITY_PORT), timeout=_CONNECTIVITY_TIMEOUT):
            return True
    except (socket.timeout, OSError):
        return False


def search_web(query: str) -> Dict[str, Any]:
    """Perform an optional web search for supplementary non-authoritative research context.

    IMPORTANT: Results from this tool are explicitly non-authoritative.
    The deterministic Safety Engine never uses web search results.
    This tool is intended only for educational enrichment and research context.

    When the application is operating offline, this tool immediately returns
    an unavailable status without failing or raising exceptions.

    Args:
        query: A search query for supplementary context.

    Returns:
        Dictionary with status, message, and any results (if online).
    """
    if not _is_online():
        logger.info("Web search tool: network unavailable — returning offline status.")
        return {
            "status": "unavailable",
            "query": query,
            "message": (
                "Web research unavailable while operating offline. "
                "Using local mining knowledge base for domain context."
            ),
            "results": [],
            "authoritative": False,
            "source": "web_search_offline",
        }

    # When online, perform a minimal search using DuckDuckGo Lite API
    # (no API key required, respects privacy, suitable for educational use)
    try:
        import urllib.request
        import urllib.parse
        import json

        encoded_query = urllib.parse.quote_plus(query)
        url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_redirect=1&no_html=1"

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "OrePulse-Educational-Simulation/2.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        abstract = data.get("Abstract", "").strip()
        related_topics = [
            t.get("Text", "") for t in data.get("RelatedTopics", [])[:3]
            if isinstance(t, dict) and t.get("Text")
        ]

        results = []
        if abstract:
            results.append({"title": data.get("Heading", "Search Result"), "snippet": abstract})
        for topic in related_topics:
            results.append({"title": "Related", "snippet": topic[:200]})

        return {
            "status": "ok",
            "query": query,
            "message": "Web search completed. Results are non-authoritative and supplementary only.",
            "results": results[:3],
            "authoritative": False,
            "source": "web_search_online",
        }

    except Exception as err:
        logger.debug("Web search failed: %s", err)
        return {
            "status": "error",
            "query": query,
            "message": "Web search encountered an error. Using local mining knowledge base.",
            "results": [],
            "authoritative": False,
            "source": "web_search_error",
        }
