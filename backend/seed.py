"""Seed CampusPulse's JSON store with demo users + a realistic issue history.

Idempotent: re-running drops and recreates ``data/db.json`` from scratch.
Run directly:   python -m backend.seed     (from campuspulse/)
            or: python seed.py             (from backend/)
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from store import DB_PATH, compute_priority

# Demo credentials (documented in the README). Passwords are plaintext by
# design — this is a hackathon prototype with no real auth.
SEED_USERS = [
    {
        "id": "u-student",
        "username": "student",
        "password": "student123",
        "role": "Student",
        "name": "Aarav Sharma",
        "email": "aarav.sharma@college.edu",
    },
    {
        "id": "u-admin",
        "username": "admin",
        "password": "admin123",
        "role": "Admin",
        "name": "Priya Nair",
        "email": "priya.nair@college.edu",
    },
]

# (title, desc, track, category, location, reporter name, status, days_ago)
SEED_ISSUES = [
    (
        "Flickering tube light in ECE Lab",
        "The tube light above the third bench in ECE Lab 204 has been flickering for two days. It's distracting during evening labs.",
        "Campus", "Electrical", "ECE Block, Room 204",
        "Aarav Sharma", "In Progress", 2,
    ),
    (
        "Leaking tap near boys' hostel wing B",
        "A tap on the second floor of Wing B won't fully close — steady drip wasting water overnight.",
        "Campus", "Plumbing", "Boys Hostel, Wing B — 2nd Floor",
        "Aarav Sharma", "Reported", 1,
    ),
    (
        "Broken chair in Drawing Hall",
        "Two chairs in the back row of Drawing Hall have snapped backrests. Someone could fall.",
        "Campus", "Furniture", "Drawing Hall, Back Row",
        "Rohit Verma", "Resolved", 9,
    ),
    (
        "Wi-Fi not working in Library reading room",
        "The campus Wi-Fi SSID shows up but no device gets an IP in the library reading room. Happens every afternoon.",
        "Campus", "IT/Wi-Fi", "Central Library — Reading Room",
        "Sneha Iyer", "In Progress", 3,
    ),
    (
        "Loose electrical wire near main gate",
        "A low-hanging wire near the main gate pillar sparks when it rains. Students walk under it constantly.",
        "Campus", "Safety/Security", "Main Gate Pillar 2",
        "Karan Mehta", "In Progress", 1,
    ),
    (
        "Trash bins overflowing in Canteen area",
        "Bins haven't been cleared in the canteen courtyard since yesterday afternoon.",
        "Campus", "Cleanliness", "Canteen Courtyard",
        "Aarav Sharma", "Resolved", 6,
    ),
    (
        "Name misspelled on hall ticket",
        "My hall ticket shows 'Aarav Sarma' instead of 'Aarav Sharma'. Exam is in 3 days, need it corrected before entry.",
        "Exam", "Hall Ticket Error", "Sem 5 — Engineering Mathematics",
        "Aarav Sharma", "In Progress", 1,
    ),
    (
        "Seating allocation clash — same seat two students",
        "Seat B-14 in Hall 3 is allotted to both me and another roll number on the seating sheet.",
        "Exam", "Seating Allocation Issue", "Exam Hall 3, Seat B-14",
        "Divya Reddy", "Reported", 0,
    ),
    (
        "Two exams on the same morning slot",
        "DBMS lab external exam and Engineering Mathematics theory are both scheduled 10:00–12:00 on the 12th.",
        "Exam", "Timetable Clash", "DBMS Lab / Engg Maths",
        "Aarav Sharma", "Reported", 0,
    ),
    (
        "Result discrepancy in Data Structures",
        "Internal marks shown online (28/40) don't match the marks on my evaluated answer sheet (34/40).",
        "Exam", "Result Discrepancy", "Sem 4 — Data Structures",
        "Rohit Verma", "Resolved", 5,
    ),
    (
        "Invigilator did not allow water break",
        "Invigilator in Hall 2 refused a water break during a 3-hour exam despite medical requirement.",
        "Exam", "Invigilation Complaint", "Exam Hall 2, Morning Slot",
        "Sneha Iyer", "In Progress", 2,
    ),
    (
        "Cracked window pane in Civil Dept classroom",
        "Large crack in the classroom window, glass looks ready to fall into the corridor.",
        "Campus", "Other", "Civil Block, Room 110",
        "Divya Reddy", "Reported", 4,
    ),
]


def _user_lookup(users):
    by_name = {u["name"]: u for u in users}
    by_id = {u["id"]: u for u in users}
    # Issues filed by names not in the demo users roll up under the student
    # account so they still show up on the admin board.
    def resolve(name):
        u = by_name.get(name)
        if u:
            return u
        return by_id["u-student"]
    return resolve


def build() -> dict:
    resolve = _user_lookup(SEED_USERS)
    issues = []
    base = datetime.now(timezone.utc) - timedelta(days=10)
    for idx, (title, desc, track, cat, loc, reporter, status, days_ago) in enumerate(SEED_ISSUES):
        user = resolve(reporter)
        created = base + timedelta(days=days_ago, hours=idx)
        updated = created + timedelta(hours=6)
        issues.append({
            "id": f"seed-{idx+1:03d}",
            "userId": user["id"],
            "reportedBy": user["name"],
            "title": title,
            "description": desc,
            "track": track,
            "category": cat,
            "location": loc,
            "priority": compute_priority(track, cat),
            "status": status,
            "createdAt": created.isoformat(),
            "updatedAt": updated.isoformat(),
        })
    return {"users": SEED_USERS, "issues": issues}


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = build()
    with DB_PATH.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    print(f"Seeded {len(data['users'])} users and {len(data['issues'])} issues -> {DB_PATH}")


if __name__ == "__main__":
    main()
