"""CampusPulse AI module — agentic LLM features.

Provider priority (first available key wins):
  1. GROQ_API_KEY      → Groq (llama-3.3-70b-versatile) — fastest, free tier
  2. GEMINI_API_KEY    → Google Gemini (gemini-1.5-flash) — free tier
  3. OPENROUTER_API_KEY → OpenRouter (gpt-4o-mini) — fallback

All AI features degrade gracefully: if no key is set, returns sensible fallback.

Features:
  - suggest_category(title, description) -> str
  - prioritize_issue(title, description, category) -> dict
  - detect_duplicates(title, description, category, open_issues) -> list
  - summarize_issue(issue) -> dict
  - admin_assistant(question, issues, stats) -> str
  - generate_resolution_message(issue) -> str
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider setup — auto-detect from env
# ---------------------------------------------------------------------------

_client = None
_MODEL = None
_PROVIDER = None


def _load_env():
    """Load .env from project root if present."""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    env_path = os.path.normpath(env_path)
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    if k.strip() not in os.environ:
                        os.environ[k.strip()] = v.strip()


def _get_client():
    global _client, _MODEL, _PROVIDER
    if _client is not None:
        return _client

    _load_env()

    # 1. Groq — fastest, free tier
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            from openai import OpenAI
            _client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_key,
            )
            _MODEL = "llama-3.3-70b-versatile"
            _PROVIDER = "groq"
            logger.info("AI provider: Groq (%s)", _MODEL)
            return _client
        except Exception as exc:
            logger.warning("Groq init failed: %s", exc)

    # 2. Gemini via OpenAI-compatible endpoint
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if gemini_key:
        try:
            from openai import OpenAI
            _client = OpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=gemini_key,
            )
            _MODEL = "gemini-1.5-flash"
            _PROVIDER = "gemini"
            logger.info("AI provider: Gemini (%s)", _MODEL)
            return _client
        except Exception as exc:
            logger.warning("Gemini init failed: %s", exc)

    # 3. OpenRouter fallback
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            from openai import OpenAI
            _client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
                default_headers={
                    "HTTP-Referer": "http://localhost:5001",
                    "X-Title": "CampusPulse",
                },
            )
            _MODEL = "openai/gpt-4o-mini"
            _PROVIDER = "openrouter"
            logger.info("AI provider: OpenRouter (%s)", _MODEL)
            return _client
        except Exception as exc:
            logger.warning("OpenRouter init failed: %s", exc)

    logger.warning("No AI API key found. AI features disabled.")
    return None


def get_provider_info() -> dict:
    """Return current AI provider info for the /api/ai/status endpoint."""
    _get_client()
    return {
        "provider": _PROVIDER or "none",
        "model": _MODEL or "none",
        "available": _client is not None,
    }


def _chat(messages: list[dict], *, temperature: float = 0.2, max_tokens: int = 512) -> str | None:
    """Call the configured LLM. Returns assistant text or None on failure."""
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
        logger.warning("AI chat call failed (%s): %s", _PROVIDER, exc)
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


# ---------------------------------------------------------------------------
# Feature 7 — AI Completion Report (on resolve)
# ---------------------------------------------------------------------------

SYSTEM_COMPLETION_REPORT = """You are a campus facilities manager writing an internal completion report.
Given a resolved issue, produce a structured JSON completion report.

Respond in JSON:
{
  "headline": "one-line summary of what was fixed (max 12 words)",
  "what_was_done": "2-3 sentences describing the resolution action taken",
  "impact": "who benefited and how (1-2 sentences)",
  "prevention_tip": "one actionable tip to prevent this issue recurring",
  "follow_up_required": true | false,
  "follow_up_note": "only if follow_up_required is true — what still needs to be done"
}"""


def generate_completion_report(issue: dict, resolution_hours: float) -> dict:
    """Generate a detailed AI completion report for a resolved issue."""
    result = _chat([
        {"role": "system", "content": SYSTEM_COMPLETION_REPORT},
        {"role": "user", "content": (
            f"Issue title: {issue.get('title')}\n"
            f"Category: {issue.get('category')}\n"
            f"Location: {issue.get('location', 'campus')}\n"
            f"Description: {issue.get('description', '')[:300]}\n"
            f"Priority: {issue.get('priority')}\n"
            f"Votes (students affected): {len(issue.get('votes', []))}\n"
            f"Resolution time: {resolution_hours:.1f} hours"
        )},
    ], max_tokens=280)

    if result:
        try:
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[1:])
            if cleaned.endswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[:-1])
            data = json.loads(cleaned)
            if "headline" in data:
                return data
        except Exception:
            pass

    return {
        "headline": f"{issue.get('category', 'Issue')} resolved at {issue.get('location', 'campus')}",
        "what_was_done": f"The reported issue has been addressed by the maintenance team.",
        "impact": f"{len(issue.get('votes', []))} student(s) were affected. The issue has been resolved.",
        "prevention_tip": "Schedule regular maintenance inspections to catch issues early.",
        "follow_up_required": False,
        "follow_up_note": "",
    }
