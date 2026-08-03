# Meal Planner app — board

> **GENERATED from the control DB — do not hand-edit.** Claim/update via `tm` (`tm claim <ID>`, `tm done <ID> --headline … --verdict …`, `tm log <TAG> "…"`). Run `tm render` after out-of-band DB changes. Briefs live in `tasks/`, results in `findings/`.

## Wave 0 — foundation
Gate note: Contract frozen before any Wave 1 task starts.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T0.1 | Verify the build contract against the repo, then freeze it | high | opus | TODO |  |  |  |  |  |  |

## Wave 1 — close the schema loop (skill side)
Gate note: Both skills round-trip a schemaVersion-2 recipe end to end.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T1.1 | Teach recipe-capture the schemaVersion-2 keys (image, thaw_hours_ahead, prep_ahead) | medium | opus | TODO |  | T0.1 |  |  |  |  |
| 2 | T1.2 | Teach meal-planner to nudge an un-captured cookbook-backlog photo | medium | opus | TODO |  | T0.1,T1.1 |  |  |  |  |

## Wave 2 — multi-week planning in-app
Gate note: A 4-week plan builds in-app and its grocery split survives it.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T2.1 | Extend the in-app suggester and builder past 2 weeks | high | opus | TODO |  | T0.1 |  |  |  |  |

## Wave 3 — reminders (revisit)
Gate note: Only opened if in-app Heads up proves insufficient.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T3.1 | Probe iOS PWA push for thaw/prep reminders — feasibility before build | medium | opus | TODO |  | T0.1 |  |  |  |  |
