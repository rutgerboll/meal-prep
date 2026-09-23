# Meal Planner app — session kickoffs

Ready-to-paste prompts. The ▶ NEXT section is the one to run; completed prompts move below
under ✅ for provenance. The final line of every kickoff tells the session to update this file.

<!-- tm:begin kickoff-next -->
## ▶ NEXT: T1.1 — Teach recipe-capture the schemaVersion-2 keys (image, thaw_hours_ahead, prep_ahead)
<!-- tm:end kickoff-next -->

Wave 0d is done (T0.2, T0.10, T0.7, T0.8, T0.9, T0.12; T0.11 deferred with reasons). See
STATE.md for what landed. Two cheap, high-value things are left before anything else:

- **T0.3** — the inline `const SEED` in `index.html` still disagrees with the library on **20
  plan entries** (verified again 2026-08-04, post-wave). It is a ten-minute task and it is wrong
  data a fresh install would show. Note the new sharp edge: `app/seed.json` is now
  `.gitignore`d, so committing a wanted seed refresh needs **`git add -f`**.
- **T0.4** — there is still **no executable test suite in this repo at all**. Wave 0d verified
  everything by hand, three times over, and the checks it invented (asset-list agreement,
  bootstrap-vs-seed drift, server health by request) are exactly the suite's first tests. It is
  also the gate on this board ever taking orchestrated workers.

**First, a 30-second fix that unblocks three things.** Full Disk Access was already granted —
but to `/usr/bin/python3`, which is an Xcode *shim*, not python. Grant it to the real
interpreter and the launchd agent starts working:

> System Settings → Privacy & Security → Full Disk Access → `+` → `⌘⇧G` →
> `/Library/Developer/CommandLineTools/usr/bin/python3`

Then `cd app && ./deploy.sh`; the last line should read **"via launchd"**, not "manual
background process". That unblocks production surviving a reboot, **T0.11** (directory move) and
**T0.14** (separate deploy from dev) — the latter two share one plist edit, so do them together.

**T0.14 is the one to read if you only read one.** We currently develop in the directory we
deploy from: an uncommitted edit to `app/index.html` is served to the phone immediately, a merge
to `main` is a deploy, and `deploy.sh`'s pull is a measured no-op. LOG [READ-FIRST] #18.

Read `knowledge/instruments.md` before measuring anything — wave 0d rewrote it, and the
zero-timer measurement pattern plus the `document.fonts.status` gate will save you the hour they
cost T0.7 and T0.8.

```
Work task T0.3 of the Meal Planner app program in this project.

Setup: run `tm path` to locate the program dir. Read first, in order: README.md, CONTRACT.md
(FROZEN v1.2), tasks/T0.3.md, GOTCHAS.md, every [READ-FIRST] entry in LOG.md, then
findings/T0.1.md and knowledge/instruments.md.

Rules that matter most:
- CONTRACT.md is binding and frozen. Verify against reality — do not trust documentation.
- >=2 comparators for any verdict; one comparator = INCONCLUSIVE, not NO SIGNAL.
- app/seed.json is gitignored now: a wanted seed commit needs `git add -f`, deliberately.
- Bumping CACHE is mandatory for any index.html change; the hook will demand it.
- Claim before working: `tm claim T0.3` — if it fails, someone owns it; stop.

Post a short plan first, then proceed. Don't wait for me unless you hit a stop condition.

Stop and tell me if: a dependency isn't DONE, you find something that invalidates other
tasks' assumptions (`tm log READ-FIRST "…"` first), or the task is unanswerable.

Finish by: findings/T0.3.md per CONTRACT §6 · `tm done T0.3 --verdict … --headline "…"` ·
`tm log DONE "…" --task T0.3` · mirror durable learning to knowledge/ + auto-memory ·
update KICKOFF.md with the next prompt (T0.4).
```

## ▷ QUEUED: T1.1 — teach `recipe-capture` the three phase-2 recipe keys

Ready to run, gated on nothing — it is behind wave 0d by the user's choice, not by a
dependency. Pick it up if wave 0d stalls or if you would rather make skill-side progress.

T0.1 froze the contract and settled the question Wave 1 was waiting on: all five Claude-side
skills **are** on this filesystem, readable, and none is writable. So T1.1 ships a `SKILL.md`
patch spec plus a user install step (Settings → Capabilities), not an edit in place —
CONTRACT §2 now carries the search incantation and the deliverable shape.

Two things to know before you start, both from `findings/T0.1.md`:

- **Certify the server before you measure on it** — `curl` a real path; a listening port is
  not a working server (LOG [READ-FIRST] #11, CONTRACT §3). If it is not 200, read
  `/tmp/mealplanner-server.err` *first*. The launchd job still cannot start (Full Disk Access);
  production runs on `deploy.sh`'s manual fallback and dies on reboot.
- **The seed is at `schemaVersion: 3`, not 2.** The brief's "schemaVersion-2 keys" is a
  historical label; the three keys are real and present in today's seed (`image`,
  `thawHoursAhead`, `prepAhead`). Don't go hunting for a v2 seed to match.

Also open: **T0.5** (UI currency audit) and **T0.6** (audit of what wave 0d does not cover).
Both read `knowledge/structure-proposal.md` first — T0.1 already measured a large part of
each, and their briefs tell them to coordinate rather than write the same finding twice.

```
Work task T1.1 of the Meal Planner app program in this project.

Setup: run `tm path` to locate the program dir (works from any worktree); all program files
live there. Read first, in order: README.md, CONTRACT.md (FROZEN at v1.2 — §1's four
denominators replace "repo vs installed"), tasks/T1.1.md (incl. Amendments), GOTCHAS.md,
every [READ-FIRST] entry in LOG.md, then findings/T0.1.md, which your Reads names.
Do not re-derive what any of those already establish — especially where the skills live,
what a session may do to them, and how to serve the app.

Rules that matter most:
- CONTRACT.md is binding and frozen. Verify against reality — do not trust documentation.
- ≥2 comparators for any verdict; one comparator = INCONCLUSIVE, not NO SIGNAL.
- The skills are READ-ONLY. Deliver a SKILL.md patch spec + a user install step, not an edit.
- Stay in scope; state your coverage honestly in your headline.
- Claim before working: `tm claim T1.1` — if it fails, someone owns it; stop.

Post a short plan first, then proceed. Don't wait for me unless you hit a stop condition.

Stop and tell me if: a dependency isn't DONE, you find something that invalidates other
tasks' assumptions (`tm log READ-FIRST "…"` first), or the task is unanswerable.

Finish by: findings/T1.1.md per CONTRACT §6 · `tm done T1.1 --verdict … --headline "…"` ·
`tm log DONE "…" --task T1.1` · mirror durable learning to knowledge/ + auto-memory ·
update KICKOFF.md with the next prompt.
```

<!-- completed prompts below -->

## ✅ T0.1 — verify and freeze the contract

**Done 2026-08-04 · SIGNAL.** CONTRACT frozen (v1.0, amended to v1.1 the same day) with six
corrections; the production server was found serving 404/500 behind a live port and is now
healthy again, cause unknown; all five skills located and confirmed read-only.
`findings/T0.1.md`.

`program/CONTRACT.md` was drafted during onboarding by adapting the kit's analysis-shaped
template into a **build** contract — repo-state vs installed-state denominators, the running
app as the only instrument that proves user-visible behavior, ≥2 comparators. None of it has
been checked against a running app or a real seed build. T0.1 exercises it, fixes what's
wrong, and freezes it at v1.0, because every later task is bound by whichever version it
reads. It also settles the one question all of Wave 1 hangs on: whether the Claude-side
meal-planning skills are even reachable from a session on this machine.

```
Work task T0.1 of the Meal Planner app program in this project.

Setup: run `tm path` to locate the program dir (works from any worktree); all program files
live there. Read first, in order: README.md, CONTRACT.md, tasks/T0.1.md (incl. Amendments),
GOTCHAS.md, every [READ-FIRST] entry in LOG.md, then the findings named in your brief's Reads.
Do not re-derive what any of those already establish.

Rules that matter most:
- CONTRACT.md is binding. Verify it against reality — do not trust documentation alone.
- ≥2 comparators for any verdict; one comparator = INCONCLUSIVE, not NO SIGNAL.
- Stay in scope; state your coverage honestly in your headline.
- Claim before working: `tm claim T0.1` — if it fails, someone owns it; stop.

Post a short plan first, then proceed. Don't wait for me unless you hit a stop condition.

Stop and tell me if: a dependency isn't DONE, you find something that invalidates other
tasks' assumptions (`tm log READ-FIRST "…"` first), or the task is unanswerable.

Finish by: findings/T0.1.md per CONTRACT §6 · `tm done T0.1 --verdict … --headline "…"` ·
`tm log DONE "…" --task T0.1` · mirror durable learning to knowledge/ + auto-memory ·
update KICKOFF.md with the next prompt.
```
