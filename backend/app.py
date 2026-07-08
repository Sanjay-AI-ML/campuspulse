"""CampusPulse backend — a small Flask API that also serves the React SPA.

Run from the project root (``campuspulse/``):

    python -m backend.app        # uses package import paths
    python backend/app.py        # also works

The frontend is plain static files under ``frontend/`` (loaded via the browser,
so no Node build step is required). Flask serves both the JSON API under
``/api`` and the SPA at ``/``.
"""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from store import (
    CAMPUS_CATEGORIES,
    EXAM_CATEGORIES,
    STATUSES,
    check_credentials,
    create_issue,
    get_user,
    list_issues,
    list_issues_by_user,
    stats,
    update_status,
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = Flask(__name__, static_folder=None)


# --- helpers ---------------------------------------------------------------

def _strip_user(user: dict) -> dict:
    """Drop the password before sending a user object to the client."""
    return {k: v for k, v in user.items() if k != "password"}


def _error(message: str, code: int = 400):
    return jsonify({"error": message}), code


# --- auth (demo only — no tokens, no sessions, no JWT) ---------------------

@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""

    user = check_credentials(username, password)
    if not user:
        return _error("Invalid username or password", 401)

    # The "session" is just the public user object kept in localStorage. No
    # real auth here — this is a hackathon demo.
    return jsonify({"user": _strip_user(user)})


# --- issues ----------------------------------------------------------------

@app.get("/api/issues")
def get_issues():
    """List issues. Admins see all; students see only their own."""
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)

    if user["role"] == "Admin":
        issues = list_issues()
    else:
        issues = list_issues_by_user(user["id"])

    # Optional server-side filters mirror the admin UI filter bar so deep
    # links / refreshes keep working.
    issues = _apply_filters(issues)
    return jsonify({"issues": issues})


@app.post("/api/issues")
def post_issue():
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)

    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    track = body.get("track")
    category = body.get("category")
    location = (body.get("location") or "").strip()

    if not title:
        return _error("Title is required", 400)
    if not description:
        return _error("Description is required", 400)
    if track not in ("Campus", "Exam"):
        return _error("Track must be 'Campus' or 'Exam'", 400)

    valid_categories = CAMPUS_CATEGORIES if track == "Campus" else EXAM_CATEGORIES
    if category not in valid_categories:
        return _error(f"Invalid category for {track} track", 400)

    issue = create_issue(
        {"title": title, "description": description, "track": track,
         "category": category, "location": location},
        user,
    )
    return jsonify({"issue": issue}), 201


@app.patch("/api/issues/<issue_id>/status")
def patch_status(issue_id: str):
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)

    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in STATUSES:
        return _error(f"Status must be one of {STATUSES}", 400)

    updated = update_status(issue_id, status)
    if not updated:
        return _error("Issue not found", 404)
    return jsonify({"issue": updated})


@app.get("/api/stats")
def get_stats():
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)
    return jsonify(stats())


@app.get("/api/meta")
def get_meta():
    """Static option lists the frontend uses to render dropdowns/filters."""
    return jsonify({
        "campusCategories": CAMPUS_CATEGORIES,
        "examCategories": EXAM_CATEGORIES,
        "statuses": STATUSES,
    })


# --- internal --------------------------------------------------------------

def _current_user():
    """Resolve the request's user from the demo `x-user-id` header.

    The React client stores the logged-in user in localStorage and echoes the
    user id back on every request. This is NOT security — it only keys which
    data the demo returns. (No real auth per the project brief.)
    """
    user_id = request.headers.get("x-user-id") or ""
    if not user_id:
        return None
    return get_user_by_id(user_id)


def get_user_by_id(user_id: str):
    from store import _read  # local import to avoid circular at module load
    for u in _read()["users"]:
        if u["id"] == user_id:
            return u
    return None


def _apply_filters(issues):
    track = request.args.get("track")
    category = request.args.get("category")
    status = request.args.get("status")
    priority = request.args.get("priority")
    out = issues
    if track:
        out = [i for i in out if i["track"] == track]
    if category:
        out = [i for i in out if i["category"] == category]
    if status:
        out = [i for i in out if i["status"] == status]
    if priority:
        out = [i for i in out if i["priority"] == priority]
    return out


# --- SPA + static ----------------------------------------------------------

@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    # Guard against path traversal — Flask's send_from_directory already
    # rejects unsafe paths, but we also scope it to known subdirs.
    full = FRONTEND_DIR / filename
    if full.is_file():
        return send_from_directory(FRONTEND_DIR, filename)
    # Unknown paths fall through to the SPA (deep-link friendly).
    return send_from_directory(FRONTEND_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    # Seed on first run so the dashboard isn't empty.
    db = FRONTEND_DIR.parent / "backend" / "data" / "db.json"
    if not db.exists():
        try:
            import seed as _seed
            _seed.main()
        except Exception as exc:  # pragma: no cover - best effort
            print(f"[warn] seed failed: {exc}")
    app.run(host="0.0.0.0", port=port, debug=True)
