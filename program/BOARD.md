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
| 1 | T0.2 | Close the two measured pipeline holes: pre-commit misses app/js/*.js, deploy.sh calls a 404ing server healthy | medium | opus | DONE | PASS | T0.1 |  | scripts/pre-commit,app/deploy.sh |  | unknown |  | Hook now guards app/js + app/styles (8 probe commits); deploy.sh health-checks by request. Deploy still blocked on T0.10. | [T0.2](findings/T0.2.md) |
| 2 | T0.3 | Re-embed the inline SEED bootstrap: index.html disagrees with the library on 20 plan entries | low | opus | TODO |  | T0.1 |  | app/index.html,app/seed.json |  | unknown |  |  |  |

## 0c — codebase health (from inbox)
Gate note: The board can measure itself green, and the two audits have landed as evidence.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T0.4 | Spawn-capability bootstrap: a smoke suite the gate can measure, and tm orch config --suite-cmd | medium | opus | TODO |  | T0.1 |  | tests/,scripts/ |  | unknown |  |  |  |
| 2 | T0.5 | UI currency audit: inventory the app's CSS/component conventions vs current practice — audit only, no refactor | medium | opus | TODO |  | T0.1 |  | program/findings/ |  | unknown |  |  |  |
| 3 | T0.6 | Audit the areas wave 0d does not cover — JS coupling, parser surface, sync/migration paths | high | opus | TODO |  | T0.1 |  | program/findings/ |  | unknown |  |  |  |

## 0d — structure & CSS repair
Gate note: One token set, in files, with the app pixel-identical and the phone picking it up.

| # | ID | task | effort | model | status | verdict | reads | blocked on | touches | outputs | sandbox | sandbox reason | headline | findings |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | T0.7 | Extract the inline CSS to app/styles/*.css — zero visual change | high | opus | DONE | PASS | T0.2 |  | app/index.html,app/styles/,app/sw.js,scripts/pre-commit |  | unknown |  | 23,526 bytes of CSS moved to app/styles/*.css — byte-identical source, identical 213-rule CSSOM, SW updated v27->v28. | [T0.7](findings/T0.7.md) |
| 2 | T0.8 | Delete the dead token set and the !important scaffolding it required | medium | opus | TODO |  | T0.7 |  | app/styles/,app/sw.js |  | unknown |  |  |  |
| 3 | T0.9 | One design-system doc: archive the stale 383-line one that claims to be source of truth | low | opus | TODO |  |  |  | DESIGN-SYSTEM.md,design/,docs/ |  | fit | docs only; no app surface, no server, no seed |  |  |
| 4 | T0.10 | dist/: untrack the generated artifacts so deploy.sh's dirty-checkout guard works again | medium | opus | DONE | PASS | T0.2 |  | app/deploy.sh,.gitignore,app/seed.json,app/build_seed.py,app/embed_seed.py,app/meal-server.py |  | unknown |  | Seed untracked; checkout stays clean under a live sync and deploy.sh completed for the first time. Found: FDA really is missing (v1.1 retracted). | [T0.10](findings/T0.10.md) |
| 5 | T0.11 | The directory move: client/ pipeline/ server/ docs/ — only if the earlier steps leave a reason | high | opus | TODO |  | T0.7,T0.8,T0.10 |  | app/,scripts/,docs/,CLAUDE.md |  | unknown |  |  |  |
| 6 | T0.12 | Self-host the heading font — Schibsted Grotesk is fetched from Google and never precached, so it dies offline | low | opus | TODO |  | T0.7 |  | app/index.html,app/styles/,app/sw.js,app/assets/ |  | unknown |  |  |  |
