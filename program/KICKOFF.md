# Meal Planner app — session kickoffs

Ready-to-paste prompts. The ▶ NEXT section is the one to run; completed prompts move below
under ✅ for provenance. The final line of every kickoff tells the session to update this file.

## ▶ NEXT: T0.2 — make the guards tell the truth, then run wave 0d

> **This deliberately disagrees with `tm render`, which says `next: T1.1`.** That is mechanical
> wave ordering, and waves have no reorder verb (filed as kit inbox 475). The user chose this
> sequence explicitly on 2026-08-04 — *"go ahead and wire up the tasks to make these moves then
> we can execute"* — so run wave 0d, and treat T1.1 as queued behind it, not skipped.

**The execution order, and why it is this order.** Nothing here is parallel; the gates are real.

| # | task | why here |
|---|---|---|
| 1 | **T0.2** | Fixes the stale-code hook and the deploy health check. Everything below ships code to an installed phone; do it with working guards, not without. |
| 2 | **T0.10** | Untracks the generated seed so `deploy.sh` can actually run. **This is the rollback path** — restore it before the risky work, not after. |
| 3 | **T0.7** | Extract the CSS to files. Zero visual change, proved by a computed-style diff. |
| 4 | **T0.8** | Now delete the 29 dead tokens and the ~15 `!important`s that only existed to fight them. |
| 5 | **T0.9** | One design-system doc. Independent of all the above — run it any time, including in parallel if you want a cheap win first. |
| 6 | **T0.12** | Self-host the font so the offline app stops silently losing its typography. |
| 7 | **T0.11** | The directory move — **and "not worth doing" is a correct outcome.** Decide after the rest have landed. |

T0.4 (the smoke suite) is not in that chain but pays for itself immediately: there is no
executable test suite in this repo at all, and a basic one would have caught three of T0.1's
findings unaided. Running it early makes every task above cheaper to verify.

```
Work task T0.2 of the Meal Planner app program in this project.

Setup: run `tm path` to locate the program dir. Read first, in order: README.md, CONTRACT.md
(FROZEN v1.1 — §1's four denominators replace "repo vs installed"), tasks/T0.2.md, GOTCHAS.md,
every [READ-FIRST] entry in LOG.md, then findings/T0.1.md, which your Reads names.

Rules that matter most:
- CONTRACT.md is binding and frozen. Verify against reality — do not trust documentation.
- ≥2 comparators for any verdict; one comparator = INCONCLUSIVE, not NO SIGNAL.
- Test the hook, don't read it: throwaway commits on your branch, then `git reset --hard`.
- Do NOT run deploy.sh to test it — it pulls. Exercise its checks in isolation.
- The dirty-checkout guard is T0.10's, not yours. Leave it alone.
- Claim before working: `tm claim T0.2` — if it fails, someone owns it; stop.

Post a short plan first, then proceed. Don't wait for me unless you hit a stop condition.

Stop and tell me if: a dependency isn't DONE, you find something that invalidates other
tasks' assumptions (`tm log READ-FIRST "…"` first), or the task is unanswerable.

Finish by: findings/T0.2.md per CONTRACT §6 · `tm done T0.2 --verdict … --headline "…"` ·
`tm log DONE "…" --task T0.2` · mirror durable learning to knowledge/ + auto-memory ·
update KICKOFF.md with the next prompt (T0.10 unless you learned something that reorders it).
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
  not a working server (LOG [READ-FIRST] #7, CONTRACT §3). It is healthy again as of
  2026-08-04 14:08 after a three-day silent outage of unknown cause.
- **The seed is at `schemaVersion: 3`, not 2.** The brief's "schemaVersion-2 keys" is a
  historical label; the three keys are real and present in today's seed (`image`,
  `thawHoursAhead`, `prepAhead`). Don't go hunting for a v2 seed to match.

Also open: **T0.5** (UI currency audit) and **T0.6** (audit of what wave 0d does not cover).
Both read `knowledge/structure-proposal.md` first — T0.1 already measured a large part of
each, and their briefs tell them to coordinate rather than write the same finding twice.

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
