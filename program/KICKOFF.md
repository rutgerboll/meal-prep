# Meal Planner app — session kickoffs

Ready-to-paste prompts. The ▶ NEXT section is the one to run; completed prompts move below
under ✅ for provenance. The final line of every kickoff tells the session to update this file.

## ▶ NEXT: T0.1 — verify and freeze the contract

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

<!-- completed prompts below -->
