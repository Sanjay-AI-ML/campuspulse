"""Seed CampusPulse's JSON store with demo users + realistic campus issue history.

Idempotent: re-running drops and recreates data/db.json from scratch.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from store import DB_PATH, compute_priority

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

# (title, desc, category, location, reporter_name, status, days_ago, vote_user_ids)
SEED_ISSUES = [
    (
        "Ceiling fan not working in CSE Lab 301",
        "The ceiling fan in CSE Lab 301 has completely stopped working. The lab gets very hot during afternoon sessions, making it hard to concentrate. Multiple students have complained.",
        "Electrical / Fan", "CSE Block, Room 301",
        "Aarav Sharma", "In Progress", 2,
        ["u-admin"],
    ),
    (
        "Projector flickering in Seminar Hall A",
        "The projector in Seminar Hall A flickers every few minutes and sometimes goes completely black for 30 seconds. Faculty are unable to deliver presentations effectively.",
        "Projector / AV", "Seminar Hall A",
        "Aarav Sharma", "Reported", 1,
        ["u-admin"],
    ),
    (
        "Wi-Fi dead zone near Library reading room",
        "The campus Wi-Fi SSID shows up but no device gets an IP address in the library reading room. This has been happening every afternoon for the past week. Students cannot access online resources.",
        "Wi-Fi / Network", "Central Library — Reading Room",
        "Sneha Iyer", "In Progress", 3,
        ["u-student", "u-admin"],
    ),
    (
        "Sparking electrical wire near main gate",
        "A low-hanging wire near the main gate pillar sparks when it rains. Students walk under it constantly. This is a serious safety hazard that needs immediate attention.",
        "Safety / Security", "Main Gate, Pillar 2",
        "Karan Mehta", "In Progress", 1,
        ["u-student", "u-admin"],
    ),
    (
        "Broken chair in Drawing Hall — back row",
        "Two chairs in the back row of Drawing Hall have snapped backrests. Someone could fall and get injured. Needs immediate replacement.",
        "Furniture", "Drawing Hall, Back Row",
        "Rohit Verma", "Resolved", 9,
        [],
    ),
    (
        "Overflowing trash bins in canteen courtyard",
        "Bins in the canteen courtyard haven't been cleared since yesterday afternoon. The smell is very bad and is affecting students eating in the area.",
        "Cleanliness", "Canteen Courtyard",
        "Aarav Sharma", "Resolved", 6,
        [],
    ),
    (
        "Leaking tap in boys' hostel wing B",
        "A tap on the second floor of Wing B won't fully close — steady drip wasting water all night. Has been like this for 3 days now.",
        "Plumbing", "Boys Hostel, Wing B — 2nd Floor",
        "Aarav Sharma", "Reported", 1,
        ["u-admin"],
    ),
    (
        "No audio output from projector in ECE Lab",
        "The projector in ECE Lab 204 has no audio output. The HDMI cable is connected but sound doesn't come through. Faculty giving video lectures are badly affected.",
        "Projector / AV", "ECE Block, Room 204",
        "Divya Reddy", "Reported", 0,
        ["u-student"],
    ),
    (
        "Wi-Fi very slow in entire ground floor",
        "Internet speed across the entire ground floor of the main academic block is extremely slow — barely 0.5 Mbps. Cannot load course material or attend online classes.",
        "Wi-Fi / Network", "Main Academic Block, Ground Floor",
        "Rohit Verma", "Reported", 0,
        ["u-student", "u-admin"],
    ),
    (
        "Broken window pane in Civil Dept classroom",
        "Large crack running across the classroom window in Civil Block 110. The glass looks ready to fall into the corridor. Rain gets in when windy.",
        "Safety / Security", "Civil Block, Room 110",
        "Divya Reddy", "Reported", 4,
        ["u-admin"],
    ),
    (
        "Fan makes loud grinding noise in Mech Lab",
        "The industrial fan in Mech Lab 102 makes a very loud grinding/screeching noise when running. Cannot hear the faculty or focus on lab work.",
        "Electrical / Fan", "Mech Block, Lab 102",
        "Sneha Iyer", "In Progress", 5,
        ["u-student"],
    ),
    (
        "Toilet flush broken in girls' hostel block C",
        "Two toilet flushes on the first floor of Girls Hostel Block C are broken. Water keeps running continuously. Urgent plumbing needed.",
        "Plumbing", "Girls Hostel, Block C — 1st Floor",
        "Sneha Iyer", "Resolved", 7,
        [],
    ),
]


def _user_lookup(users):
    by_name = {u["name"]: u for u in users}
    by_id = {u["id"]: u for u in users}

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
    for idx, (title, desc, cat, loc, reporter, status, days_ago, vote_ids) in enumerate(SEED_ISSUES):
        user = resolve(reporter)
        created = base + timedelta(days=days_ago, hours=idx)
        updated = created + timedelta(hours=6)
        issues.append({
            "id": f"seed-{idx + 1:03d}",
            "userId": user["id"],
            "reportedBy": user["name"],
            "title": title,
            "description": desc,
            "category": cat,
            "location": loc,
            "photo": None,
            "priority": compute_priority(cat),
            "ai_priority_reason": "",
            "status": status,
            "votes": vote_ids,
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
