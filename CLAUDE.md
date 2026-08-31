# Meal Planner app — project guide

The **app** half of the meal-planning system: a keyless, offline-first PWA (`app/`) served
from the Mac mini, seeded from a markdown recipe library that lives **outside this repo**.
Planning is conversational (Claude skills write the markdown); the app is where recipes are
read, shopping happens, and cooks get logged. Background: `ROADMAP.md`, `CONTEXT.md`,
`DESIGN-SYSTEM.md`, `SYNC-SETUP.md`, `spec/spec.md`.

## Task system

Work is organized as tasks of the **program** in `program/`.

<!-- tm:begin router — KIT-OWNED (kit TASK-SYSTEM-SPEC.md §10). `tm sync` replaces everything
between these markers and never a byte outside them. Project-specific landmines belong
outside the fence. Delete the markers to opt out permanently. -->
- `tm` = `python3 ~/Projects/Task-Management/bin/tm.py` (works from any worktree; `tm path` prints the program dir)
- **BOARD.md / LOG.md / INBOX.md are GENERATED — never hand-edit.** Mutate via `tm`:
  `tm claim <ID>` (atomic — failure means another session owns it) · `tm done <ID> --verdict … --headline "…"` · `tm log <TAG> "…"` · `tm add <ID> --wave "…" --title "…" [--reads <ID>] [--touches <path>]`
- **A brief header's dependency lines are the `tm add` flags, verbatim:** `reads:` (a gate — must be `--reads`, and an unmet one refuses an orchestrated spawn) · `touches:` (a lane — must be `--touches`) · `after:` (ordering only, writes no edge, never a defect) · `cites:` (go read this artifact). Program README, "Your brief's header".
- Session start: read program/README.md + CONTRACT.md, **triage program/INBOX.md** (phone-captured notes land there), claim before working.
- **The mandatory read is the Durable rules — `DURABLE-RULES.md` once a project has
  split them out, else GOTCHAS.md's own `## Durable rules` section — plus every LIVE
  [READ-FIRST] entry in LOG.md — never the whole file.** GOTCHAS.md's append-only intake
  below the Durable rules watermark and LOG.md's full history are indexed, not mandatory:
  read an entry only when a durable rule, a brief, or a LOG entry points at it by name. `tm
  context [ID]` prints exactly this tier — program/README.md's checklist, CONTRACT.md,
  the Durable rules section, and every live READ-FIRST entry — labeled, in one call.
- **Feedback about the task system itself** goes in the inbox, never chat — AGENT-NOTICE.md
  carries the exact command and the `--project kit` rule, and every registered project's
  `tm notice` SessionStart hook already puts it in this session's context, so it is not
  restated here (single-sourced, T54.3).
<!-- tm:end router -->
- Board UI: http://localhost:8642 · phone: https://rutgers-mac-mini-2.tailc604f.ts.net:8642

## Landmines specific to this project

- **The recipe library is not in this repo.** `app/build_seed.py` reads `recipes/`,
  `meal-plans/`, `recipe pics/`, `pantry.md`, `preferences.md`, `purchase-units.md`,
  `inventory.md`, `grocery-lists/` from the **parent** directory (`Meal planning/`). From a
  worktree that relative path does not resolve — set `MP_BASE_DIR` to the real parent dir
  before running it.
- **Service-worker cache version.** `app/sw.js` precaches `index.html` *and* every
  `app/js/*.js`. Ship any change to those without bumping `const CACHE` and installed phones
  stay on stale code forever. `scripts/pre-commit` enforces this **only for `index.html`** —
  a JS-only change slips through, so bump it by hand. (Hook lives at `.git/hooks/pre-commit`;
  reinstall with `cp scripts/pre-commit .git/hooks/pre-commit && chmod +x` after a fresh clone.)
- **`app/seed.json` is generated** by `build_seed.py`; `embed_seed.py` refreshes the inline
  bootstrap `const SEED` in `index.html` (thumbnails stripped). Don't hand-edit either.
- **Deploy runs on the Mac mini, not here:** `app/deploy.sh` pulls and kickstarts the
  `com.mealplanner.server` launchd job. It refuses on a dirty checkout by design.
- The Claude-side counterparts (`recipe-capture`, `meal-planner`, `grocery-list`,
  `inventory`, `cook-feedback` skills) are a separate surface. Schema changes here need a
  matching change there, or the markdown stops parsing.
