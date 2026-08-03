# Meal Planner app — CONTRACT

**Status: DRAFT — NOT FROZEN.** Wave 0 (T0.1) must verify this against the actual repo,
fix what's wrong, then freeze it: `🔒 FROZEN <date> by <task> · v1.0 — changes from here
require a [READ-FIRST] LOG entry and a version bump.`

**Contract version:** 0.1 (draft)

> This is a **build** program, not an analysis program. The kit's generic contract counts
> findings about a dataset; this one governs changes to a shipped app that runs on a phone
> the user actually cooks from. The slots are the same (unit, population, instruments,
> comparators, sizing, output, hygiene) — the domain is code and data flow.

## 1. Unit — what a task delivers

The unit is **a shipped, user-visible change to the app or its data pipeline**, not a
commit and not a passing test. A task is done when the change is reachable from the phone.

Two denominators exist and every finding must say which it used:
- **Repo state** — what's on `main` in this checkout.
- **Installed state** — what a phone with the PWA installed actually runs, which lags repo
  state until the service worker re-fetches (see §8). Conversions between them are never
  automatic; state the deploy step that closes the gap.

## 2. Population & window — what's in scope

- **In:** everything under `app/` (the PWA, `sw.js`, `manifest.webmanifest`,
  `build_seed.py`, `embed_seed.py`, `apply-feedback.py`, `meal-server.py`, `deploy.sh`),
  plus `scripts/`, `spec/`, and this program dir.
- **Adjacent, NOT in scope by default:** the Claude-side meal-planning skills
  (`recipe-capture`, `meal-planner`, `grocery-list`, `inventory`, `cook-feedback`) and the
  markdown library in the parent directory. A task may *read* them; changing them is its
  own task and must say so in its brief.
- **Settled data:** the markdown library is authored by the user between sessions. A
  session must re-run `build_seed.py` rather than trusting a `seed.json` from an earlier
  session — a stale seed makes every downstream number wrong.

## 3. Instruments — nothing uncertified may be measured on

Certified surfaces for verifying a change:
- **The running app in a browser** (`meal-server.py`, or the browser pane against
  `app/index.html`) — the only instrument that proves user-visible behavior.
- **`build_seed.py` output** (`seed.json`) — the only certified reading of the markdown
  library. Hand-transcribing a recipe into a test is not a measurement.
- **The console** — a screen is not verified until its console is clean.

Reading the source and reasoning about it is a hypothesis, not a measurement.
Durable facts about these instruments go in `knowledge/`.

## 4. Comparators — ≥2 for any verdict

**One comparator = INCONCLUSIVE, not NO SIGNAL.** Valid pairs for this program:
- code path read + observed behavior in the running app
- observed behavior + the real markdown library's data (not a fixture)
- before/after on the same input + a second, differently-shaped input
- app behavior + what the corresponding Claude-side skill produces

"It should work" plus "the diff looks right" is one comparator, twice.

## 5. Sizing & claims — what you may and may not say

- You may claim a change works **on the surfaces you exercised**. Name them.
- You may **not** claim it works on the phone unless you deployed and opened it there, or
  you explicitly scope the claim to repo state (§1).
- You may **not** generalize from one recipe/plan to the library. Plans vary in length
  (2–4 weeks), meal slots (breakfast/lunch/dinner), and trip count; say which you covered.
- Performance numbers need the input named (`build_seed.py` cold vs. cached differs ~80×).
- A migration claim ("existing installs pick this up") requires testing against an
  *existing* IndexedDB, not a fresh one.

## 6. Output contract — findings/<ID>.md

Required sections, in order: header block (Status / Scope covered / Comparators / Denominator
(repo vs installed) / Prior findings read), Headline, What changed, Evidence, What could
break this, Confidence (+ weakest link), What a full pass needs, Reusable artifact,
Portability annotation.

## 7. Portability annotation

Per change: generic web / this-app-specific / library-schema-specific — and what a new
environment (fresh clone, different phone, empty library) needs instead.

## 8. Tooling hygiene — the traps, with working incantations

- `build_seed.py` from a worktree: the default `../..` does not resolve. Set
  `MP_BASE_DIR=/path/to/Meal planning` first.
- **Bump `const CACHE` in `app/sw.js`** for any change to `index.html` *or* `app/js/*.js`.
  `scripts/pre-commit` only catches `index.html`; a JS-only change ships silently stale.
- `embed_seed.py` after `build_seed.py` when a fresh install must boot with new seed data.
- `deploy.sh` runs **on the Mac mini** and refuses on a dirty checkout — that refusal is
  the safety net, not an obstacle.
- Program artifacts live in the main checkout; `tm path` resolves it from any worktree.

## 9. Benchmarking

A bare "it's faster / cleaner" isn't actionable. Compare against the prior behavior on the
same input, or against the documented intent in `ROADMAP.md` / `DESIGN-SYSTEM.md` /
`spec/spec.md`. `DESIGN-SYSTEM.md` is the benchmark for anything visual.

## 10. Execution model

Restates README §Execution model as binding: **sequential by default.** The seed pipeline,
`seed.json`, and the running server are global mutable state — two sessions rebuilding the
seed at once produce a file neither one measured. Tasks with no shared surface may run in
parallel only when the brief says so explicitly. You are **not** required to be
self-contained — build on your `reads:` predecessors.

## Escape hatch

If your task cannot comply, don't quietly deviate — `tm log SCOPE "…"` saying so.

## Changelog
- 0.1 — draft scaffolded and adapted from the kit's analysis-shaped template to a build
  program; awaiting T0.1 verification.
