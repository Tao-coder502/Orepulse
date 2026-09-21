"""Local knowledge retrieval tool for OrePulse agent runtime.

Performs offline keyword-based retrieval over the bundled mining knowledge base.
100% offline — no network calls. Returns domain-relevant snippets as structured context.
"""

import json
import logging
import os
import re
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

_KNOWLEDGE_PATH = os.path.join(os.path.dirname(__file__), "..", "knowledge", "mining_knowledge.json")
_KB_CACHE: List[Dict[str, Any]] = []


def _load_knowledge_base() -> List[Dict[str, Any]]:
    """Load and cache the offline mining knowledge base."""
    global _KB_CACHE
    if _KB_CACHE:
        return _KB_CACHE
    path = os.path.abspath(_KNOWLEDGE_PATH)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _KB_CACHE = data.get("entries", [])
            logger.info("Offline knowledge base loaded: %d entries from %s.", len(_KB_CACHE), path)
    except Exception as err:
        logger.warning("Failed to load offline knowledge base from %s: %s", path, err)
        _KB_CACHE = []
    return _KB_CACHE


def _score_entry(entry: Dict[str, Any], query: str) -> int:
    """Simple keyword-based BM25-like relevance score."""
    query_tokens = set(re.sub(r"[^\w\s]", " ", query.lower()).split())
    score = 0
    keywords: List[str] = entry.get("keywords", [])
    title: str = entry.get("title", "").lower()
    content: str = entry.get("content", "").lower()

    for token in query_tokens:
        if token in keywords:
            score += 3
        if token in title:
            score += 2
        if token in content:
            score += 1
    return score


def query_local_knowledge(query: str, max_results: int = 2) -> Dict[str, Any]:
    """Search the offline mining knowledge base for relevant domain context.

    This tool is 100% offline. It retrieves structured knowledge entries
    relevant to the query using keyword matching.

    Args:
        query: A natural language query about mining operations, safety, or equipment.
        max_results: Maximum number of knowledge entries to return (default 2).

    Returns:
        Dictionary with status, entries, and a combined snippet string.
    """
    entries = _load_knowledge_base()
    if not entries:
        return {
            "status": "unavailable",
            "message": "Offline knowledge base could not be loaded.",
            "entries": [],
            "snippet": "",
        }

    scored = [(e, _score_entry(e, query)) for e in entries]
    scored.sort(key=lambda x: x[1], reverse=True)
    top = [e for e, s in scored[:max_results] if s > 0]

    if not top:
        # Return generic context if no good match
        top = entries[:1]

    snippets = []
    results = []
    for entry in top:
        snippet = f"[{entry['title']}]: {entry['content'][:400]}..."
        snippets.append(snippet)
        results.append({
            "id": entry["id"],
            "topic": entry["topic"],
            "title": entry["title"],
            "snippet": entry["content"][:400] + "...",
            "safety_threshold": entry.get("safety_threshold", ""),
        })

    return {
        "status": "ok",
        "query": query,
        "entries": results,
        "snippet": "\n\n".join(snippets),
        "source": "offline_knowledge_base",
    }
