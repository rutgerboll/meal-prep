# Meal Planner app — project guide

This Git repository owns the offline-first PWA in `app/` and its task records in
`program/`. The parent `meal-planning/` folder owns the markdown recipe library,
plans, grocery lists, preferences, pantry, purchase units, inventory, and raw cook
feedback. Check the current files and running state before treating dated notes as
current. A draft plan is not active; a grocery list is not purchase evidence; the
dated, approximate `inventory.md` is not a physical stock check. Repeated cook
feedback needs review before it changes recipe counts or inventory.

## Route by task

- For app work, use `program/README.md` for the current file-based process,
  `program/TASKS.md` for the task snapshot, and `program/CONTRACT.md` for evidence
  standards. Read the relevant task brief and findings when one exists.
- For the meal workflow, start in the parent `README.md` and `INTEGRATIONS.md`,
  then use the relevant `planning/`, plan, list, recipe, and feedback files.
- For app behavior or schema, use the relevant parts of `ROADMAP.md`,
  `DESIGN-SYSTEM.md`, `SYNC-SETUP.md`, `spec/`, and parent `plugin-updates/`.
  Proposed skill files do not prove an installed skill changed.

## App boundaries

- The Mac mini serves this checkout's `app/` working tree. An edit under `app/`
  can reach the live server before a commit. Use an isolated worktree and test
  port for exploratory app changes; `program/tasks/T0.14.md` tracks deployment
  separation. A source edit, a healthy server, and an updated installed phone
  are different states.
- `app/build_seed.py` reads the parent library. In another worktree, set
  `MP_BASE_DIR=/Users/rutgerboll/Projects/meal-planning`. `app/seed.json` and
  `app/.thumb-cache.json` are generated; the inline bootstrap seed is refreshed
  by `app/embed_seed.py`. Do not hand-edit generated seed data.
- For cached app code or styles, check the `app/sw.js` cache version and verify
  the installed client update when claiming phone behavior. The pre-commit guard
  is not runtime proof.
- `program/archive/kit-control-plane-2026-09-23/` is history. Its `tm` commands,
  board, inbox, and dated runtime claims are not the current workflow. The
  `feedback-inbox-*.jsonl` files in the parent are app data, not Kit tasks.
