# Meal Planner app — board

> **GENERATED from the control DB — do not hand-edit.** Claim/update via `tm` (`tm claim <ID>`, `tm done <ID> --headline … --verdict …`, `tm log <TAG> "…"`). Run `tm render` after out-of-band DB changes. Briefs live in `tasks/`, results in `findings/`.

## Wave 0 — foundation
Gate note: Contract frozen before any Wave 1 task starts.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T0.1 | Verify the build contract against the repo, then freeze it | high | opus | DONE | SIGNAL |  |  |  |  | unknown |  | CONTRACT frozen v1.1; 6 corrections. Found+fixed a 3-day silent sync outage (cause unknown). All 5 skills readable, none writable. | [T0.1](findings/T0.1.md) |

## Wave 1 — close the schema loop (skill side)
Gate note: Both skills round-trip a schemaVersion-2 recipe end to end.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T1.1 | Teach recipe-capture the schemaVersion-2 keys (image, thaw_hours_ahead, prep_ahead) | medium | opus | TODO |  | T0.1 |  |  |  | unknown |  |  |  |
| 2 | T1.2 | Teach meal-planner to nudge an un-captured cookbook-backlog photo | medium | opus | TODO |  | T0.1,T1.1 |  |  |  | unknown |  |  |  |

## Wave 2 — multi-week planning in-app
Gate note: A 4-week plan builds in-app and its grocery split survives it.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T2.1 | Extend the in-app suggester and builder past 2 weeks | high | opus | TODO |  | T0.1 |  |  |  | unknown |  |  |  |

## Wave 3 — reminders (revisit)
Gate note: Only opened if in-app Heads up proves insufficient.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T3.1 | Probe iOS PWA push for thaw/prep reminders — feasibility before build | medium | opus | TODO |  | T0.1 |  |  |  | unknown |  |  |  |

## 0b — pipeline repairs (found by T0.1)
Gate note: The stale-code guard and the deploy health check tell the truth.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T0.2 | Close the two measured pipeline holes: pre-commit misses app/js/*.js, deploy.sh calls a 404ing server healthy | medium | opus | TODO |  | T0.1 |  | scripts/pre-commit,app/deploy.sh |  | unknown |  |  |  |
| 2 | T0.3 | Re-embed the inline SEED bootstrap: index.html disagrees with the library on 20 plan entries | low | opus | TODO |  | T0.1 |  | app/index.html,app/seed.json |  | unknown |  |  |  |
