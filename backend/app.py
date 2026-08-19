"""CampusPulse backend — Flask API + agentic AI features.

Serves the React SPA and JSON API under /api.
AI routes are under /api/ai and degrade gracefully when unavailable.
"""

from __future__ import annotations

import os
import uuid
import logging
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from store import (
    CAMPUS_CATEGORIES,
    STATUSES,
    check_credentials,
    create_issue,
    get_issue,
    get_user,
    list_issues,
    list_issues_by_user,
    stats,
    analytics,
    toggle_vote,
    find_similar_keyword,
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
UPLOAD_DIR = Path(__file__).resolve().parent / "data" / "uploads"
ALLOWED_EXT = {"jpg", "jpeg", "png", "gif", "webp"}

app = Flask(__name__, static_folder=None)
CORS(app)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# --- helpers ---------------------------------------------------------------

def _strip_user(user: dict) -> dict:
    return {k: v for k, v in user.items() if k != "password"}


def _error(message: str, code: int = 400):
    return jsonify({"error": message}), code


def _current_user():
    user_id = request.headers.get("x-user-id") or request.args.get("_uid") or ""
    if not user_id:
        return None
    return _get_user_by_id(user_id)


def _get_user_by_id(user_id: str):
    from store import _read
    for u in _read()["users"]:
        if u["id"] == user_id:
            return u
    return None


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


def _apply_filters(issues):
    """Apply query filters with validation."""
    category = request.args.get("category", "").strip()
    status = request.args.get("status", "").strip()
    priority = request.args.get("priority", "").strip()
    q = (request.args.get("q") or "").lower().strip()
    
    out = issues
    
    # Validate filters against known values
    from store import CAMPUS_CATEGORIES, STATUSES, PRIORITIES
    if category and category in CAMPUS_CATEGORIES:
        out = [i for i in out if i.get("category") == category]
    if status and status in STATUSES:
        out = [i for i in out if i["status"] == status]
    if priority and priority in PRIORITIES:
        out = [i for i in out if i.get("priority") == priority]
    if q and len(q) > 1:  # Require at least 2 chars for search
        searchable = (
            i.get("title", "") + " " +
            i.get("description", "") + " " +
            i.get("location", "") + " " +
            i.get("reportedBy", "") + " " +
            i.get("category", "")
        ).lower()
        out = [i for i in out if q in searchable]
    
    return out


# --- auth ------------------------------------------------------------------

@app.post("/api/login")
def login():
    try:
        body = request.get_json(silent=True) or {}
        username = (body.get("username") or "").strip()
        password = body.get("password") or ""
        
        if not username or not password:
            return _error("Username and password required", 400)
        
        if len(username) < 2 or len(password) < 1:
            return _error("Invalid credentials format", 400)
        
        user = check_credentials(username, password)
        if not user:
            return _error("Invalid username or password", 401)
        
        return jsonify({"user": _strip_user(user)})
    except Exception as exc:
        logger.error(f"Login error: {exc}")
        return _error("Login failed. Please try again.", 500)


# --- issues ----------------------------------------------------------------

@app.get("/api/issues")
def get_issues():
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)
    issues = list_issues() if user["role"] == "Admin" else list_issues_by_user(user["id"])
    issues = _apply_filters(issues)
    return jsonify({"issues": issues})


@app.post("/api/issues")
def post_issue():
    try:
        user = _current_user()
        if not user:
            return _error("Unauthorized", 401)

        photo_filename = None

        # Support both multipart (with photo) and JSON
        if request.content_type and "multipart" in request.content_type:
            form = request.form
            title = (form.get("title") or "").strip()
            description = (form.get("description") or "").strip()
            category = form.get("category")
            location = (form.get("location") or "").strip()
            ai_priority = form.get("ai_priority") or None
            ai_priority_reason = form.get("ai_priority_reason") or ""

            file = request.files.get("photo")
            if file and file.filename and _allowed_file(file.filename):
                UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
                ext = file.filename.rsplit(".", 1)[1].lower()
                photo_filename = f"{uuid.uuid4().hex}.{ext}"
                file.save(UPLOAD_DIR / photo_filename)
                logger.info(f"Photo uploaded: {photo_filename}")
        else:
            body = request.get_json(silent=True) or {}
            title = (body.get("title") or "").strip()
            description = (body.get("description") or "").strip()
            category = body.get("category")
            location = (body.get("location") or "").strip()
            ai_priority = body.get("ai_priority") or None
            ai_priority_reason = body.get("ai_priority_reason") or ""

        # Comprehensive validation
        if not title or len(title) < 3:
            return _error("Title required (min 3 chars)", 400)
        if not description or len(description) < 10:
            return _error("Description required (min 10 chars)", 400)
        if category not in CAMPUS_CATEGORIES:
            return _error(f"Invalid category. Must be one of: {', '.join(CAMPUS_CATEGORIES)}", 400)
        if title.isspace() or description.isspace():
            return _error("Title and description cannot be whitespace only", 400)

        # Duplicate detection — try AI first, fallback to keyword
        open_issues = [i for i in list_issues() if i["status"] != "Resolved"]
        try:
            from ai import detect_duplicates
            similar = detect_duplicates(title, description, category, open_issues)
            logger.debug(f"AI duplicate detection found {len(similar)} similar issues")
        except Exception as exc:
            logger.warning(f"AI duplicate detection failed, using fallback: {exc}")
            similar = find_similar_keyword(category, title, description)

        issue = create_issue(
            {
                "title": title,
                "description": description,
                "category": category,
                "location": location,
                "photo": photo_filename,
                "ai_priority": ai_priority,
                "ai_priority_reason": ai_priority_reason,
            },
            user,
        )
        
        logger.info(f"Issue created: {issue['id']} by {user['name']}")
        return jsonify({"issue": issue, "similar": similar}), 201
    
    except Exception as exc:
        logger.error(f"Issue creation error: {exc}")
        return _error("Failed to create issue. Please try again.", 500)


@app.patch("/api/issues/<issue_id>/status")
def patch_status(issue_id: str):
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)

    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in STATUSES:
        return _error(f"Status must be one of {STATUSES}", 400)

    from store import update_status, get_issue
    # Grab the issue BEFORE updating so we can compute resolution time
    issue_before = get_issue(issue_id)
    updated = update_status(issue_id, status)
    if not updated:
        return _error("Issue not found", 404)

    resolution_message = None
    completion_report = None

    if status == "Resolved" and issue_before:
        # Compute resolution time in hours
        try:
            from datetime import datetime
            created = datetime.fromisoformat(issue_before["createdAt"])
            resolved = datetime.fromisoformat(updated["updatedAt"])
            resolution_hours = max(0.1, (resolved - created).total_seconds() / 3600)
        except Exception:
            resolution_hours = 0

        try:
            from ai import generate_resolution_message, generate_completion_report
            resolution_message = generate_resolution_message(updated)
            completion_report = generate_completion_report(updated, resolution_hours)
            completion_report["resolution_hours"] = round(resolution_hours, 1)
            completion_report["votes"] = len(updated.get("votes", []))
        except Exception:
            pass

    return jsonify({
        "issue": updated,
        "resolution_message": resolution_message,
        "completion_report": completion_report,
    })


@app.patch("/api/issues/<issue_id>/vote")
def patch_vote(issue_id: str):
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)
    result = toggle_vote(issue_id, user["id"])
    if result == "own":
        return _error("You cannot vote on your own issue", 400)
    if result == "notfound":
        return _error("Issue not found", 404)
    return jsonify({"issue": result})


@app.get("/api/stats")
def get_stats():
    user = _current_user()
    if not user:
        return _error("Unauthorized", 401)
    return jsonify(stats())


@app.get("/api/analytics")
def get_analytics():
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)
    return jsonify(analytics())


@app.get("/api/meta")
def get_meta():
    return jsonify({
        "campusCategories": CAMPUS_CATEGORIES,
        "statuses": STATUSES,
    })


# --- AI routes -------------------------------------------------------------

@app.post("/api/ai/suggest-category")
def ai_suggest_category():
    """Auto-categorize an issue from title + description."""
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    if not title and not description:
        return _error("title or description required", 400)
    try:
        from ai import suggest_category
        category = suggest_category(title, description)
        return jsonify({"category": category})
    except Exception as exc:
        return jsonify({"category": "Other", "error": str(exc)})


@app.post("/api/ai/prioritize")
def ai_prioritize():
    """Suggest priority + reasoning for an issue."""
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    category = body.get("category") or "Other"
    if not title:
        return _error("title required", 400)
    try:
        from ai import prioritize_issue
        result = prioritize_issue(title, description, category)
        return jsonify(result)
    except Exception as exc:
        return jsonify({"priority": "Medium", "reason": "Could not assess priority.", "urgent": False, "error": str(exc)})


@app.post("/api/ai/summarize")
def ai_summarize():
    """Generate an admin-facing action summary for an issue."""
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)
    body = request.get_json(silent=True) or {}
    issue_id = body.get("issue_id")
    issue = get_issue(issue_id) if issue_id else None
    if not issue:
        return _error("Issue not found", 404)
    try:
        from ai import summarize_issue
        result = summarize_issue(issue)
        return jsonify(result)
    except Exception as exc:
        return jsonify({
            "summary": issue.get("description", "")[:200],
            "action": "Assign to maintenance team.",
            "estimated_effort": "Quick fix (< 1hr)",
            "error": str(exc),
        })


@app.post("/api/ai/assistant")
def ai_assistant():
    """Admin natural language Q&A over the issue database."""
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)
    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return _error("question required", 400)
    try:
        from ai import admin_assistant
        issues = list_issues()
        stats_data = stats()
        answer = admin_assistant(question, issues, stats_data)
        return jsonify({"answer": answer})
    except Exception as exc:
        return jsonify({"answer": f"Error: {str(exc)}"})


@app.post("/api/ai/duplicates")
def ai_duplicates():
    """Check for semantic duplicates before submission."""
    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    description = (body.get("description") or "").strip()
    category = body.get("category") or "Other"
    if not title:
        return _error("title required", 400)
    try:
        open_issues = [i for i in list_issues() if i["status"] != "Resolved"]
        from ai import detect_duplicates
        similar = detect_duplicates(title, description, category, open_issues)
        return jsonify({"similar": similar})
    except Exception as exc:
        similar = find_similar_keyword(category, title, description)
        return jsonify({"similar": similar, "fallback": True})


@app.get("/api/ai/status")
def ai_status():
    """Return which AI provider is active."""
    try:
        from ai import get_provider_info
        return jsonify(get_provider_info())
    except Exception:
        return jsonify({"provider": "none", "model": "none", "available": False})


# --- CSV Export -----------------------------------------------------------

@app.get("/api/export/csv")
def export_csv():
    """Export issues as CSV. Supports ?status=&category=&priority= filters."""
    user = _current_user()
    if not user or user["role"] != "Admin":
        return _error("Admin access required", 403)

    import csv, io
    from datetime import datetime, timezone

    issues = list_issues()
    issues = _apply_filters(issues)

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Title", "Category", "Location", "Priority", "Status",
        "Votes", "Reporter", "Reported At", "Last Updated",
        "Resolution Time (hrs)", "AI Priority Reason", "Has Photo", "Description",
    ])

    for i in issues:
        # Resolution time: only for resolved issues
        res_hours = ""
        if i.get("status") == "Resolved":
            try:
                created = datetime.fromisoformat(i["createdAt"])
                updated = datetime.fromisoformat(i["updatedAt"])
                res_hours = round((updated - created).total_seconds() / 3600, 1)
            except Exception:
                pass

        writer.writerow([
            i.get("id", ""),
            i.get("title", ""),
            i.get("category", ""),
            i.get("location", ""),
            i.get("priority", ""),
            i.get("status", ""),
            len(i.get("votes", [])),
            i.get("reportedBy", ""),
            i.get("createdAt", "")[:19].replace("T", " "),
            i.get("updatedAt", "")[:19].replace("T", " "),
            res_hours,
            i.get("ai_priority_reason", ""),
            "Yes" if i.get("photo") else "No",
            i.get("description", "").replace("\n", " ")[:200],
        ])

    # Build filename with current date + active filters
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filter_parts = []
    if request.args.get("status"):    filter_parts.append(request.args.get("status").replace(" ", "-"))
    if request.args.get("category"):  filter_parts.append(request.args.get("category").replace(" / ", "-").replace(" ", "-"))
    if request.args.get("priority"):  filter_parts.append(request.args.get("priority"))
    suffix = "_" + "_".join(filter_parts) if filter_parts else ""
    filename = f"campuspulse_issues_{now}{suffix}.csv"

    from flask import Response
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        }
    )


# --- uploads + static ------------------------------------------------------

@app.get("/uploads/<path:filename>")
def serve_upload(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:filename>")
def static_files(filename: str):
    full = FRONTEND_DIR / filename
    if full.is_file():
        return send_from_directory(FRONTEND_DIR, filename)
    return send_from_directory(FRONTEND_DIR, "index.html")


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    db = Path(__file__).resolve().parent / "data" / "db.json"
    if not db.exists():
        try:
            import seed as _seed
            _seed.main()
        except Exception as exc:
            print(f"[warn] seed failed: {exc}")
    print(f"  CampusPulse running on http://localhost:{port}")
    try:
        from ai import get_provider_info
        info = get_provider_info()
        if info["available"]:
            print(f"  AI features: ENABLED — {info['provider'].upper()} / {info['model']}")
        else:
            print("  AI features: DISABLED — set GROQ_API_KEY or GEMINI_API_KEY in .env")
    except Exception:
        print("  AI features: DISABLED")
    app.run(host="0.0.0.0", port=port, debug=True)
