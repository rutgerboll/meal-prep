# Meal Planner app — GOTCHAS

APPEND ONLY (use `tm gotcha "…" [--task ID]`). One bullet per trap, immediately on
discovery — not at end of session. Point at the knowledge/ file if one exists.
- (2026-08-02) app/sw.js precaches index.html AND every app/js/*.js under one `const CACHE`, but scripts/pre-commit only fires on app/index.html. A JS-only change commits clean and ships silently stale to installed phones. Bump CACHE by hand for any app/js/ edit.
- (2026-08-02) build_seed.py resolves the markdown library as ../.. from app/, which does NOT resolve from a git worktree. Set MP_BASE_DIR="/Users/rutgerboll/Documents/Claude/Projects/Meal planning" before running it from a worktree.
