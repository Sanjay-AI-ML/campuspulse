#!/usr/bin/env bash
# CampusPulse — one-command launcher (macOS/Linux/Git Bash).
#   ./run.sh          -> seed (if needed) + start server
#   ./run.sh --reset  -> wipe DB, reseed, start server
set -euo pipefail
cd "$(dirname "$0")"

# 1) python deps
python -m pip install -q -r requirements.txt

# 2) seed (reset on --reset)
if [[ "${1:-}" == "--reset" ]]; then
  rm -f backend/data/db.json
fi
if [[ ! -f backend/data/db.json ]]; then
  echo "Seeding database…"
  (cd backend && python seed.py)
fi

# 3) run
echo "Starting CampusPulse on http://localhost:${PORT:-5001}"
python backend/app.py
