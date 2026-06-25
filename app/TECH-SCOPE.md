# TECH-SCOPE — Meal Planning App Implementation Plan

**Status:** Approved for implementation  
**Date:** 2026-06-21  
**Scope:** Single self-contained web app; mobile-first; offline; IndexedDB; seeded from `seed.json`.

---

## 1. Stack decision

**Vanilla JS + lit-html (no build step) OR Preact (bundled once).**

Recommendation: **Preact + htm** (tagged-template-literal JSX, no transpile step needed). Reasoning:
- Preact ships as a single ~3 KB ESM file importable from CDN or inlined.
- `htm` gives JSX-like authoring without a build step: `import { html } from 'htm/preact'`.
- Component model fits the tab/screen architecture cleanly; signal-based state (`@preact/signals`) removes the need for Redux-style boilerplate.
- Alternative (pure vanilla JS + `<template>` cloning) is viable but scales poorly as screens multiply — Preact removes that risk with minimal overhead.
- **No server, no npm at runtime.** Either: (a) bundle once with esbuild to produce `app.js`, inlining all deps → single `index.html` + `app.js`; OR (b) import from esm.sh CDN in `index.html` for zero-build dev, then inline for final delivery.
- **Deliverable target:** `index.html` + `app.js` + `app.css` (or fully inlined). Opens by double-click or `file://` in mobile browser. Installable as PWA.

---

## 2. File / layout

```
app-build/app/
  index.html          ← shell: loads app.js, manifest, service worker
  app.js              ← bundled (esbuild one-liner) or dev CDN-import version
  app.css             ← single stylesheet; CSS custom properties for theming
  seed.json           ← the data seed (already generated)
  manifest.json       ← PWA manifest (name, icons, theme)
  sw.js               ← service worker (cache-first for offline)
  build_seed.py       ← kept for re-seeding; never runs at app runtime
  src/
    main.js           ← entry: mount app, init DB, seed if empty, render router
    db.js             ← IndexedDB wrapper (open, get, put, getAll, delete per store)
    store.js          ← in-memory state (Preact signals); hydrated from DB on launch
    router.js         ← hash-based router; maps #/plan, #/recipes, etc. to screen components
    seed-loader.js    ← reads seed.json, writes to IndexedDB on first run
    grocery-algo.js   ← deterministic grocery algorithm (§5.3, all 6 steps)
    screens/
      PlanScreen.js
      PlanBuilderScreen.js
      RecipesScreen.js
      RecipeDetailScreen.js
      RecipeCaptureScreen.js
      ListScreen.js
      CookScreen.js
      MoreScreen.js
      PreferencesScreen.js
      PantryScreen.js
      PurchaseUnitsScreen.js
      CookbookBacklogScreen.js
      BackupScreen.js
      OnboardingScreen.js
    components/
      BottomNav.js
      RecipeCard.js
      IngredientEditor.js
      DayRow.js
      GroceryItem.js
      RuleWarningBanner.js
      CalorieRollup.js
```

---

## 3. Storage: IndexedDB

**Why IndexedDB over localStorage:**  
- The seed alone is ~150–200 KB of JSON. Recipes with feedback log growth, grocery list check-states, and cook logs will comfortably exceed localStorage's ~5 MB limit over a year of use.  
- IndexedDB supports structured queries (e.g. "get all recipes with `isBase:true`", "get all entries for planId X") without loading the full dataset.  
- Structured indexes on `recipes.id`, `mealPlans.id`, `mealPlans.isActive` keep lookups O(1).

**Object stores (one per entity):**

| Store name | Key | Indexes |
|---|---|---|
| `recipes` | `id` | — |
| `mealPlans` | `id` | `isActive` |
| `groceryLists` | `planId` | — |
| `pantry` | `"singleton"` | — |
| `purchaseUnits` | `item` (normalized) | — |
| `preferences` | `"singleton"` | — |
| `aliasMap` | `"singleton"` | — |
| `cookLog` | `id` (auto) | `recipeId` |
| `meta` | `"singleton"` | — |

**Write strategy:** write-through on every mutation. No debouncing needed at this data scale (28 recipes, <100 plan entries).

**In-memory state:** `@preact/signals` signals hydrated from IndexedDB on launch. UI reads signals; mutations write signal + immediately call `db.put(store, obj)`. No separate action layer needed.

---

## 4. Seeding

### First-run flow
1. `main.js` calls `db.get('meta', 'singleton')`.
2. If `seededAt` is absent (empty store), show `OnboardingScreen` ("Loading your data…").
3. `seed-loader.js` fetches `./seed.json`, iterates each entity array, calls `db.put(store, item)` for each. Writes `{ seededAt: now, schemaVersion: 1 }` to `meta`.
4. Hydrates in-memory signals from the just-written DB.
5. Router navigates to the active plan (`#/plan`).

### Subsequent runs
- `seededAt` is present → skip seeding entirely. Load from DB directly.

### Manual reset
- `BackupScreen` → "Reset to sample data" → confirm dialog → clear all stores → re-run seed-loader → navigate to plan. This is the only path that overwrites user edits.

### Schema migrations
- On launch, compare `meta.schemaVersion` to the app's `SCHEMA_VERSION` constant.
- If lower, run the matching migration function (e.g. `migrate_1_to_2(db)`).
- Migrations are additive only (never drop fields) to preserve round-trip fidelity.

---

## 5. Module breakdown

### `db.js` — IndexedDB wrapper
```js
// Thin promisified wrapper; no ORM
openDB()         // opens/upgrades the DB; creates all object stores + indexes
db.get(store, key)
db.put(store, obj)
db.getAll(store)
db.delete(store, key)
db.clear(store)
db.getAllFromIndex(store, indexName, value)
```

### `store.js` — In-memory signals
```js
// Preact signals
export const recipes      = signal([])  // Recipe[]
export const activePlan   = signal(null) // MealPlan | null
export const activeList   = signal(null) // GroceryList | null
export const pantry       = signal({ items: [] })
export const purchaseUnits = signal([])
export const preferences  = signal({})
export const aliasMap     = signal({})

// Derived signals
export const baseRecipes  = computed(() => recipes.value.filter(r => r.isBase))
export const finishRecipes = computed(() => recipes.value.filter(r => r.isFinish))

// Mutators (write signal + persist)
export async function saveRecipe(recipe) { ... }
export async function savePlan(plan) { ... }
export async function setPlanActive(planId) { ... }
export async function saveGroceryList(list) { ... }
export async function logCook(entry) { ... }
```

### `grocery-algo.js` — Deterministic pipeline (§5.3)
The entire algorithm in one module, pure functions, no side effects. Called from `ListScreen` on "Generate" or "Regenerate".

```js
/**
 * Main entry point. Returns a fully constructed GroceryList.
 * @param {MealPlan} plan
 * @param {Recipe[]} recipeMap  - keyed by id
 * @param {string[]} pantryItems
 * @param {PurchaseUnit[]} purchaseUnits
 * @param {Object} aliasMap
 * @param {string[]} aisleOrder  - from preferences
 * @param {GroceryList|null} existingList  - for check-state preservation
 */
export function generateGroceryList(plan, recipeMap, pantryItems, purchaseUnits, aliasMap, aisleOrder, existingList)

// Step 0: collect + collapse
function collectLineItems(plan, recipeMap)           // emits raw {item,qty,unit,aisle,staple}[]
function collapseLunchEntries(entries)               // dedup by (recipeId, meal) before scaling
function scaleIngredients(recipeId, scaleFactor, recipe) // applies scale = entry.servings / recipe.servings

// Step 1: normalize
function normalizeItemKey(item, aliasMap)            // lowercase, trim, alias lookup
function normalizeUnit(unit)                         // strip qualifiers → base unit

// Step 2: aggregate
function aggregateByItem(lineItems)                  // sum qty per normalized item key

// Step 3: pantry subtract
function subtractPantry(aggregated, pantryItems)     // drop if staple:true in all contributions AND in pantry

// Step 4: round to purchasable units
function roundToPurchaseUnit(itemKey, qty, unit, purchaseUnits)  // returns {buyQty, buyUnit, displayText, missingPurchaseUnit}

// Step 5: leftover flag
function flagLeftovers(item)                         // if used < 25% of package, add leftoverNote

// Step 6: sort
function sortByStoreWalk(items, aisleOrder)          // deterministic sort; within aisle: alpha by item

// Check-state preservation
function preserveCheckState(newItems, existingList)  // match by normalizedItem key
```

**Key correctness rules encoded in the algorithm:**
- `collapseLunchEntries`: collapse key is `(recipeId, meal)` — not `recipeId` alone. A recipe used in both `lunch` and `dinner` stays as two groups.
- `collectLineItems`: base recipes contribute their ingredients once from their `meal: batch` entry. Finish recipes contribute only finishing ingredients. If a finish references a base that is NOT in the plan entries, emit a `missingBaseWarning` rather than silently omitting the protein.
- "Failure mode is buy too much, never drop" — unresolvable unit mismatch keeps both lines; zero/negative qty after scaling is omitted.

### `router.js` — Hash-based routing
```js
// Maps location.hash to screen components. No library needed.
const ROUTES = {
  '#/plan':          PlanScreen,
  '#/plan/build':    PlanBuilderScreen,
  '#/recipes':       RecipesScreen,
  '#/recipes/:id':   RecipeDetailScreen,
  '#/recipes/new':   RecipeCaptureScreen,
  '#/list':          ListScreen,
  '#/cook':          CookScreen,
  '#/more':          MoreScreen,
  '#/more/prefs':    PreferencesScreen,
  '#/more/pantry':   PantryScreen,
  '#/more/units':    PurchaseUnitsScreen,
  '#/more/backlog':  CookbookBacklogScreen,
  '#/more/backup':   BackupScreen,
}
```

---

## 6. Grocery algorithm: spec §5.3 → code mapping

| Spec step | Function | Key details |
|---|---|---|
| Step 0 — Collect | `collectLineItems` + `collapseLunchEntries` | Dedup key: `(recipeId, meal)`. Scale = `entry.servings / recipe.servings`. |
| Step 1 — Normalize | `normalizeItemKey` + `normalizeUnit` | Alias map lookup. Unit strip: `"cup grated"→"cup"`, `"stalk"→"each"`, `"bag (small)"→"each"`, `"bottle (12 oz)"→"each"`. |
| Step 2 — Aggregate | `aggregateByItem` | Sum by normalized item key. Carry first-encountered aisle. `staple` = true only if all contributions are staple. |
| Step 3 — Pantry | `subtractPantry` | Drop iff: item in pantry catalog AND all contributions `staple:true`. Non-staple pantry items still appear. |
| Step 4 — Round | `roundToPurchaseUnit` | Package mode: `ceil(need/packageSize)`. By-weight: `ceil(need/roundIncrement) * roundIncrement`. Garlic: cloves→heads via hint (1 head ≈ 10 cloves) at round step. |
| Step 5 — Leftover | `flagLeftovers` | Threshold: used < 25% of package. Append `leftoverNote`. |
| Step 6 — Sort | `sortByStoreWalk` | `aisleOrder` from Preferences. Within aisle: alpha. `bakery` → last bucket (maps to Produce slot). |

**Missing-base handling (§5.1 edge case):** If `entry.recipeId` for a finish is in the plan but its `baseRecipeId` has no matching plan entry, `collectLineItems` emits a `{ missingBaseWarning: "protein for {finishTitle} not on plan — add {baseTitle} or buy protein separately" }`. This surfaces in the grocery list as a warning item, not a silent omission.

---

## 7. PWA

```
manifest.json:
  name: "Meal Planner"
  short_name: "Meal"
  start_url: "./index.html"
  display: "standalone"
  theme_color: "#1a1a2e"   (to be set by designer)
  background_color: "#ffffff"
  icons: [192px, 512px]   (simple SVG converted to PNG; generated at build time)

sw.js:
  strategy: cache-first for all app assets (index.html, app.js, app.css, seed.json)
  network-first for nothing (fully offline)
  cache key versioned: "meal-planner-v1"
  on activate: delete old cache versions
```

---

## 8. Mobile-first CSS approach

- CSS custom properties for all colors/spacing: `--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--space-sm`, `--tap-target`, etc.
- Base `--tap-target: 44px` (per spec §6). All interactive elements min 44×44.
- Single breakpoint only: `@media (min-width: 600px)` for desktop enhancement (wider cards).
- No CSS framework. Custom utility classes are fine; avoid Tailwind (adds build complexity).
- Bottom tab bar: `position: fixed; bottom: 0; width: 100%`. Content area: `padding-bottom: var(--nav-height)`.

---

## 9. Build / delivery

**Development (zero-build):**
```html
<!-- index.html imports from esm.sh -->
<script type="module" src="src/main.js"></script>
```
Works by opening `file://` or `python3 -m http.server` locally.

**Production bundle (one command):**
```bash
npx esbuild src/main.js --bundle --minify --outfile=app.js
```
Produces a single `app.js` (~50–100 KB minified+gzipped). The designer/engineer runs this once before delivering to Rutger.

**Delivery to Rutger:** zip of `index.html`, `app.js`, `app.css`, `seed.json`, `manifest.json`, `sw.js`. He opens `index.html` in Safari on iPhone → "Add to Home Screen" → icon on home screen, works offline.

---

## 10. Ambiguities flagged for implementation (do not block — apply defaults, note for Rutger)

1. **`pint` unit for cherry tomatoes.** In `beef-taco-salad`, cherry tomatoes are `1 pint` (volume), but in `greek-lemon-chicken-roasted-potatoes` and `finish-chicken-tzatziki-bowls` they are `0.5 cup` and `1 pint`. These cannot be summed across measurement families without a lookup (1 pint ≈ 2 cups). **Default applied:** keep as two separate aggregation lines if the units don't match; never silently add them. Flag cherry tomatoes for a purchase-unit entry (sold by the pint at Woodman's). **Recommend:** Rutger should add `cherry tomatoes: 1 pint container` to purchase-units so the algorithm can normalize.

2. **`romaine or iceberg lettuce` (finish-chicken-tacos) vs `romaine lettuce hearts` (salads).** The alias map maps both to `"romaine"`. This is correct for aggregation — but `romaine lettuce hearts` are sold as a 3-pack while loose romaine heads are different. The purchase-unit lookup for `romaine` → 3-count pack of hearts should apply; a `0.25 head` from tacos buys 1 pack. The leftover note will flag the discrepancy. **No block; the algorithm handles it via `missingPurchaseUnit: false`, buyQty=1 pack.**

3. **`jasmine rice` vs `basmati rice` in different recipes.** Alias map canonicalizes both to `"jasmine rice"`. This means when planning a `finish-beef-keema` (calls for basmati) alongside a `finish-chicken-tzatziki-bowls` (calls for jasmine), they aggregate as one item. This matches what the real grocery list already does ("can use one type for all three rice dishes"). **Correct behavior — preserve.**

4. **`cumin` and `smoked paprika` in chipotle-shredded-chicken-base** are marked `staple: true` but `cumin` and `chili powder` (also present) are NOT in the pantry catalog. The pantry catalog currently only lists: salt, black pepper, olive oil, vegetable oil, sesame oil, brown sugar, cornstarch, all-purpose flour, paprika, dried oregano, curry powder, honey, soy sauce. `cumin` and `smoked paprika` are not in the pantry → they will appear on the grocery list despite `staple: true` on some occurrences. This is correct per spec (§5.3 Step 3: item must be in Pantry catalog AND all contributions must be staple). The purchase-unit catalog does list cumin and chili powder (as 1-jar entries), so they will round correctly. **No action needed; Rutger should add them to pantry.md if he keeps them stocked.**

5. **`fish sauce` (finish-chicken-coconut-curry).** No purchase-unit entry. Will surface as `missingPurchaseUnit: true` and appear in the "Add a package size" section. **Expected behavior — no block.**

6. **`garam masala`, `Dijon mustard`, `Worcestershire sauce`, `hot sauce`, `garlic powder`, `onion powder`, `smoked paprika`, `dried thyme`, `red pepper flakes`, `bay leaf`** — all appear in recipes but have no purchase-unit entries. They will be listed as `missingPurchaseUnit: true`. The "Add a package size" helper will surface them. **Expected behavior; can be populated incrementally.**

7. **`coconut milk` aisle discrepancy.** The spec's §8 table says `coconut milk` → `canned`, but the raw markdown had it in `international` in one recipe (`finish-chicken-coconut-curry: aisle: international`) and `pantry` in others. The seed corrects `pantry` → `canned` for all occurrences. The one `international` occurrence is left as-is (it was already a valid non-pantry aisle). **For the grocery algorithm: coconut milk will sort to either `international` or `canned` depending on the recipe's ingredient.** To make aggregation consistent, the alias-plus-first-wins rule in Step 2 will pick whichever aisle appears first. **Recommend:** standardize all coconut milk to `canned` (which is where it sits at Woodman's). The engineer should patch the `finish-chicken-coconut-curry` ingredient to `aisle: canned` in the seed before delivery. This is a one-line fix in `seed.json`.

8. **`red enchilada sauce` unit.** Raw markdown has `unit: "can (10 oz)"` and `unit: "can (10 oz each)"`. Both normalized to `"each"` by the unit-cleanup pass. No purchase-unit entry exists for `red enchilada sauce`. Will surface as `missingPurchaseUnit: true`. **No block.**

9. **Week-2 freezer heuristic** (§6.7): "same recipeId in week-1 and week-2, ≥7 days apart → likely frozen." In the active plan, `finish-chicken-tzatziki-bowls` appears on Jun 23 and Jun 30 (7 days apart = exactly the threshold). `finish-beef-bolognese` appears Jun 24 / Jul 1 (7 days). The heuristic fires correctly for all repeats. The `Sat Jul 5` entry (`finish-chicken-coconut-curry`) corresponds to a week-1 entry on `Fri Jun 27` — also 8 days apart. **All repeats are ≥7 days in this plan, so the heuristic fires for all of them.** Good.

10. **`calorie warn band [1200, 1800]`** is seeded into preferences. Build it as `preferences.calorieWarnBand: [number, number]` so narrowing it is a preferences edit, not a code change. Already done in the seed.

---

*End of TECH-SCOPE.*
