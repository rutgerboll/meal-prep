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

# Health, not liveness. A LISTEN on the port proves only that something bound
# it: on 2026-08-01 this server held port 8765 for three days while answering
# 404 to every path and 500 to /sync.json, and an lsof check called that "up".
# Ask it for the two things the phone actually needs and read the status codes.
#
# The two checks have deliberately different shapes. Serving a static file is
# instant, so poll it to wait out startup. /sync.json re-runs build_seed.py on
# every request, which is ~0.1s warm but takes minutes on a cold
# .thumb-cache.json (52 photos through `sips`) — measured here, where a 45s
# ceiling produced a false negative on a fresh worktree. Polling a rebuild
# would multiply that, so it gets one attempt with a generous ceiling.
shell_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT/index.html" 2>/dev/null; }

wait_healthy() {
  ok=""
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ "$(shell_code)" = "200" ] && { ok=1; break; }
    sleep 1
  done
  [ -n "$ok" ] || return 1

  echo "  app shell OK — checking /sync.json (rebuilds the seed; slow on a cold thumbnail cache)…"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 300 "http://127.0.0.1:$PORT/sync.json" 2>/dev/null)"
  if [ "$code" != "200" ]; then
    echo "  /sync.json returned '${code:-no response}' — the phone cannot sync against this." >&2
    return 1
  fi
}

echo "→ Restarting $LABEL…"
uid="$(id -u)"
if launchctl print "gui/$uid/$LABEL" >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$uid/$LABEL"
  sleep 2
fi

if wait_healthy; then
  echo "✓ Server is up and serving on port $PORT (via launchd)."
  exit 0
fi

if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  something is listening on $PORT but not serving — replacing it." >&2
fi

# LaunchAgent isn't managing it, or it came up unhealthy. Fall back to a plain
# background process so the app doesn't stay down after a deploy.
echo "  launchd didn't bring a healthy server up — starting one manually instead."

# Kill by PORT, not by name. `pkill -f meal-server.py` matches every instance on
# the machine, including a session's own test server on another port — that is
# how T0.1 restarted production by accident (CONTRACT §3).
port_pid="$(lsof -ti ":$PORT" -sTCP:LISTEN 2>/dev/null || true)"
[ -n "$port_pid" ] && kill $port_pid 2>/dev/null || true
sleep 1
cd "$SCRIPT_DIR"
nohup /usr/bin/python3 meal-server.py > /tmp/mealplanner-server.log 2>&1 < /dev/null &
disown

if wait_healthy; then
  echo "✓ Server is up and serving on port $PORT (manual background process — see SYNC-SETUP.md to fix the LaunchAgent)."
else
  echo "✗ Server did not come back up healthy. Check /tmp/mealplanner-server.log" >&2
  exit 1
fi
