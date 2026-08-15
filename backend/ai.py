"""CampusPulse AI module — agentic LLM features via OpenRouter.

All AI features degrade gracefully: if the API key is missing or the call
fails, each function returns a sensible fallback so the app keeps working.

Features:
  - suggest_category(title, description) -> str
      Auto-categorize an issue from free text.
  - prioritize_issue(title, description, category) -> dict
      Suggest priority + reasoning in one shot.
  - detect_duplicates(title, description, category, open_issues) -> list
      Semantic duplicate detection — smarter than keyword overlap.
  - summarize_issue(issue) -> str
      Admin-facing action summary + suggested resolution.
  - admin_assistant(question, issues, stats) -> str
      Natural language Q&A over the live issue database.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider setup — OpenRouter with openai-compatible SDK
# ---------------------------------------------------------------------------

_client = None
_MODEL = "openai/gpt-4o-mini"   # fast + cheap, great for structured tasks
_MODEL_HEAVY = "openai/gpt-4o-mini"


def _get_client():
    global _client
    if _client is not None:
        return _client
    try:
        from openai import OpenAI
        api_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "http://localhost:5001",
                "X-Title": "CampusPulse",
            },
        )
        return _client
    except Exception as exc:
        logger.warning("AI client init failed: %s", exc)
        return None


def _chat(messages: list[dict], *, temperature: float = 0.2, max_tokens: int = 512) -> str | None:
    """Call OpenRouter and return the assistant text, or None on failure."""
    client = _get_client()
    if client is None:
        return None
    try:
        resp = client.chat.completions.create(
            model=_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content.strip()
    except Exception as exc:
        logger.warning("AI chat call failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Feature 1 — Auto-categorizer
# ---------------------------------------------------------------------------

CATEGORIES = [
    "Electrical / Fan",
    "Projector / AV",
    "Wi-Fi / Network",
    "Plumbing",
    "Furniture",
    "Cleanliness",
    "Safety / Security",
    "Other",
]

SYSTEM_CATEGORIZE = """You are a campus facilities assistant.
Given an issue title and description, pick the BEST category from this list:
- Electrical / Fan
- Projector / AV
- Wi-Fi / Network
- Plumbing
- Furniture
- Cleanliness
- Safety / Security
- Other

Reply with ONLY the category name, exactly as written above. No explanation."""


def suggest_category(title: str, description: str) -> str:
    """Return the most appropriate category for this issue."""
    result = _chat([
        {"role": "system", "content": SYSTEM_CATEGORIZE},
        {"role": "user", "content": f"Title: {title}\nDescription: {description}"},
    ], max_tokens=20)

    if result:
        # Normalize — find closest match
        result = result.strip().strip('"').strip("'")
        for cat in CATEGORIES:
            if cat.lower() in result.lower() or result.lower() in cat.lower():
                return cat
    return "Other"


# ---------------------------------------------------------------------------
# Feature 2 — Priority suggester
# ---------------------------------------------------------------------------

SYSTEM_PRIORITIZE = """You are a campus facilities triage assistant.
Assess the urgency of the reported campus issue and assign a priority.

Rules:
- High: Safety risk, affects large number of students, completely blocks learning (e.g. sparking wire, broken projector in exam hall, entire building's Wi-Fi down)
- Medium: Inconvenient but workaround exists, affects a room or small group
- Low: Minor cosmetic or comfort issue, easily worked around

Respond in JSON:
{
  "priority": "High" | "Medium" | "Low",
  "reason": "one sentence explaining why",
  "urgent": true | false
}"""


def prioritize_issue(title: str, description: str, category: str) -> dict:
    """Return {priority, reason, urgent} dict."""
    result = _chat([
        {"role": "system", "content": SYSTEM_PRIORITIZE},
        {"role": "user", "content": f"Category: {category}\nTitle: {title}\nDescription: {description}"},
    ], max_tokens=120)

    if result:
        try:
            # Strip markdown code fences if present
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[1:])
            if cleaned.endswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[:-1])
            data = json.loads(cleaned)
            if data.get("priority") in ("High", "Medium", "Low"):
                return data
        except Exception:
            pass

    # Fallback: rule-based
    from store import compute_priority, HIGH_PRIORITY_CATEGORIES
    fallback_priority = compute_priority(category)
    return {
        "priority": fallback_priority,
        "reason": "Priority assigned based on category rules.",
        "urgent": fallback_priority == "High",
    }


# ---------------------------------------------------------------------------
# Feature 3 — Semantic duplicate detection
# ---------------------------------------------------------------------------

SYSTEM_DEDUPE = """You are a campus issue deduplication assistant.
Given a NEW issue and a list of EXISTING open issues, identify which existing
issues are likely duplicates or very closely related to the new one.

Return a JSON array of issue IDs that are duplicates. If none, return [].
Only return IDs from the provided list. Maximum 3 matches.

Example: ["abc123", "def456"]"""


def detect_duplicates(
    title: str,
    description: str,
    category: str,
    open_issues: list[dict],
) -> list[dict]:
    """Use LLM to semantically detect duplicate issues. Falls back to keyword matching."""
    if not open_issues:
        return []

    # Build compact issue list for the prompt
    issues_text = "\n".join(
        f'ID:{i["id"]} CAT:{i.get("category","")} TITLE:{i.get("title","")} DESC:{i.get("description","")[:120]}'
        for i in open_issues[:20]  # limit context size
    )

    result = _chat([
        {"role": "system", "content": SYSTEM_DEDUPE},
        {"role": "user", "content": (
            f"NEW ISSUE:\nCategory: {category}\nTitle: {title}\nDescription: {description}\n\n"
            f"EXISTING OPEN ISSUES:\n{issues_text}"
        )},
    ], max_tokens=80)

    matched_ids: list[str] = []
    if result:
        try:
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[1:])
            if cleaned.endswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[:-1])
            matched_ids = json.loads(cleaned)
            if not isinstance(matched_ids, list):
                matched_ids = []
        except Exception:
            pass

    if matched_ids:
        id_set = set(matched_ids)
        return [i for i in open_issues if i["id"] in id_set][:3]

    # Fallback to keyword matching
    from store import find_similar_keyword
    return find_similar_keyword(category, title, description)


# ---------------------------------------------------------------------------
# Feature 4 — Issue summarizer (admin view)
# ---------------------------------------------------------------------------

SYSTEM_SUMMARIZE = """You are a campus facilities manager assistant.
Summarize this reported issue for an admin and suggest a concrete resolution action.

Respond in JSON:
{
  "summary": "2-sentence plain English summary of the issue and its impact",
  "action": "specific recommended action for the admin (who to call, what to check, etc.)",
  "estimated_effort": "Quick fix (< 1hr)" | "Half-day job" | "Needs specialist"
}"""


def summarize_issue(issue: dict) -> dict:
    """Return {summary, action, estimated_effort} for an issue."""
    result = _chat([
        {"role": "system", "content": SYSTEM_SUMMARIZE},
        {"role": "user", "content": (
            f"Category: {issue.get('category')}\n"
            f"Location: {issue.get('location', 'Not specified')}\n"
            f"Title: {issue.get('title')}\n"
            f"Description: {issue.get('description')}\n"
            f"Votes: {len(issue.get('votes', []))}\n"
            f"Priority: {issue.get('priority')}"
        )},
    ], max_tokens=200)

    if result:
        try:
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[1:])
            if cleaned.endswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[:-1])
            data = json.loads(cleaned)
            if "summary" in data:
                return data
        except Exception:
            pass

    return {
        "summary": f"{issue.get('title')} reported at {issue.get('location', 'unknown location')}. {len(issue.get('votes', []))} students have upvoted this issue.",
        "action": "Review the issue details and assign to the appropriate maintenance team.",
        "estimated_effort": "Quick fix (< 1hr)",
    }


# ---------------------------------------------------------------------------
# Feature 5 — Admin natural language assistant
# ---------------------------------------------------------------------------

SYSTEM_ASSISTANT = """You are CampusPulse Admin Assistant — an AI built into a campus issue tracking system.
You help campus admins understand trends, find issues, and take action.

You have access to the LIVE issue database (provided as JSON context).
Answer the admin's question concisely and helpfully. Use bullet points for lists.
If asked for specific issues, name them with their title and status.
Keep answers under 200 words. Be direct and actionable."""


def admin_assistant(question: str, issues: list[dict], stats_data: dict) -> str:
    """Answer admin's natural language question about the issue database."""

    # Build compact context — avoid blowing up the context window
    issues_compact = [
        {
            "id": i["id"],
            "title": i["title"],
            "category": i.get("category"),
            "status": i["status"],
            "priority": i.get("priority"),
            "location": i.get("location", ""),
            "votes": len(i.get("votes", [])),
            "reportedBy": i.get("reportedBy"),
            "createdAt": i.get("createdAt", "")[:10],
        }
        for i in issues[:50]  # cap at 50 issues for context
    ]

    context = (
        f"STATS: {json.dumps(stats_data)}\n"
        f"ISSUES ({len(issues)} total, showing first {len(issues_compact)}):\n"
        f"{json.dumps(issues_compact, indent=None)}"
    )

    result = _chat([
        {"role": "system", "content": SYSTEM_ASSISTANT},
        {"role": "user", "content": f"DATABASE CONTEXT:\n{context}\n\nADMIN QUESTION: {question}"},
    ], temperature=0.3, max_tokens=300)

    return result or "Sorry, I couldn't process that question right now. Please try again."


# ---------------------------------------------------------------------------
# Feature 6 — AI-generated resolution comment
# ---------------------------------------------------------------------------

SYSTEM_RESOLVE = """You are a campus facilities manager.
Write a brief, professional resolution message to be shown to the student
when their issue is marked as Resolved. 2-3 sentences max. Be specific and helpful."""


def generate_resolution_message(issue: dict) -> str:
    """Generate a friendly resolution message for a resolved issue."""
    result = _chat([
        {"role": "system", "content": SYSTEM_RESOLVE},
        {"role": "user", "content": (
            f"Issue title: {issue.get('title')}\n"
            f"Category: {issue.get('category')}\n"
            f"Location: {issue.get('location', 'campus')}"
        )},
    ], max_tokens=100)
    return result or f"Your issue '{issue.get('title')}' has been resolved by our maintenance team. Thank you for reporting it!"
