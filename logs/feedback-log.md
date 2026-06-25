# Evaluator Feedback Log

---

## Round 1

**Overall verdict:** Do NOT sign off as-is. The spec is impressively thorough in many respects — data model, store-walk details, workflow coverage — but has three must-fix issues that would cause a builder to either ship broken behavior or make consequential design guesses. One of those (the lunch-salad servings discrepancy) is a direct data-level conflict found by comparing the spec to the real plan files. The other two are specification gaps that block the implementer from writing correct code. Once those three are resolved, convergence should be fast; no deep philosophical disagreements here.

---

### Must-fix issues

#### M1 — Lunch-salad servings create a grocery aggregation error

**Problem:** The real plan (`2026-06-22-two-weeks.md`) has the chicken-caesar salad at `servings: 8` *in the recipe* and scheduled Mon–Thu with `servings: 2` per PlanEntry. That means each day's entry is 2 out of 8 servings, so the grocery scale = 2/8 = 0.25. But the salad is meant to serve 2 people lunch on each of 4 days — it needs to be bought in full (the whole recipe's ingredients, scaled to 8) and eaten over 4 days. The current algorithm — which mechanically scales per PlanEntry — would generate a grocery list showing 25% of the salad's ingredients, badly under-buying. 

In practice, the Chicken Caesar recipe calls for 2.5 lb chicken breast and 3 romaine hearts. At 0.25 scale the list would say 0.625 lb chicken breast and 0.75 romaine hearts — not nearly enough for four lunches for two.

**Why it matters:** This is the exact "list never drops an ingredient" guarantee the app's one-sentence promise is built on. Silently under-buying groceries by 75% would be a serious failure on first real use.

**Concrete fix:** The spec must define how meal-prep salads (and any multi-day-prep recipe) appear in a plan and how the grocery algorithm handles them. Two clean options:
- Option A (preferred — matches real data): The salad is added to the plan **once** (on the prep day, e.g. Sun batch-cook), at **full recipe servings (8)**, tagged `meal: lunch`. The Mon–Thu "lunch" entries are display-only notes (or child references) — they do NOT generate grocery lines, only the parent prep-day entry does.
- Option B: Accept the 4× repeated PlanEntries but deduplicate in the grocery step: if the same `recipeId` appears in multiple entries with the same `meal: lunch` context, aggregate them and treat the sum of `entry.servings` as the scale.

Option A is simpler and closer to the real file (which lists the prep-day cook, not individual servings). The spec should state the rule unambiguously.

#### M2 — The "pantry" aisle is used for non-staple grocery items; the aisle→store-walk mapping is unresolved

**Problem:** Looking at the real recipe data: `finish-chicken-tzatziki-bowls.md` has `jasmine or basmati rice` with `aisle: pantry` and `kalamata olives` with `aisle: pantry`. Neither is a staple — both must appear on the grocery list. The `finish-beef-bolognese.md` similarly lists rigatoni, crushed tomatoes, tomato paste, beef broth as `aisle: pantry`. 

The spec in §4 defines the `aisle` enum with a `pantry` value and in §5.3 Step 6 says "Map each ingredient `aisle` to one of these buckets (e.g. `pantry`-grains → Pasta/grains/rice; `pantry`-canned → Canned…)." But this is a hand-wavy instruction, not a computable rule. The store-walk order has 10 buckets and none of them is "pantry." An implementer reading the spec cannot write the store-walk sort with certainty: does rigatoni (aisle: pantry) go to Pasta/grains/rice? What about olive oil (aisle: pantry, staple: true) when it's NOT subtracted? What about capers or mustard (aisle: pantry in some recipes)?

The `aisle` field is doing double duty as both a "category hint" and a "pantry staple marker" — these are two distinct concepts conflated into one field.

**Why it matters:** The store-walk ordering algorithm — a core feature — cannot be deterministically implemented from this spec. A builder would have to invent a mapping table without guidance, and will likely get it wrong for the edge cases.

**Concrete fix:** Two approaches, pick one:
- Option A (cleanest): Retire `aisle: pantry` as a value entirely. Instead: the `staple` boolean already signals "might be in pantry." The `aisle` field should be the *store location*, never a staple marker. Change the real recipes so rice is `aisle: pasta-grains`, olive oil is `aisle: spices`, canned goods are `aisle: canned`, condiments are `aisle: condiments`. The pantry subtraction logic uses `staple: true` + Pantry catalog, not `aisle: pantry`.
- Option B (lighter lift): Keep `aisle: pantry` but add a mandatory mapping table in the spec: a complete mapping from every possible `aisle` value to one of the 10 store-walk buckets, with tie-breaking rules. Every edge case ("pantry" → check sub-type, default to "condiments" or a defined fallback) must be spelled out.

The spec must be unambiguous here because this mapping table drives the core shopping-list sort.

#### M3 — The Plan Builder's calorie roll-up for base+finish is underspecified for the grocery vs. display use case

**Problem:** §5.2 and §7 both say "calories = base serving + finish serving per dinner." But the base is cooked at 12 servings and split across 6 dinner nights (6 servings in week 1, 6 frozen for week 2). When a finish recipe has `servings: 2`, the base contributes `12 / 6 nights = 2 base servings` per dinner night — i.e., `2 × 320 cal` = 640 cal from the base for 2 people on that night. The finish adds its `2 × 510 cal` = 1,020 cal. Total pair = 1,660 cal, above target.

But looking at the real calorie note in the plan: "Base serving (~310–320 cal protein) + finish (~490–600 cal) ≈ 800–920 cal for Rutger, ~600–680 cal for wife per dinner." The plan is clearly computing calories at the *per-person* level, not the full 2-serving pair level. The spec doesn't state whether `caloriesPerServing` means per-person or per-pair, or how to compute the roll-up from a base (12 servings) + finish (2 servings) pairing.

**Why it matters:** The calorie roll-up display in the Plan Review screen (the "soft warning") will be wrong or incoherent if the formula isn't defined. It will also confuse the engineer building the review screen. This is computable from first principles by reading the data, but an implementer shouldn't have to derive it — the spec should state it.

**Concrete fix:** Add an explicit formula to §5.2 and §7:
- `caloriesPerServing` = per **person** serving (consistent with recipe files: lemon-herb-chicken = 320 cal/person, finish-tzatziki = 510 cal/person).
- For a dinner night pairing base + finish: `pairDinnerCals = (baseCalPerServing × 2) + (finishCalPerServing × 2)` where the `× 2` is for the 2-person household.
- For standalone recipes: `pairDinnerCals = caloriesPerServing × householdSize`.
- Target check: warn if `pairDinnerCals` is outside `[1,200, 1,600]` (soft band around the 1,400 target).

Also clarify: does the grocery algorithm need to know about this split? Answer: no — grocery scales by `entry.servings`, which is already set correctly in the plan. The calorie roll-up is display-only. That distinction belongs in the spec.

---

### Should-fix issues

#### S1 — Item-alias normalization map is called out but not specified

The spec references "a small alias map (e.g. `"jasmine or basmati rice"` and `"jasmine rice"` → `jasmine rice`; `"ground beef (85/15)"` → `ground beef`)" but provides only two examples. The real data has "jasmine or basmati rice" (finish-chicken-tzatziki-bowls), "rigatoni" and "parmesan" with mixed units ("cup grated" vs "oz"), and various other inconsistencies. 

The spec should either: (a) ship a complete starter alias table bootstrapped from the real recipes (this is known data), or (b) define the minimum keys required for the seed data to aggregate correctly on first run. Without this, the seeded app will fragment items that should aggregate (e.g., if lemon-herb-chicken-base and chicken-caesar both appear in a plan, `garlic` appears in one at `6 cloves` and another recipe might have a slightly different spelling — they should merge).

Concrete fix: The seed-step engineering note (§8) should explicitly state "run the alias-map bootstrapper over all seed recipes to populate the initial alias map at seed time." Or provide a starter alias table in the spec appendix.

#### S2 — The "unit" field is free-text but has implicit constraints that aren't fully specified

The spec lists a unit normalization table (§5.3 Step 1) but the real data has `"cup grated"` (parmesan in finish-beef-bolognese and chicken-caesar), `"bottle (12 oz)"` (Caesar dressing), and `"stalk"` (celery). The unit normalization step only specifies weight, volume, and count families. `"cup grated"` is a volume unit that needs to normalize to `cup`; `"bottle (12 oz)"` is a count unit with embedded size. Neither is covered.

This matters for aggregation (parmesan across two recipes: `0.5 cup grated` in bolognese + `1 cup grated` in caesar should aggregate to `1.5 cups` grated). If "cup grated" doesn't normalize to "cup," they become two separate lines.

Concrete fix: The spec should state that the normalization table includes a "unit cleanup" pass (strip qualifiers like "grated," "diced," "frozen" from unit strings before matching) and define what to do with compound units like `"bottle (12 oz)"` (treat as `each` for aggregation purposes, look up in PurchaseUnit by item name).

#### S3 — Regenerating the grocery list: "preserve checked state for unchanged items" is fragile

§5.3 says "regenerating after a plan edit recomputes from scratch but preserves `checked` state for items whose `displayText` is unchanged." This is brittle: if a plan edit causes a quantity change (e.g., adding one more finish night), the displayText will differ, and the checked state will be lost for that item — even if the user already physically bought it. Over a 2-week plan with 12+ items already checked, a minor edit could clear half the check state.

Concrete fix: Match by normalized `item` key (not `displayText`) for check-state persistence. If the item is still on the list after regeneration (same key), preserve its checked state. Only reset if the item is removed or its `aisle` changes. This makes the behavior predictable and user-friendly, especially for in-aisle use.

#### S4 — Plan Builder missing a "batch-cook day" servings UX explanation

The spec describes picking bases "scaled to 12 servings" but doesn't address how the builder connects the 12-serving base to the 6 finish nights. Specifically: if Rutger has 12 servings of lemon-herb-chicken and uses it across 6 finish nights at 2 servings per night, the math works out. But if he adds only 4 finish nights using chicken, 4 of the 12 base servings are unclaimed — the grocery list still buys for 12 servings of chicken base, but only 8 are consumed. The spec should define whether the builder warns about unclaimed base servings, or whether it's intentionally left to Rutger's judgment.

Concrete fix: Add an edge case to §5.2: "If the sum of `entry.servings` for all finishes linked to a base is less than the base's `entry.servings`, surface a note: 'X base servings unassigned — adjust finishes or reduce base batch size.'" This is not a hard warning, just informational.

#### S5 — Cook tab "up next" ordering logic not specified

§6.7 says "Up next to cook" shows uncooked plan entries but doesn't define the sort: is it by `day` (chronological)? By current calendar date (today's first)? Alphabetical? For a bulk-prep plan where all 12+ recipes might technically be "uncooked" on day 1, the order matters a lot for usability.

Concrete fix: Add one sentence: "Sort uncooked entries by `day` in ascending order; where `day` is null, place at end. Filter to only show entries from the active plan."

#### S6 — "Pantry" aisle items in the recipe data include some that are not pantry staples

(Related to M2 but a data-level point distinct from the algorithmic issue.) The real data marks `jasmine or basmati rice`, `kalamata olives`, `rigatoni`, `beef broth`, `tomato paste`, `crushed tomatoes` as `aisle: pantry` WITHOUT a `staple: true` flag. These are NOT in the pantry.md staples list. The spec says the pantry subtraction drops an item only when BOTH `staple: true` AND the item is in Pantry. That is correct behavior. But the `aisle: pantry` on these items (without `staple: true`) means they have no valid store-walk bucket. The seed parser needs to handle this — or the seed data needs to be corrected during the seed step.

Concrete fix: The seed engineering note (§8) should include: "For ingredients where `aisle: pantry` but `staple` is absent/false, re-assign aisle based on a category lookup at seed time" — or provide the corrected aisle assignments in the spec. List the re-assignments explicitly (rice → pasta-grains, crushed tomatoes → canned, beef broth → canned, tomato paste → canned, rigatoni → pasta-grains, kalamata olives → international or condiments).

---

### Nice-to-have items

#### N1 — The `PlanEntry.day` field is a free-text string ("Mon Jun 23"), not a Date

This is serviceable for the prototype but means sorting, filtering by current date, and thaw-reminder features will require ad-hoc parsing. A future date-aware feature (e.g., "show me what to thaw tonight") would be cleaner if `day` is an ISO date string or a structured date field alongside the display label. Not a blocking issue, but worth flagging so the engineer doesn't paint into a corner.

Suggested: `day: { date: "2026-06-23", label: "Mon Jun 23" }` or separate `dayDate: "2026-06-23"` + `dayLabel: string`.

#### N2 — Cookbook backlog grid requires the photo files to be bundled in the app

§5.6 describes showing the photo beside the capture form, but CONTEXT.md notes the photos are `.jpeg` files. The seeding mechanism (§8) only mentions parsing markdown and generating `seed.json`. Bundling ~52 JPEG files into a self-contained HTML app is a non-trivial size concern (potentially 50–200 MB). The spec doesn't address how photos are delivered to the app.

Suggested: Add a note to §7/§8 clarifying photo handling: either (a) photos are thumbnailed/compressed at seed time to a reasonable size, or (b) the cookbook backlog grid shows placeholder cards for unimported photos, with photo display only supported once a photo is explicitly imported by the user. This decision affects the seeding step design.

#### N3 — "Dismiss" on rule-check banner: does dismissal persist?

§5.2 mentions a "dismissible" rule-check banner for violations. If Rutger explicitly dismisses a violation warning (e.g., "yes I know this has cilantro, it's for the side"), should that dismissal persist per-recipe or per-plan, or reset each session? The spec is silent. A per-recipe dismissal stored on the PlanEntry would be most useful.

#### N4 — No mention of how the two-week plan handles the "Week 2 freezer" display in the Cook tab

When Rutger finishes week 1's chicken-tzatziki-bowl cook, should the week-2 version of the same recipe (from freezer) appear as a separate "to cook" entry, or as a "reheat" entry? The Cook tab's "up next" likely shouldn't prompt logging for a reheated-from-frozen finish the same way as a fresh cook. The spec doesn't distinguish.

---

### Endorsements — what is already excellent and should not change

1. **The base+finish double-counting rule in §5.3 Step 0** is stated clearly and correctly: the base contributes its ingredients once (from the batch PlanEntry), and finishes contribute only finishing ingredients. This solves the real problem and matches the actual data. Do not change this.

2. **The grocery algorithm's 6-step structure (§5.3)** is logically complete and in the right order. Collecting → normalizing → aggregating → pantry-subtract → round-up → sort is the correct pipeline. The "failure mode is list too much, never drop an ingredient" rule is exactly right.

3. **The pantry subtraction rule** (§5.3 Step 3): subtract only when `staple: true` AND item is in Pantry AND all contributions are staple-flagged. This correctly handles "pantry item someone bought this week" — it still appears if any contribution lacks the staple flag.

4. **IndexedDB as the storage layer** with in-memory hydration and write-through is the right choice for this scale. The schema-versioning via `meta.schemaVersion` is well-anticipated. Endorsed.

5. **The "copy to clipboard for Apple Notes" (not writing directly to Notes)** matches his real preference file explicitly ("Don't edit Apple Notes directly — the connector and screen control both garble the formatting"). The spec honors this correctly.

6. **The non-goal list (§1)**: no nutrition database, no OCR in MVP, no Instacart, no multi-user. These are tight and correct. No scope creep present in the non-goals.

7. **Store-walk aisle order and "flat list, no section headers"** honored exactly as in preferences.md. The locked preference is correctly preserved.

8. **The seed mechanism design** (§8): build-time parse of markdown → seed.json, app reads JSON not markdown at runtime, re-seed action in More. This is clean, honor the "own storage, no live sync" locked decision perfectly.

9. **Open questions §10** are appropriate and honest. Applying sensible defaults while flagging them for confirmation is the right pattern. All 6 questions are real open questions, not noise.

10. **MVP scoping (§9)** is appropriately tight. Pushing cookbook-backlog gallery, auto-suggest planner, and OCR to later is the right call. The listed MVP items are the correct core.

---

## Round 2

**Scope of check:** verified all M/S/N items from Round 1 against the revised spec (`spec.md`) and the improver's change log. Re-checked key issues against real data (`2026-06-22-two-weeks.md`, `chicken-caesar-meal-prep-salad.md`, `beef-taco-salad.md`, `finish-chicken-tzatziki-bowls.md`).

---

### Round 1 item verdicts

#### M1 — Lunch-salad servings / grocery aggregation error
**RESOLVED.**
The improver adopted Option B (aggregate same `recipeId` + same `meal` tag before scaling), which I accept as superior to my Option A. Rationale: Option B handles the real data format as-is (four Mon–Thu entries at `servings: 2` each), requires no seed restructuring, and is more general. Verified against real data: chicken-caesar (`recipe.servings = 8`) × 4 entries at `servings: 2` → `totalServings = 8` → `scale = 1.0` → full recipe bought. Same logic applies cleanly to `beef-taco-salad` (also `servings: 8`, also 4× at `servings: 2`).

One concern I had going in (flagged by the improver themselves): what happens if the same `recipeId` appears in both `meal: dinner` and `meal: lunch` slots in the same plan? The rule as written — "collapse entries sharing the same `meal` tag" — handles this correctly: the dedup key is `(recipeId, meal)`, not just `recipeId`. Dinner entries and lunch entries for the same recipe stay separate. No gap here.

The worked example in §5.3 Step 0 and the §7 table row are both clear and consistent. Endorsing the Option B resolution.

#### M2 — `aisle: pantry` / aisle→store-walk mapping unresolved
**RESOLVED.**
Option A implemented cleanly: `pantry` is retired from the `aisle` enum in §4 (schema enforces it going forward); §5.3 Step 6 gives a complete 10-row 1:1 mapping table with a deterministic Condiments fallback + warning for any `aisle: pantry` that slips through at runtime; §8 seed corrections give an explicit item-by-item re-assignment table. Verified that the specific items I flagged (`jasmine or basmati rice`, `kalamata olives`, `rigatoni`, `crushed tomatoes`, `tomato paste`, `beef broth`) are all in the seed-time mapping table. The `bakery → Produce (last)` annotation is a nice touch — that's consistent with how Woodman's is laid out. The separation of `aisle` (store location) vs `staple` (pantry suppression) is now unambiguous.

One minor note for the engineer: `beef-taco-salad.md` has `tortilla chips: 1 bag (small)` with `aisle: pantry`. "bag (small)" is a compound unit not explicitly listed in the S2 unit-cleanup table, but it follows the same pattern as `"bottle (12 oz)"` → `"each"` — the spec's unit-cleanup rule covers it by stripping the size qualifier and treating it as `each`, with package size looked up by item name. The `tortilla chips` re-assignment is listed as `pasta-grains` in the §8 aisle table. Both are correct; no gap, just confirming the builder will need to apply both rules to this item.

#### M3 — Calorie roll-up formula underspecified
**RESOLVED.**
The formula is now fully explicit in §5.2: `caloriesPerServing` = per-person; `pairDinnerCals = (base.cals + finish.cals) × householdSize` for base+finish pairs; `recipe.cals × householdSize` for standalones; display-only (grocery algorithm unaffected). The improver widened my proposed warning band from `[1,200, 1,600]` to `[1,200, 1,800]`.

I endorse the wider band. My `1,600` upper bound was wrong: (320 + 510) × 2 = 1,660 for the Greek chicken tzatziki night, which the real plan explicitly notes as on-target ("~1,400–1,500 cal" is stated for the pair range, and the tzatziki night is on the higher end). A warning at 1,660 would false-positive on first real use. The `1,800` ceiling catches genuinely outlier-high nights without crying wolf on nights Rutger already knows and accepts. Endorsing `[1,200, 1,800]`.

#### S1 — Item-alias normalization map not specified
**RESOLVED.**
§5.3 Step 1 now requires the alias map to be bootstrapped from seed recipes, with five explicit required entries covering the known synonym conflicts in the real data. §8 repeats these as a formal seed-step task. The design decision to grow the alias map via the Purchase Units settings UI (not hardcode a complete table in the spec) is sound — the spec's job is correctness on first run, not an exhaustive static table.

#### S2 — Unit field implicit constraints
**RESOLVED.**
The unit-cleanup pass is now explicit in §5.3 Step 1 and mirrored in §4 Ingredient `unit` notes. The specific examples (`"cup grated"` → `"cup"`, `"bottle (12 oz)"` → `"each"`, `"stalk"` → `"each"`) cover all instances found in the seed data. Verified: `chicken-caesar-meal-prep-salad.md` has `parmesan: 1 cup grated` and `Caesar dressing: 1 bottle (12 oz)` — both handled by the cleanup pass.

#### S3 — Checked-state preservation fragile (by displayText)
**RESOLVED.**
§5.3 Output section now matches on normalized `item` key, not `displayText`. The in-aisle UX rationale is clear. Accepted as a strict improvement.

#### S4 — Batch-cook day unclaimed servings
**RESOLVED.**
Informational note added to §5.2 edge cases. Non-blocking, exactly right. The sentence is in the right place.

#### S5 — Cook tab "up next" ordering not specified
**RESOLVED.**
§6.7 now states the exact sort rule: `dayDate` ascending, `null` at end, active plan only. The freezer/reheat heuristic (same `recipeId` in dinner slots, week-2 date ≥ 7 days later than week-1) is a genuine improvement to the Cook tab UX. Verified against real data: `finish-chicken-tzatziki-bowls` is on Jun 23 (Week 1) and Jun 30 (Week 2), exactly 7 days apart — the heuristic fires correctly. "Mark done" as the primary CTA for frozen entries (vs. the four-question log) is appropriate.

#### S6 — `aisle: pantry` items not pantry staples (data level)
**RESOLVED (jointly with M2).** The §8 seed corrections table explicitly re-assigns all the real items I found; the schema change prevents future occurrences.

#### N1 — `PlanEntry.day` as free-text, not a Date
**RESOLVED.**
`dayDate` (ISO-8601) + `dayLabel` (display string) is now in §4 PlanEntry and §8 seed corrections. The Cook tab sort and future date-aware features can rely on `dayDate`. Correct call to adopt this now.

#### N2 — Cookbook photos bundled
**RESOLVED.**
§8 seed corrections item #4 explicitly states filenames only in `sourcePhotoRef`; photos require user import. §5.6 clarified accordingly. Clean solution that keeps the app file small.

#### N3 — Rule-check banner dismissal persistence
**RESOLVED.**
`ruleWarningDismissed: boolean` added to PlanEntry in §4. Per-entry semantics described in §5.2 (dismissal is scoped to the specific plan entry; re-adding the recipe to a different day starts fresh). Correct and useful.

#### N4 — Week-2 freezer entries in Cook tab
**RESOLVED (within S5 fix).** Covered comprehensively in §6.7.

---

### New issues

After reviewing the revised spec against real data, I find **no new must-fix issues**. The spec is internally consistent, covers all known edge cases in the seed data, and gives the implementer unambiguous rules for every algorithmic decision. A few minor observations, none blocking:

- The `beef-taco-salad.md` has `"bag (small)"` as a unit — not explicitly named in the S2 cleanup table, but the general rule (`compound unit → "each"`) covers it. The engineer should catch this in a unit-normalization pass. Not a spec gap, just a heads-up for the build notes.
- §5.3 Step 0 says deduplicate "for any `recipeId` that has multiple entries sharing the same `meal` tag." This is correct and handles the cross-meal case (same recipe in both `lunch` and `dinner`) safely. Worth the engineer noting the dedup key is `(recipeId, meal)`, not `recipeId` alone. The spec language says this clearly; confirming it's unambiguous.
- The calorie warning band `[1,200, 1,800]` is flagged in §10 as a candidate open question for Rutger. This is appropriate — the evaluator endorses 1,800 as the right default, and the question is correctly escalated rather than silently decided.

---

VERDICT: SIGN OFF — spec is buildable
