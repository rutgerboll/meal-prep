# Meal Planner app — GOTCHAS

APPEND ONLY (use `tm gotcha "…" [--task ID]`). One bullet per trap, immediately on
discovery — not at end of session. Point at the knowledge/ file if one exists.
- (2026-08-02) app/sw.js precaches index.html AND every app/js/*.js under one `const CACHE`, but scripts/pre-commit only fires on app/index.html. A JS-only change commits clean and ships silently stale to installed phones. Bump CACHE by hand for any app/js/ edit.
- (2026-08-02) build_seed.py resolves the markdown library as ../.. from app/, which does NOT resolve from a git worktree. Set MP_BASE_DIR="/Users/rutgerboll/Documents/Claude/Projects/Meal planning" before running it from a worktree.
- (2026-08-04, T0.1) A listening port is not a working server. com.mealplanner.server held
8765 for days while returning 404 on every static path and 500 on /sync.json — the
LaunchAgent cannot read under ~/Documents without Full Disk Access for /usr/bin/python3.
SYNC-SETUP.md predicts a silent crash-loop; the real behaviour is worse, it stays up. Always
curl a real path. deploy.sh's health check is lsof LISTEN, so it prints the success tick over
exactly this failure. See knowledge/instruments.md. · rutgerboll@Rutgers-Mini#T0.1
- (2026-08-04, T0.1) app/seed.json is server-owned runtime output, not a source file that
someone forgot to commit. meal-server.py re-runs build_seed.py and rewrites it on every
/sync.json request, so the main checkout is permanently dirty and deploy.sh's
dirty-checkout guard refuses every time. A fresh build reproduces the uncommitted copy
byte-for-byte; HEAD's copy is the stale one. Never git add -A here. · rutgerboll@Rutgers-Mini#T0.1
- (2026-08-04, T0.1) build_seed.py does NOT refresh the inline `const SEED` in index.html —
embed_seed.py is a separate, easily-skipped step, and skipping it is currently live: the
committed bootstrap disagrees with the markdown library on 20 plan entries. Invisible while
the mini is up (the app auto-syncs on load), wrong-and-silent on a fresh install when it is
not. · rutgerboll@Rutgers-Mini#T0.1
- (2026-08-04, T0.1) CORRECTS the earlier T0.1 gotcha above that blamed Full Disk Access. The
404-behind-a-live-port outage was real, but the cause was NOT a missing FDA grant: an
accidental pkill killed the stuck process, launchd restarted it, and the fresh process serves
everything correctly under the same plist. Cause unknown. Two rules that do survive — curl a
real path before trusting any server (lsof LISTEN passes on a dead one), and stop your own
test server BY PID (kill $(lsof -ti :8766 -sTCP:LISTEN)), never pkill -f meal-server.py, which
takes the phone's server down with it. · rutgerboll@Rutgers-Mini#T0.1
