# Planning Architect — Review of the Revised Spec

**Reviewer:** Planning Architect (original spec author)
**Phase:** 3 (planner sign-off)
**Date:** 2026-06-21

## Verdict: APPROVE WITH NOTES

The revisions are faithful to my original design intent and, on the merits, materially improve it. The evaluator/improver loop did exactly what it should: it caught a real data-level bug, closed two genuine specification gaps, and tightened several edges — all without diluting the core principle (recipes as the single structured source of truth; grocery list as a deterministic mechanical sum). I have no wild disagreement and nothing that warrants escalating to Rutger. Approval is the honest call. Below are notes the build team should heed, not blockers.

---

## Rationale — the four headline changes, judged on Rutger's real workflow

### 1. Lunch-salad grocery dedup (Option B: aggregate by recipeId+meal before scaling) — GOOD, and better than my original
This was a genuine bug in my draft. The real plan repeats the Mon–Thu salad at `servings: 2` against a `servings: 8` recipe; naive per-entry scaling buys 25% of the salad and silently under-buys by 75%. That directly violates the app's one promise — "never drops an ingredient." The fix is correct and the choice of Option B over the evaluator's Option A is the right one: it consumes the real data format as-is (no seed restructuring), and the dedup key `(recipeId, meal)` is more general — it correctly keeps the same recipe separate when it appears in both a lunch and a dinner slot. Endorsed without reservation.

### 2. Retiring `aisle: pantry` in favor of a 1:1 aisle→store-walk mapping — GOOD
My original conflated two concepts in one field: `aisle` as store location and `pantry` as a staple marker. That ambiguity would have forced the engineer to invent the store-walk sort. Separating them — `aisle` = store location always; `staple: true` + Pantry catalog = the only suppression mechanism — is cleaner and exactly preserves the locked store-walk order. The complete 10-row mapping table plus the seed-time re-assignment table removes all guesswork. The `bakery → Produce (last)` placement matches the actual Woodman's layout. This is a strict improvement.

### 3. Explicit base+finish calorie roll-up formula — GOOD
`caloriesPerServing` as per-person, `pairDinnerCals = (base.cals + finish.cals) × householdSize`, display-only and explicitly decoupled from the grocery algorithm — this is precisely how the real plan notes compute it (~320 base + ~510 finish, per person). It removes a real source of implementer confusion on the Review screen. Endorsed.

### 4. Widened calorie warning band [1,200–1,800] — GOOD, correctly escalated
My instinct toward a tighter band would have false-positived on a known-good night: the Greek chicken tzatziki pairing computes to 1,660, which the real plan treats as on-target. The wider ceiling avoids crying wolf on legitimate higher-calorie nights while still catching genuine outliers. Crucially, the improver did NOT silently lock this — it's flagged in §10 as a candidate question for Rutger. That is the right disposition for a value judgment about his own targets.

---

## Design intent — preserved

Everything I consider load-bearing survived intact:
- The base+finish double-counting rule (base counted once from its batch entry; finishes add only finishing ingredients) is unchanged and still correct.
- The 6-step deterministic grocery pipeline and "failure mode is buy too much, never drop an ingredient" remain the spine.
- Pantry suppression still requires `staple: true` AND Pantry membership AND all contributions stapled.
- Copy-to-clipboard (never write Notes directly), flat no-header store-walk list, US units, IndexedDB + seed-from-markdown with no live sync — all honored.
- MVP scoping and non-goals untouched.

No scope creep, no reinterpretation of the locked product decisions.

---

## Notes for the build team (heed these — not blockers)

1. **Dedup key is `(recipeId, meal)`, not `recipeId` alone.** When implementing §5.3 Step 0, the collapse must be scoped per `meal` tag so a recipe used in both a lunch and a dinner slot stays as two line groups. The spec says this; make sure the code does too.

2. **Compound/qualified units beyond the listed examples.** The seed contains `"bag (small)"` (tortilla chips) and `"stalk"` (celery) in addition to the spelled-out `"bottle (12 oz)"` / `"cup grated"`. The unit-cleanup rule (strip size/qualifier → treat as `each`, look up package size by item name) covers them generally, but the normalization pass should be written to handle the general pattern, not just the three named examples. Verify against `beef-taco-salad.md` specifically.

3. **Seed-time aisle re-assignment is a hard requirement, not optional.** If any `aisle: pantry` item slips through to runtime, the Step 6 fallback (→ Condiments + warning) is a safety net, NOT the intended path. Run the §8 correction pass and act on its warnings before shipping the seed.

4. **Calorie band is provisional.** Treat [1,200–1,800] as a default to confirm with Rutger, not a locked constant. Build it as a single configurable threshold pair so narrowing to [1,200–1,600] (if he wants warnings on the tzatziki-class nights) is a one-line change, not a refactor.

5. **Freezer/reheat heuristic is a heuristic.** The "same recipeId in week-1 and week-2 dinner slots, ≥7 days apart → likely frozen" rule (§6.7) is correct for the bulk-prep template but will mis-fire if Rutger ever genuinely re-cooks the same dish fresh twice in a fortnight. Keep "Mark done" and the full four-question log both reachable, as the spec already specifies. Don't hard-gate the cook log behind the heuristic.

---

## Escalation

None required. The loop converged on a buildable, internally consistent spec that improves on my draft without departing from its intent. The one live judgment call (calorie band) is already correctly surfaced for Rutger rather than decided behind his back.
