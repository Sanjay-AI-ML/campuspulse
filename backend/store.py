"""JSON file-backed store for CampusPulse.

A tiny, dependency-free persistence layer. The whole database is a single
JSON document (``data/db.json``) loaded into memory and flushed on every
write. Plenty fast for a hackathon prototype and trivially inspectable.
"""

from __future__ import annotations

import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "data" / "db.json"
_LOCK = threading.Lock()

# --- schema constants -------------------------------------------------------

# Allowed tracks + categories. Used by the API for validation and mirrored in
# the React frontend so the two never drift.
CAMPUS_CATEGORIES = [
    "Electrical",
    "Plumbing",
    "Furniture",
    "IT/Wi-Fi",
    "Safety/Security",
    "Cleanliness",
    "Other",
]
EXAM_CATEGORIES = [
    "Hall Ticket Error",
    "Seating Allocation Issue",
    "Timetable Clash",
    "Result Discrepancy",
    "Invigilation Complaint",
    "Other",
]
STATUSES = ["Reported", "In Progress", "Resolved"]

# Anything on the Exam track, or a Safety/Security campus issue, is High.
def compute_priority(track: str, category: str) -> str:
    if track == "Exam":
        return "High"
    if track == "Campus" and category == "Safety/Security":
        return "High"
    return "Medium"


# --- low-level JSON I/O -----------------------------------------------------

def _ensure_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        _write({"users": [], "issues": []})


def _read() -> dict[str, Any]:
    _ensure_db()
    with DB_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _write(data: dict[str, Any]) -> None:
    tmp = DB_PATH.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    os.replace(tmp, DB_PATH)  # atomic on same filesystem


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
    # Highest priority first, then newest first.
    return sorted(
        _read()["issues"],
        key=lambda i: (i["priority"] != "High", -_ts(i["createdAt"]),),
    )


def get_issue(issue_id: str) -> dict[str, Any] | None:
    for i in _read()["issues"]:
        if i["id"] == issue_id:
            return i
    return None


def list_issues_by_user(user_id: str) -> list[dict[str, Any]]:
    return [i for i in list_issues() if i["userId"] == user_id]


def create_issue(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    track = payload["track"]
    category = payload["category"]
    now = datetime.now(timezone.utc).isoformat()
    issue = {
        "id": uuid.uuid4().hex[:12],
        "userId": user["id"],
        "reportedBy": user["name"],
        "title": payload["title"].strip(),
        "description": payload["description"].strip(),
        "track": track,
        "category": category,
        "location": payload.get("location", "").strip(),
        "priority": compute_priority(track, category),
        "status": "Reported",
        "createdAt": now,
        "updatedAt": now,
    }
    with _LOCK:
        data = _read()
        data["issues"].append(issue)
        _write(data)
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


def stats() -> dict[str, int]:
    issues = _read()["issues"]
    counts = {"total": len(issues), "Reported": 0, "In Progress": 0, "Resolved": 0}
    for i in issues:
        counts[i["status"]] = counts.get(i["status"], 0) + 1
    return counts


# --- seed -------------------------------------------------------------------

def _ts(iso: str) -> float:
    try:
        return datetime.fromisoformat(iso).timestamp()
    except (ValueError, TypeError):
        return 0.0
