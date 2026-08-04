# Meal Planner app — session kickoffs

Ready-to-paste prompts. The ▶ NEXT section is the one to run; completed prompts move below
under ✅ for provenance. The final line of every kickoff tells the session to update this file.

## ▶ NEXT: T1.1 — teach `recipe-capture` the three phase-2 recipe keys

T0.1 froze the contract and settled the question Wave 1 was waiting on: all five Claude-side
skills **are** on this filesystem, readable, and none is writable. So T1.1 ships a `SKILL.md`
patch spec plus a user install step (Settings → Capabilities), not an edit in place —
CONTRACT §2 now carries the search incantation and the deliverable shape.

Two things to know before you start, both from `findings/T0.1.md`:

- **Certify the server before you measure on it** — `curl` a real path; a listening port is
  not a working server (LOG [READ-FIRST] #7, CONTRACT §3). It is healthy again as of
  2026-08-04 14:08 after a three-day silent outage of unknown cause.
- **The seed is at `schemaVersion: 3`, not 2.** The brief's "schemaVersion-2 keys" is a
  historical label; the three keys are real and present in today's seed (`image`,
  `thawHoursAhead`, `prepAhead`). Don't go hunting for a v2 seed to match.

Also open, and worth pulling forward if the user prefers: **T0.2** closes a hole that fails
silently and permanently on an installed phone (`scripts/pre-commit` doesn't cover
`app/js/*.js`), and its `deploy.sh` half would also have caught the outage above — the health
check is `lsof … LISTEN`, which a 404ing server passes.

```
Work task T1.1 of the Meal Planner app program in this project.

Setup: run `tm path` to locate the program dir (works from any worktree); all program files
live there. Read first, in order: README.md, CONTRACT.md (now FROZEN at v1.0 — §1's four
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
