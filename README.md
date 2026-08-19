# CampusPulse

> Smart Campus & Exam Issue Reporting and Resolution Tracker — a hackathon
> prototype for Indian college students. Report → track → resolve.

CampusPulse lets students raise **Campus** issues (electrical, plumbing,
Wi-Fi, safety…) and **Exam** issues (hall-ticket errors, seating, timetable
clashes…), while admins get a live console to triage and resolve them.
Exam-track and Safety/Security issues are auto-flagged **High priority** and
pinned to the top of the queue.

Built with a **React + Tailwind** frontend and a **Python/Flask** backend on a
JSON file store — no build step, no database server, runs locally in seconds.

---

## ✨ Features

- **Two roles** — Student & Admin, with a demo login (no real auth).
- **Two issue tracks** with track-aware category dropdowns:
  - **Campus** — Electrical, Plumbing, Furniture, IT/Wi-Fi, Safety/Security, Cleanliness, Other
  - **Exam** — Hall Ticket Error, Seating Allocation Issue, Timetable Clash, Result Discrepancy, Invigilation Complaint, Other
- **Automatic priority** — Exam issues and Safety/Security campus issues are
  flagged **High**, sorted to the top, and visually marked (red border/badge).
- **AI-powered features** (optional, degrades gracefully):
  - 🤖 **Auto-categorize** — LLM suggests the best category from your description
  - 🔍 **Duplicate detection** — semantic AI search finds similar open issues before submission
  - 📊 **Priority assessment** — AI evaluates urgency and explains the rating
  - 📝 **Issue summarization** — admin-facing AI summaries with recommended actions
  - 💬 **Natural language assistant** — admins can ask questions about the issue database
  - 🎯 **Resolution reports** — AI-generated completion summaries when issues are resolved
- **Student dashboard** — report form with a track selector that swaps the
  category list, plus a live list of their own reports with status badges.
- **Admin dashboard** — live stat cards (Total / Reported / In Progress /
  Resolved), a filterable issue table (by track, status, priority, + search),
  and an inline status dropdown on every row.
- **Polished UX** — dark navy (`#131c31`) + mint (`#3ddc97`) theme, rounded
  cards, soft shadows, color-coded status & priority badges, empty states,
  loading states, optimistic status updates, hover/transition micro-interactions.
- **Fully responsive** — table on desktop collapses to cards on mobile.
- **Accessibility** — WCAG AA compliant with aria-labels, keyboard navigation,
  focus indicators, and screen reader support.

---

## 🚀 Quick start

You only need **Python 3.9+**. (Node is *not* required — the React frontend
loads from CDNs.)

### Option A — one command

**macOS / Linux / Git Bash**
```bash
./run.sh
```

**Windows (cmd / PowerShell)**
```bat
run.bat
```

That installs Flask, seeds the database if needed, and starts the server.

### Option B — manual

```bash
cd campuspulse
python -m pip install -r requirements.txt

# seed demo data (first run only)
cd backend && python seed.py && cd ..

# start
python backend/app.py
```

Then open **<http://localhost:5001>**.

> To reset the demo data at any time: `./run.sh --reset` (or `run.bat reset`,
> or just delete `backend/data/db.json` and re-run `seed.py`).

---

## 🤖 Optional: Enable AI features

The app has optional AI integrations for auto-categorization, duplicate detection, 
and priority assessment. It works *without* an API key (gracefully degrades), but to 
enable AI:

**Option 1: Groq (recommended — free tier, fastest)**
```bash
export GROQ_API_KEY="gsk_..."  # Get a free key at groq.com
python backend/app.py
```

**Option 2: Google Gemini (free tier)**
```bash
export GEMINI_API_KEY="your_key..."
python backend/app.py
```

**Option 3: OpenRouter (fallback)**
```bash
export OPENROUTER_API_KEY="sk-..."
python backend/app.py
```

When the app starts, you'll see: `AI features: ENABLED — GROQ / llama-3.3-70b-versatile`  
If you don't set a key, it shows: `AI features: DISABLED` (the app works normally, just without AI).

---

## 🔐 Demo credentials

| Role    | Username  | Password    |
|---------|-----------|-------------|
| Student | `student` | `student123`|
| Admin   | `admin`   | `admin123`  |

On the login screen you can also click a **Demo account** chip to auto-fill.

> Passwords are checked against a hardcoded demo user — there is **no real
> authentication, no JWT, no sessions, no email** by design (hackathon scope).

---

## 🧪 What to try in the demo

1. Log in as **Student** → submit a *Campus* "Safety/Security" issue and an
   *Exam* issue. Watch the form warn you they'll be **High priority**.
2. Log out, log in as **Admin** → your new issues appear at the **top** of the
   board (red left border). Use the status dropdown to move one to
   *In Progress* — the stat cards update instantly.
3. Use the **filters** (Track / Status / Priority / search) to narrow the board.

---

## 🗂️ Project structure

```
campuspulse/
├── README.md
├── requirements.txt          # Flask
├── run.sh / run.bat          # one-command launchers (install + seed + run)
│
├── backend/                  # Flask API + JSON store
│   ├── app.py                #   routes: /api/login, /api/issues, /api/stats …
│   ├── store.py              #   JSON persistence + priority logic
│   ├── seed.py               #   demo users + realistic issue history
│   └── data/db.json          #   ← generated by seed (gitignored)
│
└── frontend/                 # React SPA (CDN, no build step)
    ├── index.html            #   shell + Tailwind theme (navy/mint)
    ├── css/app.css           #   global polish (scrollbars, animations)
    └── js/
        ├── icons.js          #   hand-rolled stroke SVG icon set
        ├── api.js            #   fetch wrapper + localStorage "session"
        ├── components.js     #   login, badges, inputs, cards, toast
        ├── dashboard.js      #   student + admin dashboards, table, filters
        └── app.js            #   root component + routing
```

---

## 🧱 Tech stack

| Layer    | Choice                                              |
|----------|-----------------------------------------------------|
| Frontend | React 18 + Tailwind CSS (via CDN, no bundler)       |
| Backend  | Python / Flask                                      |
| Database | JSON file (`backend/data/db.json`) — zero setup     |
| Icons    | Inline stroke SVGs (no icon font / emoji)           |

**Why no Node/bundler?** The host machine in this build didn't have Node, and
the brief emphasised "easy to run locally with no complex setup." Serving React
via CDN keeps the project runnable with `pip install flask` alone. The code is
still idiomatic React + Tailwind — drop the same `js/*.js` files into a Vite
project and they work as modules with minimal change.

---

## 📡 API reference

All routes are JSON. The client identifies itself with an `x-user-id` header
(the demo "session" from localStorage) — **not security**, just how the
prototype keys which data to return.

| Method | Route                              | Description                                  |
|--------|------------------------------------|----------------------------------------------|
| POST   | `/api/login`                       | Demo login → returns the public user object  |
| GET    | `/api/issues`                      | List issues (admin: all; student: own). Supports `?track=&status=&priority=` |
| POST   | `/api/issues`                      | Create an issue (students)                   |
| PATCH  | `/api/issues/<id>/status`          | Update status (admin only)                   |
| GET    | `/api/stats`                       | Counts: total / Reported / In Progress / Resolved |
| GET    | `/api/meta`                        | Category/status option lists for the UI      |

---

## 🎨 Design notes

- **Status colors** — red `Reported`, amber `In Progress`, green `Resolved`.
- **Priority colors** — red `High`, blue `Medium`.
- **High-priority rows** get a red left border and surface at the top.
- **Micro-interactions** — button press scale, row fade-in on insert, mint
  pulse on optimistic status change, spinner on submit/load.

---

## ⚠️ Scope (intentionally out)

Per the brief, this prototype deliberately **excludes**: payments, real
authentication/JWT, email notifications, and any production hardening. It's a
focused demo of the **report → track → resolve** loop.
