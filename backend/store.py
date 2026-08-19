"""JSON file-backed store for CampusPulse — PS-4 FixIt edition.

A tiny, dependency-free persistence layer. The whole database is a single
JSON document (``data/db.json``) loaded into memory and flushed on every
write. Plenty fast for a hackathon prototype and trivially inspectable.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "data" / "db.json"
_LOCK = threading.Lock()
logger = logging.getLogger(__name__)

# --- schema constants -------------------------------------------------------

CAMPUS_CATEGORIES = [
    "Electrical / Fan",
    "Projector / AV",
    "Wi-Fi / Network",
    "Plumbing",
    "Furniture",
    "Cleanliness",
    "Safety / Security",
    "Other",
]

STATUSES = ["Reported", "In Progress", "Resolved"]
PRIORITIES = ["High", "Medium", "Low"]

# High priority triggers
HIGH_PRIORITY_CATEGORIES = {"Safety / Security", "Electrical / Fan"}


def compute_priority(category: str) -> str:
    if category in HIGH_PRIORITY_CATEGORIES:
        return "High"
    return "Medium"


# --- low-level JSON I/O -----------------------------------------------------

def _ensure_db() -> None:
    """Ensure DB directory and file exist."""
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not DB_PATH.exists():
            _write({"users": [], "issues": []})
            logger.info(f"Initialized new database at {DB_PATH}")
    except OSError as e:
        logger.error(f"Failed to ensure database: {e}")
        raise


def _read() -> dict[str, Any]:
    """Read and parse DB with error recovery."""
    _ensure_db()
    try:
        with DB_PATH.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
            # Validate structure
            if not isinstance(data, dict):
                raise ValueError("DB root must be a dictionary")
            if "users" not in data or "issues" not in data:
                logger.warning("DB missing required keys, reinitializing")
                data = {"users": [], "issues": []}
                _write(data)
            return data
    except json.JSONDecodeError as e:
        logger.error(f"DB corruption detected: {e}, recovering from backup")
        # Try to read backup if it exists
        backup_path = DB_PATH.with_suffix(".json.bak")
        if backup_path.exists():
            try:
                with backup_path.open("r", encoding="utf-8") as fh:
                    return json.load(fh)
            except Exception:
                pass
        # If all else fails, reinitialize
        data = {"users": [], "issues": []}
        _write(data)
        return data
    except Exception as e:
        logger.error(f"Unexpected error reading DB: {e}")
        raise


def _write(data: dict[str, Any]) -> None:
    """Write data with atomic transaction and backup."""
    try:
        # Validate data structure before writing
        if not isinstance(data, dict) or "users" not in data or "issues" not in data:
            raise ValueError("Invalid DB structure")
        
        # Create backup before writing
        if DB_PATH.exists():
            backup_path = DB_PATH.with_suffix(".json.bak")
            try:
                with DB_PATH.open("r", encoding="utf-8") as src:
                    with backup_path.open("w", encoding="utf-8") as dst:
                        dst.write(src.read())
            except Exception as e:
                logger.warning(f"Failed to create backup: {e}")
        
        # Atomic write via temp file
        tmp = DB_PATH.with_suffix(".json.tmp")
        with tmp.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
        os.replace(tmp, DB_PATH)  # atomic on same filesystem
        logger.debug(f"Successfully wrote DB with {len(data.get('issues', []))} issues")
    except Exception as e:
        logger.error(f"Failed to write DB: {e}")
        # Clean up temp file if it exists
        tmp = DB_PATH.with_suffix(".json.tmp")
        try:
            if tmp.exists():
                tmp.unlink()
        except Exception:
            pass
        raise


# --- user helpers -----------------------------------------------------------

def get_user(username: str) -> dict[str, Any] | None:
    for u in _read()["users"]:
        if u["username"].lower() == username.lower():
            return u
    return None


def check_credentials(username: str, password: str) -> dict[str, Any] | None:
    user = get_user(username)
    if user and user["password"] == password:
        return user
    return None


# --- issue helpers ----------------------------------------------------------

def list_issues() -> list[dict[str, Any]]:
    """Sort: High priority first, then by vote count desc, then newest first."""
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    return sorted(
        _read()["issues"],
        key=lambda i: (
            priority_order.get(i.get("priority", "Medium"), 1),
            -len(i.get("votes", [])),
            -_ts(i["createdAt"]),
        ),
    )


def get_issue(issue_id: str) -> dict[str, Any] | None:
    for i in _read()["issues"]:
        if i["id"] == issue_id:
            return i
    return None


def list_issues_by_user(user_id: str) -> list[dict[str, Any]]:
    return [i for i in list_issues() if i["userId"] == user_id]


def create_issue(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    """Create a new issue with comprehensive validation."""
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a dictionary")
    
    if not isinstance(user, dict) or not user.get("id"):
        raise ValueError("Invalid user object")
    
    category = payload.get("category", "Other").strip()
    title = payload.get("title", "").strip()
    description = payload.get("description", "").strip()
    location = payload.get("location", "").strip()
    
    # Validate title
    if not title:
        raise ValueError("Issue title cannot be empty")
    if len(title) < 5:
        raise ValueError("Issue title must be at least 5 characters")
    if len(title) > 200:
        raise ValueError("Issue title cannot exceed 200 characters")
    
    # Validate description
    if not description:
        raise ValueError("Issue description cannot be empty")
    if len(description) < 10:
        raise ValueError("Issue description must be at least 10 characters")
    if len(description) > 5000:
        raise ValueError("Issue description cannot exceed 5000 characters")
    
    # Validate location
    if not location:
        raise ValueError("Issue location cannot be empty")
    if len(location) < 3:
        raise ValueError("Issue location must be at least 3 characters")
    if len(location) > 200:
        raise ValueError("Issue location cannot exceed 200 characters")
    
    # Validate category
    if category not in CAMPUS_CATEGORIES:
        raise ValueError(f"Invalid category: {category}")
    
    now = datetime.now(timezone.utc).isoformat()

    # AI-suggested priority overrides default if provided and valid
    priority = payload.get("ai_priority")
    if priority not in PRIORITIES:
        priority = compute_priority(category)

    issue = {
        "id": uuid.uuid4().hex[:12],
        "userId": user.get("id", ""),
        "reportedBy": user.get("name", "Unknown"),
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "photo": payload.get("photo"),          # filename or None
        "priority": priority,
        "ai_priority_reason": payload.get("ai_priority_reason", "").strip()[:500],
        "status": "Reported",
        "votes": [],
        "createdAt": now,
        "updatedAt": now,
    }
    
    with _LOCK:
        data = _read()
        data["issues"].append(issue)
        _write(data)
        logger.info(f"Created issue {issue['id']} by user {user.get('id')} in category {category}")
    
    return issue


def update_status(issue_id: str, status: str) -> dict[str, Any] | None:
    if status not in STATUSES:
        return None
    with _LOCK:
        data = _read()
        for issue in data["issues"]:
            if issue["id"] == issue_id:
                issue["status"] = status
                issue["updatedAt"] = datetime.now(timezone.utc).isoformat()
                _write(data)
                return issue
    return None


def toggle_vote(issue_id: str, user_id: str) -> dict[str, Any] | str:
    """Toggle upvote. Returns updated issue or error string."""
    with _LOCK:
        data = _read()
        for issue in data["issues"]:
            if issue["id"] == issue_id:
                if issue.get("userId") == user_id:
                    return "own"   # can't vote own issue
                votes = issue.setdefault("votes", [])
                if user_id in votes:
                    votes.remove(user_id)
                else:
                    votes.append(user_id)
                issue["updatedAt"] = datetime.now(timezone.utc).isoformat()
                _write(data)
                return issue
    return "notfound"


def find_similar_keyword(category: str, title: str, description: str, limit: int = 3) -> list[dict[str, Any]]:
    """Fast keyword-based duplicate detection (fallback when AI is unavailable)."""
    STOPWORDS = {
        "the", "a", "an", "is", "in", "at", "of", "and", "or", "to",
        "i", "my", "not", "it", "this", "that", "for", "on", "was",
        "are", "be", "but", "with", "have", "has", "been", "its",
    }
    words = set((title + " " + description).lower().split()) - STOPWORDS
    if len(words) < 2:
        return []
    results = []
    for issue in _read()["issues"]:
        if issue.get("status") == "Resolved":
            continue
        if issue.get("category") != category:
            continue
        candidate_words = set(
            (issue.get("title", "") + " " + issue.get("description", "")).lower().split()
        )
        overlap = words & candidate_words
        if len(overlap) >= 2:
            results.append((len(overlap), issue))
    results.sort(key=lambda x: -x[0])
    return [r[1] for r in results[:limit]]


def stats() -> dict[str, int]:
    issues = _read()["issues"]
    counts: dict[str, Any] = {
        "total": len(issues),
        "Reported": 0,
        "In Progress": 0,
        "Resolved": 0,
    }
    for i in issues:
        counts[i["status"]] = counts.get(i["status"], 0) + 1
    return counts


def analytics() -> dict[str, Any]:
    """Per-category breakdown by status, sorted by total descending."""
    issues = _read()["issues"]
    cats: dict[str, Any] = {}
    for i in issues:
        cat = i.get("category", "Other")
        if cat not in cats:
            cats[cat] = {"Reported": 0, "In Progress": 0, "Resolved": 0, "total": 0, "votes": 0}
        cats[cat][i["status"]] = cats[cat].get(i["status"], 0) + 1
        cats[cat]["total"] += 1
        cats[cat]["votes"] += len(i.get("votes", []))
    return dict(sorted(cats.items(), key=lambda x: -x[1]["total"]))


# --- seed -------------------------------------------------------------------

def _ts(iso: str) -> float:
    try:
        return datetime.fromisoformat(iso).timestamp()
    except (ValueError, TypeError):
        return 0.0
