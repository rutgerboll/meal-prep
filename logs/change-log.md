# Spec Improver Change Log

## Round 1

---

### M1 — Lunch-salad servings create a grocery aggregation error

**Decision: ACCEPTED with modification**

**Verification:** Confirmed against real data. `chicken-caesar-meal-prep-salad.md` has `servings: 8`. The plan `2026-06-22-two-weeks.md` lists it four times Mon–Thu at `servings: 2` each. Same pattern for `beef-taco-salad.md` (also `servings: 8`, also 4× at `servings: 2`). At naive `scale = 2/8 = 0.25`, the list would show 0.625 lb chicken breast instead of 2.5 lb — a 75% undercount. The evaluator's analysis is exactly correct.

**Why Option B (aggregate) over Option A (single prep-day entry):** The evaluator preferred Option A (salad added once on batch-cook day) but noted the real data uses Option B's pattern (4 repeated entries). Changing the plan data format would require restructuring the seed or silently discarding the existing format. Option B (collapse same `recipeId` + same `meal` tag, sum `servings`) handles the real data exactly as-is, requires no seed restructuring, and is a local rule in Step 0. It's also more general: it handles any case where a meal-prep item is portioned across days.

**What changed in spec:**
- §5.3 Step 0: Added "Lunch-salad / meal-prep deduplication" rule — for any `recipeId` appearing multiple times with the same `meal` tag, collapse to one scaled line item (`totalServings = sum of all entry.servings`; `scale = totalServings / recipe.servings`). Worked example included.
- §7 Lunch-salad row: updated to explicitly state the grocery deduplication behavior with the 2×4=8 example.

---

### M2 — The "pantry" aisle is used for non-staple grocery items; the aisle→store-walk mapping is unresolved

**Decision: ACCEPTED, Option A (retire `aisle: pantry`) implemented at the spec+seed level**

**Verification:** Confirmed. `finish-chicken-tzatziki-bowls.md` has `jasmine or basmati rice` (aisle: pantry), `kalamata olives` (aisle: pantry) — neither a staple. `finish-beef-bolognese.md` has rigatoni, crushed tomatoes, tomato paste, beef broth, all `aisle: pantry`, none staple. These items must appear on the grocery list and need a valid store-walk bucket.

**Why Option A over Option B:** A full mapping table that maps "pantry" to different buckets based on sub-type is exactly what Option B requires, and that's effectively what Option A delivers — just with the correction applied at seed time (permanent fix) rather than at runtime (repeated disambiguation). Retiring `aisle: pantry` from the data model forces a clean answer up front. The mapping table I added to §8 is concrete and covers all the items found in the seed recipes.

**Design defense on the schema:** The evaluator correctly diagnosed that `aisle` was doing double duty as "store location" and "staple marker." The fix separates them cleanly: `aisle` = store location always; `staple: true` = pantry-suppression signal (unchanged, and endorsed by evaluator). The data model note in §4 now explicitly states `pantry` is NOT a valid aisle value.

**What changed in spec:**
- §4 Ingredient table: changed `aisle` enum to remove `pantry`, add `pasta-grains`; added `bakery` bucket clarification; added note that `pantry` is NOT valid and `staple` is the only pantry-suppression mechanism.
- §5.3 Step 6: Replaced the hand-wavy `pantry-grains → Pasta/grains/rice` instruction with a complete 1:1 `aisle → store-walk bucket` mapping table. Added fallback rule (default to Condiments + warning) for legacy `aisle: pantry` that slipped through seed.
- §8 Seed-step corrections: Added explicit aisle re-assignment table covering all `aisle: pantry` items found in seed recipes. Engineer must run this correction pass at seed time.

---

### M3 — The Plan Builder's calorie roll-up for base+finish is underspecified

**Decision: ACCEPTED**

**Verification:** `lemon-herb-chicken-base` has `calories_per_serving: 320`. `finish-chicken-tzatziki-bowls` has `calories_per_serving: 510`. The plan note says "Base serving (~310–320 cal protein) + finish (~490–600 cal) ≈ 800–920 cal for Rutger, ~600–680 cal for wife per dinner." This confirms `caloriesPerServing` is per-person. The evaluator's formula is correct: `pairDinnerCals = (320 + 510) × 2 = 1,660` which is above the 1,400 target — consistent with the plan's note saying "1,400–1,500 cal" for the pair (the tzatziki bowls being on the higher end).

**One modification to the evaluator's proposed warning band:** The evaluator suggested `[1,200, 1,600]`. The real data runs 1,400–1,500 but the formula gives 1,660 for tzatziki on a base+finish night. Using 1,600 as the upper bound would false-positive on a known-good night. I widened the upper band to 1,800 to avoid crying wolf. Lower bound 1,200 is fine (catches genuinely light nights).

**Clarification added:** The grocery algorithm does NOT use calories — it scales by `entry.servings`. This was implied before but is now explicitly stated in both §5.2 and the §7 table.

**What changed in spec:**
- §5.2 Edge cases: Added explicit calorie roll-up formula block with the per-person definition, the base+finish formula, the standalone formula, warning band `[1,200, 1,800]`, and the "display-only" clarification.
- §5.2 Edge cases: Added base-servings unassigned note (from S4, included here as it's logically adjacent).
- §7 table row: Updated to reference the formula and the band.

---

### S1 — Item-alias normalization map is called out but not specified

**Decision: ACCEPTED (minimum viable alias table + seed bootstrapping)**

**Reasoning:** The evaluator is right that two examples don't constitute a specification. However, providing a complete exhaustive alias table in the spec is overkill — the right home for a growing alias map is the app's Purchase Units settings, not the spec doc. The spec's job is to define the minimum required at seed time so the app works correctly on first run.

**What changed in spec:**
- §5.3 Step 1: Replaced the two-example aside with a requirement to bootstrap the alias map from seed recipes, plus explicit required seed-time entries: `"jasmine or basmati rice"` → `"jasmine rice"`, `"ground beef (85/15)"` → `"ground beef"`, `"corn (canned or frozen)"` → `"corn"`, `"chicken thighs (boneless)"` → `"chicken thighs"`, `"romaine lettuce hearts"` → `"romaine"`.
- §8 Seed-step corrections: Added alias map bootstrapping item with the same required entries.

---

### S2 — The "unit" field has implicit constraints that aren't fully specified

**Decision: ACCEPTED**

**Verification:** Real data confirmed: `chicken-caesar-meal-prep-salad.md` has `parmesan: 1 cup grated`; `finish-beef-bolognese.md` has `parmesan: 0.5 cup grated`. Without stripping "grated," these wouldn't aggregate. `Caesar dressing: 1 bottle (12 oz)` needs to become `each` for aggregation purposes. These are real, in-seed examples.

**What changed in spec:**
- §4 Ingredient `unit` field: Added note that qualifier words are stripped before aggregation, and that `"bottle (12 oz)"` becomes `"each"`.
- §5.3 Step 1: Added explicit "Unit cleanup pass" before the family normalization step. Covers `"cup grated"` → `"cup"`, `"bottle (12 oz)"` → `"each"`, `"stalk"` → `"each"`. States that compound count-with-size units look up purchase size by item name from PurchaseUnit.

---

### S3 — Regenerating the grocery list: "preserve checked state for unchanged items" is fragile

**Decision: ACCEPTED**

**Reasoning:** The evaluator's fix is strictly better. Matching on `displayText` would silently clear check state whenever a quantity changed (e.g., going from "~7.5 lb chicken thighs" to "~8.0 lb chicken thighs" due to an added night). Matching on normalized `item` key preserves the in-aisle experience of "I already grabbed this, the amount changed slightly but it's still in my cart." The only case to reset is item removal, which is correct — if an item is no longer on the list, its checked state is moot.

**What changed in spec:**
- §5.3 Output section: Updated "preserves `checked` state" rule to use normalized `item` key, not `displayText`. Described the in-aisle UX rationale.

---

### S4 — Plan Builder missing a "batch-cook day" servings UX explanation

**Decision: ACCEPTED**

**Reasoning:** This is a real edge case. If Rutger plans 3 finish nights of chicken instead of 6, the grocery list will still buy 12 servings of the chicken base — that's correct (that's what the PlanEntry says) — but the unclaimed servings could confuse. An informational note (not a block) surfaces this cleanly. It also addresses the case where someone accidentally sets the base to 6 servings but assigns 6×2=12 servings of finishes.

**What changed in spec:**
- §5.2 Edge cases: Added "If sum of `entry.servings` for all finishes linked to a base is less than the base's `entry.servings`, surface an informational note…" Non-blocking.

---

### S5 — Cook tab "up next" ordering logic not specified

**Decision: ACCEPTED**

**What changed in spec:**
- §6.7: Added explicit sort rule ("sort uncooked entries by `dayDate` ascending; `dayDate: null` goes at end; only entries from active plan"). Also addressed N4 (Week 2 freezer entries) in the same section with a heuristic for identifying likely-frozen repeats.

---

### S6 — "Pantry" aisle items in the recipe data include some that are not pantry staples

**Decision: ACCEPTED (covered jointly with M2)**

The data-level issue (S6) and the algorithmic issue (M2) are two sides of the same problem. The solution handles both: the seed-time aisle re-assignment table in §8 corrects the data; the schema change in §4 prevents new items from using `aisle: pantry`; the Step 6 mapping table gives the implementer a runtime fallback.

---

### N1 — The `PlanEntry.day` field is a free-text string, not a Date

**Decision: ACCEPTED**

**Reasoning:** The evaluator called this "not blocking" but the split `dayDate` + `dayLabel` design is clearly better and costs almost nothing to adopt now. The Cook tab sort (S5) requires `dayDate` anyway, and any future thaw-reminder or "what's cooking tonight" feature would require it too. Adopting it now avoids a migration later.

**What changed in spec:**
- §4 PlanEntry: Replaced single `day: string | null` with `dayDate: string | null` (ISO-8601) + `dayLabel: string | null` (display). 
- §8 Seed-step corrections: Added parsing rule for extracting `dayDate` from the `day:` label string.

---

### N2 — Cookbook backlog photos require bundling large JPEG files

**Decision: ACCEPTED**

**Reasoning:** The evaluator correctly flagged this. ~52 JPEGs could be 50–200 MB — unacceptable for a web app. The fix (placeholder cards; photos imported on demand by user) is the right default. It also happens to match how someone would actually use the app: you pick a recipe to capture, import the photo at that moment, not all 52 upfront.

**What changed in spec:**
- §8 Seed-step corrections: Added item #4 explicitly stating photos are not bundled, filenames only are recorded in `sourcePhotoRef`, and photo display requires explicit user import.
- §5.6 already said the photo was shown "beside the form" — this is now clarified to mean after the user imports it, not from a bundled file.

---

### N3 — "Dismiss" on rule-check banner: does dismissal persist?

**Decision: ACCEPTED**

**What changed in spec:**
- §5.2 rule surfacing: Added per-PlanEntry dismissal semantics.
- §4 PlanEntry: Added `ruleWarningDismissed: boolean` field.

---

### N4 — Week-2 freezer entries in the Cook tab

**Decision: ACCEPTED (handled within S5 fix)**

**Reasoning:** This is a real UX issue — prompting for a full cook log on a "reheat frozen tzatziki bowls" night is friction that undermines the cook feedback flow. A "Mark done" CTA (without requiring the four questions) for inferred freezer entries is the right behavior. The heuristic (same `recipeId` appearing in both week-1 and week-2 dinner slots, week-2 date ≥ 7 days later) is imperfect but correct for the bulk-prep template. The spec notes it's a heuristic and allows the user to still log full feedback if they want.

---

## Self-initiated improvements

### SI-1 — §5.3 Step 6: Store-walk mapping table made complete and 1:1

Even beyond M2's fix, the prior wording ("Map each ingredient `aisle` to one of these buckets (e.g. `pantry`-grains → Pasta/grains/rice…)") left the door open for implementer guessing. The new §5.3 Step 6 provides a complete 10-row explicit mapping table, one row per `aisle` enum value, with a fallback rule and a note about `bakery` placement. Zero ambiguity for the builder.

### SI-2 — §8 seed corrections made a formal numbered list

The seed step was previously three sentences. The corrections needed for the seed (aisle re-mapping, date parsing, alias map, photos) are now a formal numbered list of four required tasks. An engineer can check them off.

### SI-3 — Warning band widened from [1,200, 1,600] to [1,200, 1,800] for calorie soft-warning

The evaluator proposed [1,200, 1,600]. But at 1,660 cal for the Greek chicken night (a known-good plan night per the real plan note), a 1,600 upper bound would generate a false-positive warning on the first real use. I widened to 1,800 to avoid noise on legit higher-calorie combination nights while still catching genuinely off-target nights (e.g., a 2,000-cal night or a 900-cal night).

---

## Convergence assessment

The three must-fix issues are resolved with precise implementer-ready language. All six should-fix issues are accepted and implemented. All four nice-to-haves are addressed (N1 and N4 fully; N2 and N3 with pragmatic solutions). No evaluator critiques were rejected — all were either accepted or accepted-with-modification, where the modification was a reasoned improvement over the evaluator's proposed fix (M1: Option B over Option A; M3: widened warning band).

**One remaining open question to flag for Rutger:** The calorie warning band `[1,200, 1,800]` is a design decision. The real plan hits ~1,660 on the higher-calorie base+finish nights (tzatziki bowls). If Rutger wants the warning to fire on those nights, narrow the upper bound back to 1,600. If not, 1,800 is the right default. This is noted in §10 as a candidate for a 7th open question if needed.

**Expect another round?** One more light pass from the evaluator is likely warranted to verify that the Step 0 deduplication rule is unambiguous (the edge case of a `recipeId` that appears in both `dinner` and `lunch` slots in the same plan hasn't been explicitly addressed — it should deduplicate only within the same `meal` tag, which the rule already says, but the evaluator may want to confirm). No deep design disagreements anticipated.
