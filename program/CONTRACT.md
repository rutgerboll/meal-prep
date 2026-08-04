# Meal Planner app — CONTRACT

🔒 **FROZEN 2026-08-04 by T0.1 · v1.1** — changes from here require a [READ-FIRST] LOG entry
and a version bump.

**Contract version:** 1.1 (frozen)

> Every §8 incantation below was run at least once by T0.1 on 2026-08-04. Where the draft
> was wrong, the correction is in the changelog with the evidence in `findings/T0.1.md`.

> This is a **build** program, not an analysis program. The kit's generic contract counts
> findings about a dataset; this one governs changes to a shipped app that runs on a phone
> the user actually cooks from. The slots are the same (unit, population, instruments,
> comparators, sizing, output, hygiene) — the domain is code and data flow.

## 1. Unit — what a task delivers

The unit is **a shipped, user-visible change to the app or its data pipeline**, not a
commit and not a passing test. A task is done when the change is reachable from the phone.

**Four denominators exist, not two**, and every finding must say which it used. The draft's
repo/installed split was too coarse: it hid that *code* and *data* reach the phone by
completely different routes, on different clocks.

1. **Committed state** — what's on `main` at `HEAD`. What GitHub has; what `deploy.sh` pulls.
2. **Working-tree state** — what the main checkout's files say right now. **This is what the
   Mac mini actually serves**: `meal-server.py` serves `app/` off the working tree, not off
   `HEAD`. A change is live to the tailnet the moment it is saved — no commit, no deploy.
3. **Library state** — the markdown in the parent `Meal planning/` dir. **The authoritative
   data.** `/sync.json` re-runs `build_seed.py` on *every request*, so a plan the user edits
   in Claude is live to the phone on its next Sync with no repo action at all.
4. **Installed state** — what a phone with the PWA installed runs. It splits in two:
   - **Data** (recipes, plans, grocery lists) → IndexedDB, refreshed from `/sync.json` on
     every sync, including one automatic sync on app load. Denominator 3 reaches it directly.
   - **App shell** (`index.html`, `app/js/*.js`) → the service-worker cache, which is
     **cache-first and never revalidates**. It refreshes *only* when `const CACHE` in
     `app/sw.js` changes. Denominator 2 reaches it only through a hand-bumped CACHE.

Conversions are never automatic. State the step that closes your gap: a commit (1→ nothing
on its own), a file save on the mini (→2), a user edit in the library (→3), a Sync (3→4 data),
a CACHE bump plus a Sync/reload (2→4 shell).

The inline `const SEED` in `index.html` is a **fifth, narrower** thing: the bootstrap a fresh
install shows *before its first sync*. It only matters when the mini is unreachable — which it
was for three days in August 2026 without anyone noticing (§3).

## 2. Population & window — what's in scope

- **In:** everything under `app/` (the PWA, `sw.js`, `manifest.webmanifest`,
  `build_seed.py`, `embed_seed.py`, `apply-feedback.py`, `meal-server.py`, `deploy.sh`),
  plus `scripts/`, `spec/`, and this program dir.
- **Adjacent, NOT in scope by default:** the Claude-side meal-planning skills
  (`recipe-capture`, `meal-planner`, `grocery-list`, `inventory`, `cook-feedback`) and the
  markdown library in the parent directory. A task may *read* them; changing them is its
  own task and must say so in its brief.
  **All five are readable but none is writable.** They exist only as an extracted, read-only
  snapshot of the desktop plugin `meal-planning` v0.2.0; the plugin's source of record is not
  on this filesystem. Locate them by search, never by a hardcoded path (it embeds session
  UUIDs):
  ```
  find ~/Library/Application\ Support/Claude -type d -name recipe-capture 2>/dev/null
  ```
  A task that "changes a skill" therefore delivers a **SKILL.md patch spec plus a user
  install step** (Settings → Capabilities), never an edit in place. The user's pending
  replacements live in `Meal planning/plugin-updates/` — four of the five; `recipe-capture`
  has none. See `plugin-updates/README-INSTALL.md`.
- **Settled data:** the markdown library is authored by the user between sessions. A
  session must re-run `build_seed.py` rather than trusting a `seed.json` from an earlier
  session — a stale seed makes every downstream number wrong.

## 3. Instruments — nothing uncertified may be measured on

Certified surfaces for verifying a change:
- **The running app in a browser** — the only instrument that proves user-visible behavior.
  **Certify the server before you measure on it. A listening port is not a working server.**
  T0.1 found `com.mealplanner.server` holding port 8765 for days while returning 404 on every
  static path and 500 on `/sync.json`. Always:
  ```
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/index.html
  ```
  A non-200 means restart it — `launchctl kickstart -k gui/$(id -u)/com.mealplanner.server`
  is a measured remedy — and **capture evidence first if you care why**, because the restart
  destroys the specimen. Do not attribute such an outage to Full Disk Access: T0.1 did, and
  was wrong (§Changelog 1.1).
  Prefer your own instance on a spare port whenever your work could disturb the phone's
  server; it works from any checkout, worktrees included:
  ```
  cd app && MP_BASE_DIR="/Users/rutgerboll/Documents/Claude/Projects/Meal planning" MEAL_PORT=8766 python3 meal-server.py
  ```
  Then drive `http://localhost:8766/index.html` in the browser pane. Stop it when you finish —
  **by PID** (`kill $(lsof -ti :8766 -sTCP:LISTEN)`). A `pkill -f meal-server.py` also kills
  the launchd server the phone depends on; T0.1 did that too.
- **`build_seed.py` output** (`seed.json`) — the only certified reading of the markdown
  library. Hand-transcribing a recipe into a test is not a measurement.
- **The console** — a screen is not verified until its console is clean. A clean load of this
  app emits **zero** console messages; treat any output as a finding.
- **IndexedDB and the Cache Storage entry, read from the page** — the only way to tell
  denominator-4 data from denominator-4 shell (§1). `caches.keys()` names the live cache;
  a fetch from inside the page goes through the service worker while `curl` bypasses it, and
  the two disagreeing *is* the staleness measurement.

Reading the source and reasoning about it is a hypothesis, not a measurement.
Durable facts about these instruments go in `knowledge/` — see `knowledge/instruments.md`.

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
  you explicitly scope the claim to one of §1's four denominators by name.
- You may **not** generalize from one recipe/plan to the library. The library as of
  2026-08-04 is 35 recipes / 5 plans / 98 plan entries / 52 cookbook photos; plans vary in
  length (2–4 weeks), meal slots (breakfast/lunch/dinner), and trip count. Say which you
  covered.
- Performance numbers need the input named. Measured on the full library (35 recipes,
  52 photos), `build_seed.py` cold — no `app/.thumb-cache.json`, all 52 thumbnails through
  `sips` — is **7.4 s**; warm is **0.10 s**. That is ~74×, and the cache is per-checkout, so
  a first run in a fresh worktree always pays the cold price.
- A migration claim ("existing installs pick this up") requires testing against an
  *existing* IndexedDB, not a fresh one.

## 6. Output contract — findings/<ID>.md

Required sections, in order: header block (Status / Scope covered / Comparators / Denominator
(which of §1's four) / Prior findings read), Headline, What changed, Evidence, What could
break this, Confidence (+ weakest link), What a full pass needs, Reusable artifact,
Portability annotation.

## 7. Portability annotation

Per change: generic web / this-app-specific / library-schema-specific — and what a new
environment (fresh clone, different phone, empty library) needs instead.

## 8. Tooling hygiene — the traps, with working incantations

Each of these was executed by T0.1 on 2026-08-04. Copy-paste them; don't paraphrase them.

- **`build_seed.py` from a worktree.** The default `../..` resolves to `.claude/worktrees/`
  and the run dies with `FileNotFoundError: .../app/../../recipes` — loudly, before writing
  anything, so there is no silent-bad-seed hazard. Export the base dir first (a leading `cd`
  matters: output always lands in the *invoking* checkout's `app/seed.json`):
  ```
  cd app && MP_BASE_DIR="/Users/rutgerboll/Documents/Claude/Projects/Meal planning" python3 build_seed.py
  ```
  Four `aisle:pantry … not in mapping table` WARNINGs on `lemon-ricotta-pancakes` are the
  known-clean baseline; a fifth is yours.
- **Bump `const CACHE` in `app/sw.js`** for any change to `index.html` *or* `app/js/*.js`.
  Verified by four probe commits: `app/js/*.js` alone **commits clean** (the hook never
  fires); `index.html` alone is blocked; `index.html` + unbumped `sw.js` is blocked;
  `index.html` + bumped `sw.js` passes. And verified end-to-end in a browser: with the file
  changed on the server, `curl` returns the new bytes while a fetch from inside the page
  returns the old ones — until `CACHE` changes, at which point the old cache is deleted and
  the new code is served. For an installed phone the stale state is **permanent**; nothing
  else recovers it.
- **`embed_seed.py` after `build_seed.py`** when a fresh install must boot with new seed
  data. Run from `app/`: it rewrites the inline `const SEED` in `index.html`, stripping
  thumbnails (verified: "52 thumbnails stripped", 1,148,972 B → 129,136 chars — the strip is
  real, and it is the 52 `cookbookBacklog` photos; recipes carry no thumbnails today).
  **`build_seed.py` does not do this for you**, and skipping it is currently live: the
  committed `index.html` bootstrap disagrees with the library on 20 plan entries.
- **`deploy.sh`.** Two corrections to the draft. (a) **This machine *is* the Mac mini**
  (`Rutgers-Mini`, serving `rutgers-mac-mini-2.tailc604f.ts.net`) — "run it on the mini, not
  here" means *run it from the main checkout*, not from a worktree; there is no second host.
  (b) Its dirty-checkout refusal is the safety net, **and it currently fires every time**:
  `meal-server.py` re-runs `build_seed.py` on every `/sync.json` request and rewrites the
  tracked `app/seed.json` in place, so the main checkout is structurally, permanently dirty.
  Treat that file as server-owned runtime output, not as a source file you are free to
  commit (`knowledge/prioritization.md` G5). Note also that `deploy.sh` declares success on
  `lsof` seeing a LISTEN on 8765 — which the currently-broken server satisfies. It can print
  ✓ over a server returning 404 to everything.
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

Two refinements T0.1 verified. **A worktree is a real isolation boundary for the seed:**
`build_seed.py` writes to the invoking checkout's `app/`, and `.thumb-cache.json` is
per-checkout and `.gitignore`d, so a worktree run with `MP_BASE_DIR` set reads shared data
but writes nothing shared. **The port is the contended resource, not the code**: run your own
server on a spare `MEAL_PORT` (§3) rather than touching the launchd job, and stop it when you
are done. The markdown library remains genuinely shared and read-only to a session — no task
so far has needed to write it.

## Escape hatch

If your task cannot comply, don't quietly deviate — `tm log SCOPE "…"` saying so.

## Changelog
- **1.1 (2026-08-04, T0.1) — §3 corrected the same day it was frozen.** LOG [READ-FIRST] #7
  supersedes #4. v1.0 decertified the launchd server and blamed a missing Full Disk Access
  grant, following SYNC-SETUP.md's documented failure mode. **That cause is refuted**: an
  unintended `pkill` killed the stuck process, launchd restarted it, and the fresh process
  serves everything correctly — same plist, same interpreter — including over Tailscale on the
  phone's own URL. The observation survives (a server can hold its port while 404ing to
  everything); the explanation does not, and the true cause is unknown. §3 now certifies by
  `curl`-then-restart rather than by decertifying the server, and warns that a broad `pkill`
  takes the phone's server down with your own.
- **1.0 (2026-08-04, T0.1) — verified against the running system and frozen.** Every §8
  incantation executed at least once; evidence in `findings/T0.1.md`. Changes from 0.1:
  - **§1 rewritten.** Two denominators → four, because code and data reach the phone by
    different routes. New facts: the mini serves the *working tree*, not `HEAD`; `/sync.json`
    rebuilds the seed per request so library edits reach the phone with no repo action; the
    service-worker cache is cache-first and never revalidates. The inline `const SEED` is
    called out as a fresh-install-only bootstrap.
  - **§2 extended.** The Wave-1 blocker is settled: all five Claude-side skills are readable
    (extracted `meal-planning` v0.2.0 plugin snapshot) and none is writable; the search
    incantation and the patch-spec deliverable shape are now in the contract.
  - **§3 corrected.** The launchd server on 8765 is **decertified** — it holds the port while
    serving 404/500. Added the certified own-instance incantation, the "zero console messages"
    baseline, and IndexedDB / Cache Storage as instruments.
  - **§5 corrected.** "~80×" replaced by the measured 7.4 s cold / 0.10 s warm (~74×) with the
    input named; library size pinned for generalization claims.
  - **§6** now says "which of §1's four" instead of "repo vs installed".
  - **§8 rewritten** as copy-pasteable commands. Corrections: the worktree seed trap fails
    loudly (no silent-bad-seed risk); the `app/js/*.js` hook gap is confirmed by probe commit,
    not assumed; `embed_seed.py`'s strip is quantified; **"deploy runs on the Mac mini, not
    here" was wrong — this machine is the mini**; `deploy.sh`'s dirty-checkout refusal fires
    permanently because the server rewrites `app/seed.json`, and its success check can pass
    over a broken server.
  - **§10 extended** with what a worktree does and does not isolate.
- 0.1 — draft scaffolded and adapted from the kit's analysis-shaped template to a build
  program; awaiting T0.1 verification.
