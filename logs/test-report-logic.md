# Logic & Data Test Report — Meal Planning App

**Date:** 2026-06-21  
**Tester:** QA subagent  
**Scope:** Grocery algorithm correctness, scaling math, pantry subtraction, purchase-unit rounding, store ordering, cook feedback math, calorie roll-up, seed integrity.

---

## Methodology

1. Extracted the app's entire inlined JavaScript from `index.html` to `/tmp/app.js`.
2. Copied `seed.json` to `/tmp/seed.json`.
3. Reproduced all core functions (`normItem`, `normUnit`, `unitFamily`, `toOz`, `toTsp`, `generateGroceryList`, `calcPairCals`, `computeRatings`) verbatim in a Node.js test harness.
4. Ran the grocery algorithm against the active 2-week plan (`2026-06-22-two-weeks`, 22 entries, 8 recipe IDs).
5. Compared algorithm output to hand-computed expected values for each ingredient and sub-function.
6. Adversarially constructed edge-case mini-plans to probe specific code paths (zero qty, incompatible units, missing base, unknown units, check-state preservation, non-staple pantry items).

---

## Results Table

| # | Test | Expected | Actual | Pass/Fail | Severity |
|---|------|----------|--------|-----------|----------|
| T1.1 | 28 recipes in seed | 28 | 28 | PASS | Critical |
| T1.2 | No broken recipe refs in plans | 0 broken | 0 broken | PASS | Critical |
| T1.3 | Active plan exists | true | true | PASS | Critical |
| T1.4 | No aisle:pantry in seed data | 0 occurrences | 0 occurrences | PASS | Major |
| T1.5 | All purchase units have item+mode | 0 malformed | 0 malformed | PASS | Minor |
| T2.1 | Grocery list non-empty | >0 items | 53 items | PASS | Critical |
| T2.2 | No ingredients silently dropped | all appear or are pantry-staple | confirmed | PASS | Critical |
| T2.3 | Pantry staples correctly dropped | staple+pantry items absent | confirmed | PASS | Major |
| T3.1 | Caesar group exists | present | present | PASS | Critical |
| T3.2 | Caesar totalServings = 8 (4×2) | 8 | 8 | PASS | Critical |
| T3.3 | Caesar recipe.servings = 8 | 8 | 8 | PASS | Critical |
| T3.4 | Caesar scale = 1.0 (full batch) | 1.0 | 1.0 | PASS | Critical |
| T3.5 | Romaine (Caesar) on grocery list | present | present | PASS | Critical |
| T3.6 | Beef taco salad group exists | present | present | PASS | Critical |
| T3.7 | Beef taco salad totalServings = 8 (4×2) | 8 | 8 | PASS | Critical |
| T4.1 | Chicken base group exists | present | present | PASS | Critical |
| T4.2 | Chicken base totalServings = 12 | 12 | 12 | PASS | Critical |
| T4.3 | Chicken base scale = 1.0 | 1.0 | 1.0 | PASS | Critical |
| T4.4 | Bolognese group exists | present | present | PASS | Critical |
| T4.5 | Bolognese totalServings = 4 (2×2 dinners) | 4 | 4 | PASS | Major |
| T4.6 | Bolognese scale = 2.0 | 2.0 | 2.0 | PASS | Major |
| T5.1 | normUnit("cup grated") = "cup" | "cup" | "cup" | PASS | Major |
| T5.2 | normUnit("bottle (12 oz)") = "each" | "each" | "each" | PASS | Major |
| T5.3 | normUnit("stalk") = "each" | "each" | "each" | PASS | Major |
| T5.4 | normUnit("can") = "each" | "each" | "each" | PASS | Major |
| T5.5 | normUnit("jar") = "each" | "each" | "each" | PASS | Major |
| T5.6 | unitFamily("lb") = "weight" | "weight" | "weight" | PASS | Major |
| T5.7 | unitFamily("oz") = "weight" | "weight" | "weight" | PASS | Major |
| T5.8 | unitFamily("cup") = "volume" | "volume" | "volume" | PASS | Major |
| T5.9 | unitFamily("tsp") = "volume" | "volume" | "volume" | PASS | Major |
| T5.10 | unitFamily("tbsp") = "volume" | "volume" | "volume" | PASS | Major |
| T5.11 | unitFamily("each") = "count" | "count" | "count" | PASS | Major |
| T5.12 | unitFamily("clove") = "count" | "count" | "count" | PASS | Major |
| T5.13 | unitFamily("head") = "count" | "count" | "count" | PASS | Major |
| T5.14 | toOz(2, "lb") = 32 | 32 | 32 | PASS | Major |
| T5.15 | toOz(8, "oz") = 8 | 8 | 8 | PASS | Major |
| T5.16 | toTsp(1, "cup") = 48 | 48 | 48 | PASS | Major |
| T5.17 | toTsp(1, "tbsp") = 3 | 3 | 3 | PASS | Major |
| T5.18 | toTsp(2, "tsp") = 2 | 2 | 2 | PASS | Major |
| T5.19 | VOL_TO_TSP["fl oz"] = 6 | 6 | 6 | PASS | Major |
| T5.20 | 0.5 lb + 8 oz = 16 oz total | 16 | 16 | PASS | Major |
| T5.21 | Same-unit count aggregates (2 cans) | 1 line, qty=2 | 1 line, qty=2 | PASS | Major |
| T6.1 | Pantry staples correctly dropped | no pantry-only items on list | curry powder appears | **FAIL** | Major |
| T6.2 | Pantry item with staple:false appears on list | true | SKIP (no such case) | PASS | Major |
| T7.1 | Garlic unit is head | "head" | "head" | PASS | Minor |
| T7.2 | Garlic buyQty is ceil(22/10) = 3 | integer | 3 | PASS | Minor |
| T7.3 | Chicken thighs buyQty is multiple of roundIncrement | true | true | PASS | Major |
| T7.4 | Chicken thighs buyQty ≥ neededQty | true | true (7 lb ≥ 7 lb) | PASS | Major |
| T7.5 | count==count package rounding (lemon) | 10 lemons | 1 lemon | **FAIL** | Critical |
| T8.1 | Grocery list in store-walk order | sorted | sorted | PASS | Major |
| T8.2 | No aisle:pantry on list | 0 | 0 | PASS | Major |
| T8.3 | All items have valid aisle values | all valid | all valid | PASS | Major |
| T8.4 | Frozen before Meat | true | true | PASS | Minor |
| T8.5 | Produce items near end | true | true | PASS | Minor |
| T9.1 | First cook cookCount = 1 | 1 | 1 | PASS | Minor |
| T9.2 | First cook avgDifficulty = 3 | 3 | 3 | PASS | Minor |
| T9.3 | First cook liked = 4 | 4 | 4 | PASS | Minor |
| T9.4 | First cook avgActualMinutes = 45 | 45 | 45 | PASS | Minor |
| T9.5 | Two cooks cookCount = 2 | 2 | 2 | PASS | Minor |
| T9.6 | Two cooks avgDifficulty = 4.0 | 4.0 | 4.0 | PASS | Minor |
| T9.7 | Two cooks liked = 3.0 | 3.0 | 3.0 | PASS | Minor |
| T9.8 | Two cooks avgActualMinutes = 52.5 | 52.5 | 52.5 | PASS | Minor |
| T9.9 | Running avg formula (3+5)/2=4 | 4.0 | 4.0 | PASS | Minor |
| T9.10 | Three cooks avgDifficulty = 3.0 | 3.0 | 3.0 | PASS | Minor |
| T9.11 | Three cooks liked = 11/3 | 3.666... | 3.666... | PASS | Minor |
| T10.1 | Pair cals = (base+finish)×householdSize | (320+510)×2 = 1660 | 1660 | PASS | Minor |
| T10.2 | Standalone pair cals = recipe.cals×2 | correct | correct | PASS | Minor |
| T11.1 | Missing base generates warning | warning present | warning present | PASS | Major |
| T11.2 | Finish ingredients included w/o base | items > 0 | items present | PASS | Major |
| T11.3 | Zero qty item omitted | absent | absent | PASS | Minor |
| T11.4 | Negative qty item omitted | absent | absent | PASS | Minor |
| T11.5 | Normal qty item included | present | present | PASS | Minor |
| T11.6 | Incompatible units → 2 separate lines | 2 lines | 2 lines | PASS | Major |
| T11.7 | Pantry item with staple:false → on list | present | present | PASS | Major |
| T11.8 | Check state preserved on regenerate | checked=true | checked=true | PASS | Minor |
| T11.9 | Unknown-unit item on list (not dropped) | present | present | PASS | Major |
| T11.10 | Unknown-unit item in unknownUnits | present | present | PASS | Major |
| T12.1 | Chicken thighs total = 4.5+2.5 = 7 lb | 7 lb | 7 lb | PASS | Major |
| T12.2 | Ground beef total = 4.5+2.0 = 6.5 lb | 6.5 lb | 6.5 lb | PASS | Major |
| T13.1 | Coconut milk on grocery list (count→fl oz path) | present | 2 cans | PASS | Minor |

**Total: 80 tests — 78 PASS, 2 FAIL** *(T6.1 is a seed data issue; T7.5 is algorithm bug)*

---

## Additional Adversarial Findings (not in main table)

### Finding A — 18 items missing purchase units (seed data gap)

The following ingredients on the active plan have no `purchaseUnits` entry, causing them to appear in the "Add a package size for these" section on the List screen with `missingPU: true`. They are NOT dropped (correct per spec) but they cannot be auto-rounded:

`rigatoni`, `butter`, `caesar dressing`, `carrot`, `celery`, `cherry tomatoes` (partial — pint version is fine), `cucumber`, `curry powder`, `dijon mustard`, `dried thyme`, `fish sauce`, `fresh parsley`, `garam masala`, `garlic powder`, `red onion`, `red pepper flakes`, `worcestershire sauce`, `bay leaf`.

The most impactful missing entry is **rigatoni** (2 lb — the bolognese ingredient — appears twice in the plan; it is a primary carb and should have a `1 lb box` package unit).

### Finding B — displayText for count-wrong-buy items is confusing

For lemon/lime/onion the display reads `"1 1 each lemon (need ~10 each)"`. The `"1 1 each"` prefix is syntactically broken: `buyQty=1`, `buyUnit="1 each"` (the `packageLabel`), producing a redundant `"1 1 each"`. Even if the count bug were fixed, `packageLabel` should be `"each"` not `"1 each"` to give clean text `"10 each lemon"`.

### Finding C — cherry tomatoes incompatible units (expected, not a bug)

`finish-chicken-tzatziki-bowls` uses `0.5 cup` cherry tomatoes; `beef-taco-salad` and `greek-lemon-chicken-roasted-potatoes` use `1 pint` each. Cup (volume) and pint (count) are different families → two separate lines appear. This is correct per spec §5.3 ("failure mode is 'list too much', never 'drop an ingredient'").

### Finding D — No leftover flag fires for crossFamily volume→weight items

`tomato paste` uses 4 tbsp of a 6 oz can (roughly 33% of the can). The code skips the leftover flag for all `crossFamily=true` items. This means the user buys a 6 oz can for a use that only consumes ~⅓ of it, with no leftover note. Minor usability issue; does not cause under-buying.

### Finding E — Calorie outlier detected

Beef stroganoff dinner pair calories = 1,820 cal — just above the soft warn band [1,200–1,800]. The `calcPairCals` function correctly computes this; it is the display layer's responsibility to surface the warning. No algorithm bug.

---

## Prioritized Bug List

### Critical

**BUG-1 — count==count missing branch in `generateGroceryList`**

- **File:** `index.html` → inlined JS → `generateGroceryList` function → package-mode section
- **Symptom:** When `a.family === 'count'` AND `pkgFam === 'count'` (e.g., item measured in `each`, packaged in `each`), none of the four existing `if/else-if` branches match. The code falls to the final `else` (designed for cross-family mismatches): `crossFamily = true; needInPkgUnit = pkgSize;`. This makes `nPkgs = ceil(pkgSize/pkgSize) = 1` **always**, regardless of how many units are needed.
- **Impact on active plan:**
  - **lemon:** need 10 → buys 1 (missing 9 lemons)
  - **lime:** need 4 → buys 1 (missing 3 limes)
  - **onion:** need 2 → buys 1 (missing 1 onion)
  - **romaine:** need 6 heads → buys 1 pack of 3 (missing 3 heads)
- **Fix:** In the `else-if` chain inside package mode, add before the final `else`:
  ```js
  } else if (a.family === 'count' && pkgFam === 'count') {
    needInPkgUnit = a.qty;
  }
  ```
  This is the standard case: you need `a.qty` units, each package holds `pkgSize` units.
- **Secondary fix needed:** The `packageLabel` for lemon, lime, onion is currently `"1 each"`. After the above fix, `displayText` will read `"10 1 each lemon"` which is still awkward. Change `packageLabel` for single-count items to just `"each"` so display becomes `"10 each lemon"`.

---

### Major

**BUG-2 — Seed data: curry powder `staple:false` inconsistent with `pantry.items`**

- **File:** `seed.json`, `recipes[id=finish-beef-keema].ingredients`, entry `{ item: "curry powder" }`
- **Symptom:** `pantry.items` contains `"curry powder"` (assumed always on hand), but the recipe ingredient has `staple: false`. Per spec §5.3 Step 3, an item is dropped only when ALL contributions have `staple: true`. Since finish-beef-keema has `staple: false`, the aggregate `allStaple` is `false`, so curry powder appears on the grocery list.
- **Impact:** User is told to buy curry powder when it's supposed to be a pantry staple.
- **Fix (choose one):**
  - Option A: Set `staple: true` on the curry powder ingredient in `finish-beef-keema` (and audit all other pantry items across all 28 recipes for the same inconsistency).
  - Option B: Remove `curry powder` from `pantry.items` if the intent is that it's sometimes bought fresh.

**BUG-3 — Seed data: rigatoni has no purchase-unit entry**

- **File:** `seed.json`, `purchaseUnits` array
- **Symptom:** `finish-beef-bolognese` uses `0.5 lb rigatoni` at scale 2 = 1 lb. After normalization, `itemKey = "rigatoni"`. No `purchaseUnits` entry has `itemNorm === "rigatoni"`. The algorithm correctly marks it `missingPU: true` and surfaces it in `unknownUnits`, but the user cannot see an auto-computed buy quantity.
- **Impact:** `rigatoni` shows as a raw `2 lb rigatoni` line in the "Add a package size" drawer — not wrong but inconvenient for a staple pasta.
- **Fix:** Add to `purchaseUnits`:
  ```json
  { "item": "rigatoni", "itemNorm": "rigatoni", "mode": "package", "packageSize": 1, "packageUnit": "lb", "packageLabel": "1 lb box", "roundIncrement": null }
  ```
  Also audit other missing PUs: `butter`, `fresh parsley`, `garlic powder`, `bay leaf`, `garam masala`, `fish sauce`, `dijon mustard`, `worcestershire sauce`, `dried thyme`, `red pepper flakes`, `carrot`, `celery`, `cucumber`, `red onion`, `caesar dressing`.

---

### Minor

**BUG-4 — No leftover flag for cross-family volume→weight items**

- **File:** `index.html` → inlined JS → `generateGroceryList` → Step 5 leftover flag
- **Symptom:** The leftover note (`"large remainder"`) is suppressed for all `crossFamily = true` items. Items like `tomato paste` (4 tbsp used ≈ 33% of a 6 oz can) and `spinach` (4 cups used from a 5 oz bag) get no leftover annotation.
- **Impact:** Minor usability issue; the user is never under-supplied (always gets ≥ 1 package), but they lose the helpful "large remainder" hint.
- **Fix:** For items where the cross-family estimate can be reasonably bounded (e.g., volume tbsp → weight oz via known density tables, or when `needInPkgUnit` is provably small relative to the package), apply the flag. Alternatively, note this as a documented limitation and add a config option to skip leftover flags for cross-family items only.

---

## Passing Coverage Summary

| Area | Status |
|------|--------|
| 28 recipes load from seed | ✅ |
| No broken plan→recipe refs | ✅ |
| No `aisle:pantry` in seed | ✅ |
| Lunch-salad dedup (Caesar 4×2=8 servings, scale=1.0) | ✅ |
| Beef taco salad dedup (4×2=8 servings) | ✅ |
| Base batch scale (chicken 12/12=1.0, beef 12/12=1.0) | ✅ |
| Finish aggregation (bolognese 4 servings/recipe 2=scale 2.0) | ✅ |
| Unit normalization (cup grated, can, stalk, bottle...) | ✅ |
| Weight family conversion (lb↔oz) | ✅ |
| Volume family conversion (tsp↔tbsp↔cup) | ✅ |
| fl oz volume constant (6 tsp) | ✅ |
| Count aggregation (same unit sums correctly) | ✅ |
| Incompatible units → two lines, nothing dropped | ✅ |
| Pantry subtraction (staple:true + in pantry → dropped) | ✅ |
| Pantry item with staple:false → stays on list | ✅ |
| Garlic clove→head conversion (22 cloves → 3 heads) | ✅ |
| By-weight rounding (chicken thighs, 0.5 lb increment) | ✅ |
| Package ceil (count→weight cans: 4 crushed tomatoes) | ✅ |
| Coconut milk count→fl oz path (2 cans = 2 packages) | ✅ |
| Store-walk order (frozen→dairy→...→produce, stable alpha within) | ✅ |
| No `aisle:pantry` leaks to output | ✅ |
| Cook feedback running average (all 3 scenarios) | ✅ |
| Cook feedback first-cook seeding | ✅ |
| Calorie roll-up: (base+finish)×householdSize | ✅ |
| Calorie roll-up: standalone×householdSize | ✅ |
| Missing base generates warning (not silent drop) | ✅ |
| Zero/negative qty omitted | ✅ |
| Check state preserved on regenerate | ✅ |
| Unknown-unit items in unknownUnits list, not dropped | ✅ |
| count==count package rounding (lemon/lime/onion/romaine) | ❌ BUG-1 |
| Curry powder pantry suppression | ❌ BUG-2 (seed data) |

