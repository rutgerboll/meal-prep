#!/bin/bash
# Pull the latest app-build from GitHub and restart the running meal-server.py
# so the Mac mini serves the new version. Run this on the Mac mini itself:
#   cd "~/Documents/Claude/Projects/Meal planning/app-build/app" && ./deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LABEL="com.mealplanner.server"
PORT="${MEAL_PORT:-8765}"

cd "$REPO_DIR"

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ $REPO_DIR has uncommitted changes — not pulling. Commit, stash, or discard first." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
echo "→ Pulling latest '$branch' from origin…"
git pull --ff-only origin "$branch"

echo "→ Restarting $LABEL…"
uid="$(id -u)"
if launchctl print "gui/$uid/$LABEL" >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$uid/$LABEL"
  sleep 2
fi

if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ Server is up on port $PORT (via launchd)."
  exit 0
fi

# LaunchAgent isn't managing it (not loaded, or blocked — e.g. no Full Disk
# Access for python3 yet). Fall back to a plain background process so the
# app doesn't stay down after a deploy.
echo "  launchd didn't bring the server up — starting it manually instead."
pkill -f "python3 .*meal-server.py" 2>/dev/null || true
sleep 1
cd "$SCRIPT_DIR"
nohup /usr/bin/python3 meal-server.py > /tmp/mealplanner-server.log 2>&1 < /dev/null &
disown
sleep 2

if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ Server is up on port $PORT (manual background process — see SYNC-SETUP.md to fix the LaunchAgent)."
else
  echo "✗ Server did not come back up. Check /tmp/mealplanner-server.log" >&2
  exit 1
fi
