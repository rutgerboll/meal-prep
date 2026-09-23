# Meal Planner app — project guide

This repository contains the keyless, offline-first PWA in `app/`. The markdown
recipe, plan, pantry, and grocery library is in the parent `meal-planning/`
directory. The app serves that library through `app/meal-server.py`; planning
and recipe writing happen through the meal-planning skills. Start with
`ROADMAP.md`, `CONTEXT.md`, `DESIGN-SYSTEM.md`, `SYNC-SETUP.md`, and `spec/spec.md`
as needed.

## Working on the app

Read `program/README.md` for the current file based task process and
`program/TASKS.md` for the task snapshot. Read a task's brief and relevant
findings before acting. The original Kit board, inbox, log, contract, and
kickoff prompts are archived under `program/archive/kit-control-plane-2026-09-23/`.
Their `tm` commands and dated runtime claims are historical, not instructions.

Use `program/CONTRACT.md` for verification standards. Check the current app,
data, and Git state before reporting a task done; a local source edit does not
prove what an installed phone runs. Record findings in `program/findings/` and
update `program/TASKS.md` manually when task status changes.

## App specific traps

- `app/build_seed.py` reads `recipes/`, `meal-plans/`, `recipe pics/`,
  `pantry.md`, `preferences.md`, `purchase-units.md`, `inventory.md`, and
  `grocery-lists/` from the parent directory. In another Git worktree, set
  `MP_BASE_DIR=/Users/rutgerboll/Projects/meal-planning` before running it.
- `app/seed.json` and `app/.thumb-cache.json` are generated runtime files.
  `app/embed_seed.py` separately refreshes the inline bootstrap seed in
  `app/index.html`. Do not hand edit either seed.
- `app/sw.js` caches the shell, scripts, styles, and assets. Bump `const CACHE`
  for changes to cached files and verify that installed clients receive them.
  `scripts/pre-commit` is a guard, not a substitute for checking.
- The current Mac mini serves the `app-build/app` working tree. An edit there
  can reach the live app immediately. Check `program/tasks/T0.14.md` before
  changing that deployment arrangement. Use a separate worktree and test port
  for exploratory app changes.
- The Claude meal-planning skills are a separate surface. Schema changes may
  require corresponding skill updates; `plugin-updates/` in the parent project
  contains proposed replacements.
