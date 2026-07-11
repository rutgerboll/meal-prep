# Meal Planning App — Product, Design & Technical Spec

**Status:** Phase 1 (Planning Architect draft)
**Audience:** UX designer + engineer building the prototype and the working app.
**Scope:** A single self-contained, mobile-first web app for one user (Rutger), seeded from his real meal-planning data. No server, no live file sync.

---

## 1. Overview & goals

### What it is
A personal meal-planning app that turns Rutger's existing markdown-based "skill" workflow into a real app he uses on his phone. It keeps one **structured source of truth** (recipes with machine-readable ingredients) and generates grocery lists by **deterministic mechanical aggregation** — never by re-writing from memory.

### One-sentence promise
> "Plan two weeks of bulk-prep dinners, then get a grocery list — ordered for my store — that never drops an ingredient."

### Goals
1. Preserve the core principle: recipes are the single source of truth; the grocery list is a deterministic sum over structured ingredients, pantry-subtracted and rounded to purchasable units.
2. Fit Rutger's *actual* workflow: bulk prep ~2 weeks at a time, base+finish protein remixing, cooking for 2, calorie targets per pair-dinner, lunch-salad slots, store-walk shopping at Woodman's.
3. Be phone-first and usable one-handed in the kitchen and the grocery aisle.
4. Run fully offline from local storage, seeded from his real data; survive app reloads.
5. Capture cook feedback so future planning improves.

### Non-goals (explicit)
- **No live sync** to his markdown files. The app owns its own store, seeded once. (A future, separate project may add file sync — see §8. We do not design *against* it, but it is out of scope.)
- **No multi-user / accounts / cloud.** Single user, single device primary.
- **No nutrition database / macro tracking** beyond the simple `calories_per_serving` already in his recipes. Calories are an estimate roll-up, not a tracker.
- **No automatic recipe scraping/OCR in MVP.** Recipe capture from a cookbook photo is a guided manual/assisted entry, not automated OCR (see §5.1, §7).
- **No price/budget tracking** (budget is unspecified in his preferences).
- **No meal delivery / ordering / Instacart integration.** Output is a list he copies into Apple Notes himself.

---

## 2. Personas & jobs-to-be-done

### Persona: Rutger
- Cooks for **2** (himself + wife). 6 dinners/week, 7th day not cooked.
- Currently in a **bulk meal-prep phase**: cooks ~2 weeks of food in batches on a batch-cook day, reheats/thaws through the fortnight.
- Plans on his **phone**, often standing in the kitchen or walking the store.
- Has a **cookbook-photo backlog** (~52 photos) he wants to work through gradually.
- Values reliability over flash: the list must be complete and in store order.

### Jobs-to-be-done (each maps to a flow in §6)
1. **"Plan my next two weeks of bulk prep."** Pick 2 neutral protein bases + 6 finishes (week 1 fresh / week 2 freezer) + lunch salads, see calorie roll-ups, confirm it respects my rules.
2. **"Make the grocery list and shop it."** Generate a deterministic, pantry-subtracted, store-walk-ordered flat list; check items off in the aisle; copy it to Notes.
3. **"Log how a cook went."** After cooking, record difficulty, actual time, liking, what I'd change — so the planner learns.
4. **"Capture a recipe."** Save a recipe (typed, pasted, or from a cookbook photo) into the library in the one structured format, with machine-readable ingredients.
5. **"Manage my pantry / purchase units / preferences."** Keep the staples, package sizes, and rules current so lists stay correct.
6. **"Work through my cookbook backlog."** Periodically get nudged to capture and cook one of my photo recipes, slotted on a time-rich night.

---

## 3. Information architecture

### Navigation model
A **fixed bottom tab bar** (5 tabs) — the standard phone pattern, thumb-reachable. A modal **"+ Capture"** action is reachable from the Recipes tab and from a global FAB on Recipes/Home.

```
┌───────────────────────────────────────┐
│              (screen content)          │
│                                        │
├───────────────────────────────────────┤
│  Plan   Recipes   List   Cook   More   │   ← bottom tab bar
└───────────────────────────────────────┘
```

| Tab | Purpose |
|---|---|
| **Plan** | The current/active meal plan; create & edit plans; calorie roll-ups; batch-cook view. Home/landing tab. |
| **Recipes** | The recipe library (search, filter, view, capture new). The base+finish relationships live here. |
| **List** | The grocery list for the active plan: generate, view (store-walk order), check off, copy. |
| **Cook** | Cook log / "what did I make": pick a recipe, log feedback. Also surfaces "to cook next" from the active plan. |
| **More** | Preferences, Pantry, Purchase units, Cookbook backlog, Data backup/export, About. |

### Screen inventory (detailed in §6)
1. Plan — Active Plan view
2. Plan — Plan Builder (create/edit)
3. Recipes — Library list
4. Recipes — Recipe detail
5. Recipes — Capture (new/edit recipe)
6. List — Grocery list
7. Cook — Cook log / feedback entry
8. More — hub
9. More — Preferences
10. More — Pantry
11. More — Purchase units
12. More — Cookbook backlog
13. More — Backup / export-import
14. Onboarding / first-run seed (one-time)

---

## 4. Core data model

The app has its **own store** (IndexedDB), seeded once from the markdown. The schema mirrors his existing frontmatter so seeding is a clean parse-and-load. All quantities and units are **US** (lb/oz/cups/each); never metric (per memory: always US units).

### Storage approach
- **IndexedDB** via a thin wrapper (one object store per entity, keyed by `id`). Chosen over plain `localStorage` because recipes + plans + feedback exceed localStorage's ~5 MB comfort zone over time and we want structured queries/indexes.
- A single in-memory app state hydrated from IndexedDB on launch; writes are persisted immediately (write-through).
- A `meta` store holds `{ schemaVersion, seededAt, lastBackupAt }` for migrations and backup tracking.

### Entities

#### Recipe
Maps 1:1 to a `recipes/*.md` frontmatter + body.

| Field | Type | Notes |
|---|---|---|
| `id` | string (slug) | Primary key, e.g. `finish-beef-bolognese`. |
| `title` | string | Display name. |
| `servings` | number | Yield in recipe servings (a base = 12, a finish = 2, a standalone = 4, a salad = 8). |
| `timeMinutes` | number | Estimated active/total time. |
| `tags` | string[] | e.g. `[beef, italian, pasta, finish, uses-base]`. Drives filtering & rule checks. |
| `source` | enum | `generated` \| `web` \| `own` \| `cookbook` (new value for photo-captured). |
| `caloriesPerServing` | number \| null | May be null/estimated. |
| `note` | string \| null | Freeform note (e.g. "Neutral base — freeze 6 servings"). |
| `isBase` | boolean | Derived from tag `base` / `neutral`; true for bulk bases. |
| `baseRecipeId` | string \| null | For finish recipes: the base they consume (`base_recipe` in frontmatter). |
| `ingredients` | Ingredient[] | Structured; see below. **Source of truth for the list.** |
| `ratings` | Ratings | Rolling summary; see below. |
| `steps` | string[] | Ordered step strings (markdown body `## Steps`). |
| `feedbackLog` | FeedbackEntry[] | Dated entries (markdown body `## Feedback log`). |
| `sourcePhotoRef` | string \| null | For cookbook captures: filename/ref of the originating photo (e.g. `IMG_0507.jpeg`). |
| `createdAt`, `updatedAt` | ISO date | App bookkeeping. |

#### Ingredient (embedded in Recipe)
Mirrors the frontmatter ingredient objects exactly.

| Field | Type | Notes |
|---|---|---|
| `item` | string | Canonical item name, e.g. `"crushed tomatoes"`. Used as the aggregation key (normalized — see §5.3). |
| `qty` | number | Exact amount the recipe uses (e.g. `0.5`). |
| `unit` | string | `lb`, `oz`, `cup`, `tbsp`, `tsp`, `can`, `each`, `clove`, `head`, `pint`, `bunch`, `bottle`, etc. Free-text but normalized via a unit table (§5.3). During normalization, qualifier words attached to unit strings (e.g. `"cup grated"` → `"cup"`, `"bottle (12 oz)"` → `"each"`) are stripped before aggregation; `"bottle (12 oz)"` items aggregate by count and look up purchase size by item name. |
| `aisle` | enum | `meat` \| `produce` \| `dairy` \| `refrigerated` \| `frozen` \| `spices` \| `international` \| `canned` \| `pasta-grains` \| `condiments` \| `bakery`. Maps 1:1 to a store-walk bucket. **`pantry` is NOT a valid aisle value** — see §5.3 Step 6 and §8 for the seed-time re-assignment rule. |
| `staple` | boolean | If true AND item is in Pantry catalog, skipped on grocery list. This is the ONLY mechanism for pantry suppression; `aisle` does NOT signal "staple." |

> **Important base+finish rule (from the data):** A *finish* recipe's ingredient list contains **only the finishing ingredients** — the protein comes from the already-cooked base and is NOT relisted. So aggregation must add the base's ingredients **once** (when the base is on the plan), and each finish adds only its own. See §5.3.

#### Ratings (embedded)
| Field | Type |
|---|---|
| `cookCount` | number |
| `avgDifficulty` | number 1–5 \| null |
| `avgActualMinutes` | number \| null |
| `liked` | number 1–5 \| null |

#### FeedbackEntry (embedded, also drives Ratings)
| Field | Type | Notes |
|---|---|---|
| `date` | ISO date | |
| `difficulty` | number 1–5 | |
| `actualMinutes` | number | |
| `liked` | number 1–5 | |
| `changeNote` | string | "what I'd change next time". |
| `text` | string | Rendered one-line summary appended to the log. |

#### MealPlan
Maps to `meal-plans/*.md`.

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `2026-06-22-two-weeks`. |
| `label` | string | Display label / date range. |
| `servingsDefault` | number | Default per-dinner servings (2). |
| `note` | string \| null | Plan description. |
| `entries` | PlanEntry[] | The meals. |
| `kind` | enum | `bulk-2week` \| `weekly` \| `custom` (derived; affects the Plan view layout). |
| `isActive` | boolean | One plan is "active" → drives List & Cook tabs. |
| `createdAt`, `updatedAt` | ISO date | |

#### PlanEntry (embedded in MealPlan)
Mirrors the `meals:` array.

| Field | Type | Notes |
|---|---|---|
| `recipeId` | string | References a Recipe. |
| `servings` | number | Servings to scale to (12 for a batch base, 2 for a dinner or per-day lunch portion, etc.). |
| `dayDate` | string \| null | ISO-8601 date string, e.g. `"2026-06-23"`. Used for sorting, filtering, and date-aware features. Parsed from the `day` label at seed time. |
| `dayLabel` | string \| null | Display label, e.g. `"Mon Jun 23"` or `"Sun Jun 22 (batch cook)"`. Preserved for display; derived from the source `day:` field. |
| `meal` | enum | `dinner` (default) \| `lunch` \| `batch`. Derived from `meal:` field / batch-cook grouping. |
| `cooked` | boolean | Set true when a cook is logged for this entry (links to Cook flow). |
| `ruleWarningDismissed` | boolean | Set true when the user has explicitly dismissed the rule-check banner for this entry. Persists for the life of the plan. |

#### GroceryList / GroceryItem
Generated, not authored. Cached per plan so check-state persists.

**GroceryList**
| Field | Type | Notes |
|---|---|---|
| `id` | string | Same as / tied to plan id. |
| `planId` | string | |
| `generatedAt` | ISO date | |
| `items` | GroceryItem[] | In store-walk order. |
| `unknownUnits` | string[] | Items with no purchase-unit entry (the "add to purchase-units" list). |

**GroceryItem**
| Field | Type | Notes |
|---|---|---|
| `item` | string | Display name. |
| `aisle` | enum | For ordering. |
| `neededQty` | number | Summed exact amount used. |
| `neededUnit` | string | |
| `buyQty` | number | Rounded-up purchasable amount. |
| `buyUnit` | string | The package unit/label, e.g. `"2 lb bag"`, `"14.5 oz can"`. |
| `displayText` | string | Final list line, e.g. `"2 cans crushed tomatoes (14.5 oz each)"`. |
| `leftoverNote` | string \| null | e.g. `"only 1 needed"` when package ≫ used (§5.3). |
| `checked` | boolean | In-aisle check-off state (persisted). |
| `missingPurchaseUnit` | boolean | true → flagged for the catalog. |

#### Pantry
Maps to `pantry.md`. `{ items: string[] }` — a set of staple item names assumed on hand and skipped (when `staple: true`).

#### PurchaseUnit
Maps to `purchase-units.md`.

| Field | Type | Notes |
|---|---|---|
| `item` | string | Match key (normalized). |
| `mode` | enum | `package` \| `by-weight`. |
| `packageSize` | number \| null | e.g. `2` for a 2 lb bag, `14.5` for a 14.5 oz can. |
| `packageUnit` | string \| null | e.g. `lb`, `oz`, `each`, `dozen`. |
| `packageLabel` | string | Human label, e.g. `"2 lb bag"`, `"14.5 oz can"`. |
| `roundIncrement` | number \| null | For `by-weight`: e.g. `0.5` (round to nearest/up 0.5 lb). |

#### Preferences
Maps to `preferences.md`. Structured so the planner can surface rules.

| Field | Type | Notes |
|---|---|---|
| `householdSize` | number | 2. |
| `dinnersPerWeek` | number | 6. |
| `calorieTargets` | `{ rutger: 800, wife: 600, pairPerDinner: 1400 }` | |
| `dislikes` | object | `{ cilantroOptional: true, noSoupsStews: true, noCutPork: true (sausageOk), asianOnlyThai: true }`. |
| `allowedCuisines` | string[] | Western, Mexican, Mediterranean, Indian, Thai. |
| `cookingStyle` | enum | `bulk-prep` (current) \| `fresh-nightly`. Editable; affects planner defaults. |
| `variety` | enum | `balanced`. |
| `equipment` | `{ have: ["air fryer","slow cooker"], lack: ["pressure cooker","instant pot"] }` | |
| `store` | `{ name: "Woodman's, Menomonee Falls", aisleOrder: [...] }` | The store-walk order (see below). |
| `unitsSystem` | `"US"` | Locked. |

**Store-walk aisle order (locked):** `frozen, dairy, refrigerated, spices, international, canned, pasta/grains/rice (→ pantry-grains), condiments, meat, produce`. The list is printed top-to-bottom in this order with **no section headers** (one flat list).

#### CookLog (optional convenience entity)
A flat, queryable log of cooks for the Cook tab timeline. Each entry references `recipeId` + `planEntry` + the FeedbackEntry it produced. (Feedback is also stored on the recipe; this is a denormalized index for "what have I cooked lately".)

### Relationships (summary)
- `Recipe 1—* Ingredient` (embedded).
- `Recipe.baseRecipeId → Recipe.id` (finish → base).
- `MealPlan 1—* PlanEntry`; `PlanEntry.recipeId → Recipe.id`.
- `GroceryList → MealPlan` (1:1, generated).
- `FeedbackEntry`/`CookLog → Recipe` (and optionally the PlanEntry that prompted it).
- `Pantry`, `PurchaseUnit`, `Preferences` are singletons/catalogs consumed by the grocery + planning logic.

---

## 5. Feature spec per workflow

### 5.1 Recipe capture / library

**User stories**
- As Rutger, I want every recipe to land in one structured format so my lists never miss an ingredient.
- I want to capture a recipe by typing/pasting, or from a cookbook photo, and have its ingredients machine-readable.
- I want to mark a recipe as a *base* or a *finish* (linked to a base).

**Screen behavior**
- **Library (Recipes tab):** searchable, filterable list of recipe cards (title, tags, time, liked stars, calories, a small "BASE"/"FINISH→base" chip). Filters: tag/cuisine, base/finish/standalone/salad, source, "favorites" (liked ≥ 4), "never cooked". Sort: recently used, most liked, A–Z. Base recipes show their dependent finishes; finish recipes link back to their base.
- **Capture (modal/full screen):** structured form.
  - Top fields: title, servings, time, tags (chips), source, calories/serving, optional note.
  - **Type toggle:** Standalone / Base / Finish. Choosing *Finish* reveals a **base picker** (sets `baseRecipeId`) and shows a reminder: "List only finishing ingredients — the protein comes from the base."
  - **Ingredients editor:** repeating rows of `item | qty | unit | aisle | staple`. `item` autocompletes against existing items (to keep aggregation keys consistent). `aisle` is a dropdown. `staple` is a toggle (auto-on if item is in pantry). Add/remove/reorder rows.
  - **Steps editor:** ordered list of text steps.
  - Save validates: every ingredient has item+qty+unit+aisle; warns on a unit the app can't normalize (offers to add it to the unit table).
- **Cookbook-photo capture:** a special entry point (from Cookbook backlog, §5.6) opens Capture pre-tagged `source: cookbook` with `sourcePhotoRef` set; the photo is shown alongside the form so Rutger transcribes ingredients into structured rows. **No OCR in MVP** — assisted manual entry. (Later: optional LLM/OCR pre-fill, see §9.)

**Edge cases**
- Duplicate `id`/slug → app appends `-2` or asks to overwrite.
- A finish recipe whose base is deleted → recipe flagged "missing base"; planner warns; grocery aggregation skips the (absent) base contribution and flags it.
- Ingredient unit the app doesn't know how to sum (e.g. a novel `"pint"` vs `"cup"`) → aggregation keeps it as a separate line rather than guessing (never silently drop).

### 5.2 Meal planning

**User stories**
- As Rutger, I want to plan two weeks of bulk prep: 2 protein bases + 6 finishes (week 1 fresh / week 2 freezer) + lunch salads, and see calories per pair-dinner.
- I want the planner to favor recipes I liked and realistic times, and to respect my rules (no soups/stews, no cut pork, Asian = Thai only, no pressure-cooker recipes).
- I want it to occasionally nudge a cookbook-backlog recipe onto a time-rich night.

**Screen behavior — Plan Builder**
- **Choose a template:** "2-week bulk prep" (the flagship), "1-week (6 dinners)", or "Custom".
- **2-week bulk prep flow** (mirrors his real plan):
  1. **Pick bases** (default 2 neutral bases, e.g. one chicken + one beef), each scaled to 12 servings; the builder reminds "freeze half for week 2."
  2. **Assign finishes** to week-1 nights (Mon–Sat) — only finishes whose `baseRecipeId` matches a chosen base are offered first; cuisine spread is shown and the builder warns on a same-cuisine repeat on consecutive nights.
  3. **Week 2** auto-fills by repeating week-1 finishes ("from freezer") and lets him swap one night for a **fresh cook** (a standalone batch-friendly recipe).
  4. **Lunch salads:** pick 1–2 meal-prep salads for Mon–Thu lunches (the `meal: lunch` slots).
  5. **Review:** calorie roll-up per dinner/pair (base serving + finish serving), cuisine spread, time-per-night, rule-check banner.
- **Planner suggestions:** "Suggest a plan" auto-proposes bases + finishes weighted by `liked` rating, realistic `avgActualMinutes` (vs estimate), preference rules, and variety. Any *new* suggested recipe must pass through Capture first (it cannot reference an unstructured recipe).
- **Rule surfacing (see §7):** a persistent, dismissible banner flags any violation: a soup/stew-tagged recipe, a cut-pork ingredient, a non-Thai East-Asian recipe, or a recipe tagged `pressure-cooker`/`instant-pot`. Dismissal is stored **per PlanEntry** (on the entry's data): dismissing a warning for a specific recipe on a specific plan day suppresses it for that entry for the life of the plan. Re-adding the same recipe to a different day starts fresh. This way "yes I know this has cilantro, it's a side" persists without clearing all warnings.

**Edge cases**
- Picking a finish without its base on the plan → builder prompts to add the base (or warns the protein won't be bought).
- Calorie roll-up far from ~1,400/pair → soft warning, not a block. See calorie roll-up formula below.
- Fewer than 12/24 dinners assigned → "X of 24 dinners planned" progress indicator, never blocks saving.
- If sum of `entry.servings` for all finishes linked to a base is less than the base's `entry.servings`, surface an informational note: "X base servings unassigned — adjust finishes or reduce base batch size." Not a block, informational only.

**Calorie roll-up formula (display-only — the grocery algorithm does NOT use this):**
- `caloriesPerServing` is **per-person** (confirmed by seed data: lemon-herb-chicken-base = 320 cal/person, finish-chicken-tzatziki-bowls = 510 cal/person).
- For a dinner using a **base + finish pair**: `pairDinnerCals = (base.caloriesPerServing + finish.caloriesPerServing) × householdSize`. Example: (320 + 510) × 2 = 1,660 cal.
- For a **standalone recipe**: `pairDinnerCals = recipe.caloriesPerServing × householdSize`.
- `householdSize = 2` (from Preferences). The Review screen shows `pairDinnerCals` per night.
- Warn if `pairDinnerCals` is outside `[1,200, 1,800]` (soft band; catches significant outliers without false-positives on higher-calorie nights).
- This formula is **display-only**. Grocery scaling uses `entry.servings`, not calories.

### 5.3 Grocery list generation (the deterministic core)

This is the heart of the app and must be **mechanical and reproducible**. Given a plan, the same inputs always produce the same list. Algorithm:

**Step 0 — Collect line items.**
For each `PlanEntry` in the plan:
- Load the referenced Recipe.
- Compute `scale = entry.servings / recipe.servings`.
- For each `ingredient`, emit a line `{ item, qty: ingredient.qty × scale, unit, aisle, staple }`.
- **Base+finish handling:** Bases appear as their own PlanEntry (the batch-cook entry, e.g. 12 servings) and contribute their ingredients **once** at that scale. Finishes contribute only their finishing ingredients. The base protein is therefore counted exactly once — from the base entry — and never double-counted from finishes (finishes don't relist it). If a finish's base is *not* on the plan, flag the missing protein rather than silently omitting it.
- **Lunch-salad / meal-prep deduplication:** When the same `recipeId` appears multiple times in the plan with `meal: lunch` (or `meal: batch`), these entries represent portions of a single meal-prep batch eaten over multiple days, NOT separate full recipes to buy. **Aggregate these entries before scaling:** sum their `entry.servings` values into a single effective total, then scale once: `scale = totalServings / recipe.servings`. Example: chicken-caesar-meal-prep-salad (`recipe.servings = 8`) appears Mon–Thu each at `entry.servings = 2` → `totalServings = 8` → `scale = 8/8 = 1.0` → full recipe ingredients purchased. This prevents buying only 25% of the salad ingredients. The rule: **for any `recipeId` that has multiple entries sharing the same `meal` tag, collapse to one scaled line item before emitting.**

**Step 1 — Normalize item keys & units.**
- Normalize `item` for matching: lowercase, trim, collapse synonyms via a small alias map. The alias map is editable in Purchase units / a settings table; unknown items just key on their normalized name. At minimum, the seed-time alias map must cover all synonyms present in the seed recipes (see §8 seed-step alias bootstrapping). Required seed-time entries include: `"jasmine or basmati rice"` → `"jasmine rice"`; `"ground beef (85/15)"` → `"ground beef"`; `"corn (canned or frozen)"` → `"corn"`. A built-in alias table ships in code (e.g. `"parmesan cheese"` → `"parmesan"`) so name-variant fixes reach already-installed apps without re-seeding; the user-edited alias map wins on conflicts.
- **Unit cleanup pass (before family normalization):** Strip qualifier words from unit strings. Examples: `"cup grated"` → `"cup"`; `"stalk"` → `"each"`. Compound count-with-size units — `"can (14 oz)"`, `"28 oz can"` — normalize to `each` for counting, but the container word and declared size are **preserved** on the line item so sizes stay distinct at aggregation.
- Normalize units within a measurement family so they can be summed:
  - **Weight:** lb ↔ oz (1 lb = 16 oz).
  - **Volume:** tsp ↔ tbsp ↔ cup ↔ fl oz (3 tsp = 1 tbsp, 16 tbsp = 1 cup, 8 fl oz = 1 cup).
  - **Count:** each, clove, head, can, jar, bottle, pint, bunch, dozen — summed per (unit, container, declared size); never cross-converted by guessing. `clove` may convert to `head` via the purchase-unit hint (`garlic: 1 head ≈ 10 cloves`) at the rounding step, not before.
  - **Volume → weight by density:** a small per-item density table (oz per cup — grated parmesan, shredded cheeses) converts volume contributions to weight so `"¾ cup grated parmesan"` and `"1.5 oz parmesan"` merge into one line. Only items in the table convert; everything else follows the honest-fallback rule below.
  - Cross-family units that genuinely can't be combined for one item → separate lines, both shown; never drop a contribution.

**Step 2 — Aggregate by normalized item.**
Aggregate per `(itemKey)` — **one grocery line per item is the goal** — carrying the aisle (first/most-specific wins) and a `staple` flag (true only if all contributions are staple). Within an item, keep: one weight total, one volume total, and one count bucket per (unit, container, declared size).

**The resealable boundary (locked preference):** a resealable product (cheese wedge, bag of rice) is bought once to cover every recipe that uses it — sum the need and buy the covering package(s). A single-use container (can, jar) is **not** summed across declared sizes: if recipes call for two 14 oz cans and one 28 oz can of crushed tomatoes, the line reads `"2 × 14 oz can + 1 × 28 oz can crushed tomatoes"` — never a raw-ounce total rounded into some other combination, because an opened can doesn't keep. Counts with no declared size use the purchase-unit's default package (`"1 can"` × 2 recipes → `"2 × 14.5 oz can"`), and loose weight/volume needs for a container-sold item fold into default-size containers.

**Step 3 — Subtract pantry staples.**
If `itemKey` is in Pantry AND every contribution is `staple: true`, **drop the line** (assumed on hand). Non-staple uses of a pantry item still appear.

**Step 4 — Round up to purchasable units.**
Look up `itemKey` in PurchaseUnit:
- **`package` mode:** the package's content (amount + unit) is parsed from `packageLabel` (`"14.5 oz can"` → 14.5 oz; `"2 lb bag"` → 32 oz; `"3-count pack"` → 3; `"12 (dozen)"` → 12), falling back to `packageSize`/`packageUnit`. Then `packages = ceil(need ÷ content)` for weight/volume needs, and **one package per counted container** (a recipe's `"1 can"` buys 1 can — content ounces never divide a container count). Display `"{packages} × {packageLabel} {item}"`, with per-size parts joined by `" + "` when recipes declared different container sizes.
- **`by-weight` mode:** `buyQty = ceil(need / roundIncrement) × roundIncrement` (e.g. round 7.3 lb chicken thighs up to 7.5 lb). Display `"~7.5 lb boneless chicken thighs"`.
- **No entry found:** keep the summed exact amount as the line, set `missingPurchaseUnit: true`, and add the item to `unknownUnits`. These render at the bottom under an **"Add a package size for these"** helper (matching how his real lists already surface this), with a one-tap "add to purchase-units" action.

**Step 5 — Leftover flag.**
If a single package's size ≫ what's used — specifically when **used < ~25% of the bought package amount** (the architecture doc's threshold) — append `leftoverNote` like `"(only 1 needed)"`, `"(only ~½ cup needed — large remainder)"`. Skip when amounts are close.

**Step 6 — Order by store walk.**
Sort items by the Preferences `aisleOrder`: **Frozen → Dairy → Refrigerated → Spices/oil → International → Canned → Pasta/grains/rice → Condiments → Meat → Produce.** The mapping from `ingredient.aisle` to store-walk bucket is 1:1 and deterministic:

| `ingredient.aisle` | Store-walk bucket |
|---|---|
| `frozen` | Frozen |
| `dairy` | Dairy |
| `refrigerated` | Refrigerated |
| `spices` | Spices/oil |
| `international` | International |
| `canned` | Canned |
| `pasta-grains` | Pasta/grains/rice |
| `condiments` | Condiments |
| `meat` | Meat |
| `produce` | Produce |
| `bakery` | Produce (last — bakery is near exit at Woodman's) |

There is no `pantry` aisle at the store; any ingredient that arrives at Step 6 with `aisle: pantry` (a legacy seed value) is a data error that should have been re-assigned at seed time (see §8). If encountered, default to **Condiments** bucket and emit a warning to the `unknownUnits` log so the engineer/seed can correct it.

**Print one flat list, top to bottom, with NO section headers** (locked preference). Within a bucket, keep a stable alphabetical order by item name.

**Output / actions.**
- The List screen shows the flat ordered list with checkboxes; each line is the `displayText` + optional leftover note.
- **Copy to clipboard** produces the plain-text flat list (for pasting into Apple Notes — the app does NOT write to Notes directly, per preference).
- A collapsible **"Add to purchase-units"** section lists `unknownUnits`.
- Regenerating after a plan edit recomputes from scratch but **preserves `checked` state** by matching on normalized `item` key (not `displayText`): if the same item key is present after regeneration, its checked state is preserved regardless of quantity changes. Checked state is reset only if the item is removed from the list entirely. This means a user who already checked off "chicken thighs" in the aisle retains that check even if the quantity changed slightly due to a plan edit.

**Manual line edits.**
Every buy line has an edit affordance (✎): the user can rewrite the line's text, remove it, or add a new line ("＋ Add item"). Edits bump the list's `generatedAt`, so a re-sync of the same chat file never undoes them; only a chat list re-written later (newer file mtime) supersedes, restoring its own lines. Hand-**added** lines are not derivable from any source, so they survive both an in-app rebuild and a chat-list re-sync (deduped by item key). Hand-**edited** or removed lines revert if the chat file is re-written — the file is the source of truth for its own lines.

**Chat-written lists sync into the app.**
A grocery list written by Claude in chat lives at `grocery-lists/<plan-id>.md` (filename = meal-plan id). `build_seed.py` parses it into the bundle (`groceryLists`): buy lines verbatim as `displayText` (the normalized line doubles as the check-state key), and the "Check before you shop" section as on-hand items (`stockStatus: have` + `onHandNote`). Other sections (e.g. purchase-unit suggestions) stay markdown-only. On sync the app imports with a **newest-wins** rule on `generatedAt` (file mtime vs. local list): a re-written chat file supersedes the local list — carrying check-offs across on unchanged lines — while a local list that is newer (including an in-app rebuild) is left alone. Imported lists are labeled "From Claude" on the List screen; the Regenerate button becomes "Rebuild in app" and replaces the chat list with the mechanical §5.3 output. The app never writes lists back to markdown.

**Edge cases**
- Same item, incompatible units → two lines, both shown, neither dropped (failure mode is "list too much," never "drop an ingredient").
- Item used but flagged staple yet NOT in pantry → it appears (don't assume on hand).
- Zero/negative qty after scaling → omitted.

### 5.4 Cook feedback / ratings

**User stories**
- After cooking, I want to answer four quick questions and have the recipe's ratings update so the planner gets smarter.

**Screen behavior (Cook tab → Log a cook)**
- Pick the recipe (defaults to "what's next/uncooked on the active plan").
- Four inputs: **Difficulty 1–5** (stepper/slider), **Actual time** (number, prefilled with the estimate), **Liking 1–5** (stars), **What I'd change** (text).
- Save:
  - Appends a dated `FeedbackEntry` to the recipe's `feedbackLog` and a one-line summary text (matching his markdown style: `"- 2026-06-23 — Took 55 min not 50. Easy. Loved it. Next: more lemon."`).
  - Recomputes rolling `ratings`: `cookCount += 1`; `avgDifficulty`, `avgActualMinutes`, `liked` as running averages.
  - Marks the originating PlanEntry `cooked: true`.

**Edge cases**
- Logging a cook for a base → counts once; finishes are logged separately.
- Editing a past feedback entry → recompute averages from the full `feedbackLog` (don't drift).

### 5.5 Preferences / pantry / purchase-unit management

**User stories**
- I want to keep my staples, package sizes, and rules current so lists stay correct.

**Screen behavior (More tab)**
- **Preferences:** edit household size, dinners/week, calorie targets, cooking style (bulk vs fresh — switches planner defaults), dislikes/rules (toggles), allowed cuisines, equipment, store name + aisle order (reorderable list, but defaults locked to his), units (US, locked).
- **Pantry:** add/remove staple item names (chips). Items here are subtracted when `staple:true`.
- **Purchase units:** table of `item → package/by-weight + size + label`. Add/edit/delete. The "Add to purchase-units" flow from a grocery list deep-links here with the item pre-filled. Includes the item-alias map (synonyms → canonical key) used in §5.3 normalization.

**Edge cases**
- Removing a purchase-unit entry → that item starts flagging again on future lists.
- Editing aisle order → next list generation re-sorts.

### 5.6 Cookbook backlog

- A grid of the ~52 photo references (`recipe pics/IMG_*.jpeg`), each marked **Not captured / Captured / Cooked**.
- "Capture this one" opens Recipe Capture pre-tagged `source: cookbook`, photo shown beside the form (§5.1).
- The planner periodically suggests one un-cooked backlog recipe, preferring **time-rich nights** (the week-2 fresh-cook slot, or any non-bulk night) and easier ones first unless Rutger picks a hard one. Cadence default: surface a nudge roughly **once per plan**, not every week.

---

## 6. Screen-by-screen UX

> Mobile-first. Min tap target 44×44pt. One primary action per screen (bottom-anchored button or FAB). Swipe and long-press are *enhancements*, never the only way to do something.

### 6.1 Plan — Active Plan
- **Purpose:** see the current fortnight at a glance and act on it.
- **Components:** plan header (label, date range, "X/24 dinners"); a **batch-cook card** at top (the two bases + "freeze half" reminder); **Week 1** and **Week 2** sections as day rows (day · cuisine chip · recipe title · finish time · cooked ✓); a **Lunch salads** section; a calorie roll-up summary; rule-check banner if any violation.
- **Primary actions:** "Make grocery list" (→ List tab, generates), "Edit plan", "Log a cook" (→ Cook).
- **Interactions:** tap a day row → recipe detail; long-press a row → quick swap/remove; swipe a row → mark cooked.
- **Empty state:** "No active plan. Plan your next two weeks." → big "Create a plan" button.

### 6.2 Plan — Plan Builder
- **Purpose:** build/edit a plan via the template flow (§5.2).
- **Components:** template chooser; step sections (Bases → Week-1 finishes → Week-2 → Lunch salads → Review); each picker is a searchable recipe sheet filtered to the relevant type; live calorie/cuisine/time summary; "Suggest a plan" button.
- **Primary action:** "Save plan" (sticky bottom). Sets it active.
- **Empty/blocked states:** rule violations shown inline but never block saving; missing-base prompt as described.

### 6.3 Recipes — Library
- **Purpose:** browse/search/filter the recipe library.
- **Components:** search bar; filter chips (cuisine, base/finish/standalone/salad, favorites, never-cooked); recipe cards (title, tags, time, liked stars, calories, BASE/FINISH chip).
- **Primary action:** FAB "+ Capture recipe".
- **Empty state (post-seed this won't show, but):** "No recipes yet — capture your first."

### 6.4 Recipes — Recipe detail
- **Purpose:** read/cook a recipe; see its role and history.
- **Components:** title, meta (servings, time, calories, tags, source); **base/finish linkage** (finish → "Uses {base}" link; base → list of finishes); ingredient list (exact amounts); steps; ratings summary; feedback log (dated entries); if `source: cookbook`, the photo.
- **Primary actions:** "Add to plan", "Log a cook", "Edit".
- **Interactions:** ingredient long-press → "add to pantry"/"set purchase unit".

### 6.5 Recipes — Capture (new/edit)
- As detailed in §5.1: structured form with type toggle, base picker, ingredient rows (item autocomplete, qty, unit, aisle, staple), steps, validation, optional photo pane.
- **Primary action:** "Save recipe".

### 6.6 List — Grocery list
- **Purpose:** the shoppable, store-walk-ordered flat list.
- **Components:** plan label + "generated {time}"; flat checklist (no section headers) in store-walk order; each line = displayText + optional leftover note; progress ("12/41 checked"); collapsible "Add a package size for these" (unknown units).
- **Primary actions:** "Copy list" (plain text → clipboard for Notes), "Regenerate".
- **Interactions:** tap to check/uncheck (persists); checked items dim/strike and optionally sink to bottom (toggle).
- **Empty state:** "No list yet for this plan." → "Generate grocery list".

### 6.7 Cook — Cook log / feedback
- **Purpose:** record how a cook went.
- **Components:** "Up next to cook" (uncooked plan entries from the active plan) at top; recent cooks timeline; "Log a cook" form (recipe picker + the four questions).
- **"Up next" sort order:** sort uncooked entries by `dayDate` ascending (earliest date first); entries with `dayDate: null` go at the end. Show only entries from the active plan. For the batch-cook bulk-prep pattern, this naturally surfaces the batch-cook bases first (Sunday), then week-1 dinners in order.
- **Freezer/reheat entries:** entries tagged `meal: dinner` on Week 2 that correspond to frozen finishes should display a "From freezer — reheat" note rather than prompting a full cook log. The user can still log feedback if desired, but the primary CTA is "Mark done" (sets `cooked: true` without requiring the four questions). Week-2 frozen entries are identifiable when the plan marks them with a note or when the same `recipeId` appears in both week-1 and week-2 with the week-2 `dayDate` ≥ 7 days after week-1's. **Default heuristic:** if a `recipeId` appears more than once in a plan's dinner entries and all occurrences are `meal: dinner`, flag the later occurrence(s) as "likely from freezer."
- **Primary action:** "Save feedback".

### 6.8 More — hub
- List of links: Preferences, Pantry, Purchase units, Cookbook backlog, Backup & export, About.

### 6.9–6.11 More — Preferences / Pantry / Purchase units
- As detailed in §5.5. Form-based; reorderable aisle list; chip-based pantry; table-based purchase units with add/edit.

### 6.12 More — Cookbook backlog
- Photo grid with capture-state badges; "Capture" deep-link (§5.6).

### 6.13 More — Backup / export-import
- "Export all data" → downloads a JSON (and optional markdown bundle) snapshot. "Import" → restore from JSON. Shows `lastBackupAt`. (§8.)

### 6.14 Onboarding / first-run seed
- One-time: "Loading your recipes, plans, pantry, and preferences…" → seeds the store from the bundled snapshot (§8). After seed, lands on the active plan.

### Key end-to-end flows
1. **Plan a 2-week bulk-prep cycle:** Plan tab → Create → "2-week bulk prep" → pick 2 bases → assign 6 week-1 finishes (cuisine-spread warnings) → confirm week-2 (freezer + 1 fresh) → pick 1–2 lunch salads → Review (calories/rules) → Save (active).
2. **Make the list and shop:** Active Plan → "Make grocery list" → List generates in store order → walk store checking items → "Copy list" → paste into Apple Notes.
3. **Log a cook:** finish dinner → Cook tab → "Up next" shows tonight's recipe → Log a cook → four questions → Save → ratings update; plan row shows ✓.
4. **Capture a cookbook-photo recipe:** More → Cookbook backlog → pick a photo → "Capture" → transcribe structured ingredients beside the photo → Save (source: cookbook) → now plannable.

---

## 7. Special handling for Rutger's patterns

| Pattern | How the app handles it |
|---|---|
| **Base + finish recipes** | `isBase` + `baseRecipeId` model the relationship. Plan Builder offers matching finishes after a base is chosen; grocery aggregation counts the base's ingredients once and adds only finishing ingredients per finish (no double-count, no dropped protein). Detail screens cross-link base↔finishes. |
| **Batch-cook day** | The 2-week plan has a distinct **batch-cook card/section** listing the bases at batch scale (12 servings) with the "freeze half immediately" reminder and a combined batch-cook time estimate. |
| **Week 1 fresh / Week 2 freezer** | Plan template separates Week 1 and Week 2; Week 2 auto-repeats Week-1 finishes labeled "from freezer," with one swappable **fresh-cook** slot. Thaw reminders shown in the plan note. |
| **Lunch-salad slots** | Lunches follow the same **base+finish split as dinners**: the prep work (cook protein, chop, portion into containers) is a lunch-prep **base** recipe placed as a `meal: batch` entry on a batch-cook day — it renders on the Batch Cook Day card alongside the dinner bases ("Lunch prep · ×N servings"; a lunch-only batch day renders as "🥗 Batch Prep"). The daily `meal: lunch` entries reference a `finish-…` **assembly** recipe (~5 min, `ingredients: []` — everything was portioned on batch day) and render in the per-day lunch chooser. Groceries flow entirely from the batch entries (collapsed per §5.3 Step 0 when a base preps twice, e.g. a week-2 re-prep); ingredient-less lunch finishes contribute nothing, so nothing double-buys. |
| **Calorie roll-ups per dinner/pair** | `caloriesPerServing` is per-person. Pair dinner total = `(base.cals + finish.cals) × 2` (or `standalone.cals × 2`). Review shows per-night pair total with soft warning outside [1,200–1,800] cal. Target ~1,400/pair. See §5.2 for full formula. |
| **No soups/stews / no cut pork / Thai-only-Asian** | Surfaced at **plan time** as a dismissible rule-check banner: flags recipes tagged `soup`/`stew`, ingredients matching cut-pork (pork chop/shoulder/roast/bacon/ham/tenderloin — but **sausage OK**), and East-Asian cuisines other than Thai. Also flags `pressure-cooker`/`instant-pot` recipes (equipment he lacks). Cilantro is treated as optional (never blocks; noted "serve on side"). |
| **Cookbook-photo backlog nudges** | Backlog grid + periodic planner nudge (~once per plan) to capture & cook one photo recipe, preferring time-rich nights and easier recipes first. |
| **Store-walk list** | Locked aisle order; flat list, no headers; leftover/qty guidance inline; copy-to-clipboard for manual paste into Notes. |
| **US units always** | All entry, storage, and display in US units; no metric anywhere (per memory). |

---

## 8. Technical criteria

### Recommended stack
- **Single self-contained web app**, no server, runnable by opening `index.html` in a phone browser (and installable as a PWA for a home-screen icon + offline).
- **Vanilla TypeScript/JS + a tiny view layer** (e.g. Preact or lit, bundled to a single artifact) — or plain JS if the team prefers zero framework. Avoid heavy build requirements; deliver a runnable bundle (one `index.html` + bundled `app.js`/`app.css`, or fully inlined).
- **No backend, no network dependency at runtime.** Fonts/icons inlined or system.
- **PWA:** a `manifest.json` + service worker so it works fully offline and can be "Add to Home Screen." (Service worker is a nice-to-have for the prototype, expected for the working app.)

### Storage approach
- **IndexedDB** as the system of record (object stores: `recipes`, `mealPlans`, `groceryLists`, `pantry`, `purchaseUnits`, `preferences`, `cookLog`, `meta`). Write-through on every mutation.
- In-memory state hydrated on launch; UI reads from memory, writes persist immediately.
- Schema versioned via `meta.schemaVersion` for forward migrations.

### Seeding mechanism (real data → seed)
- A **build-time seed step** parses the live markdown (`recipes/*.md`, `meal-plans/*.md`, `grocery-lists/*.md`, `pantry.md`, `purchase-units.md`, `preferences.md`) into a single **`seed.json`** bundled with the app.
- On first run (empty store), the app loads `seed.json` into IndexedDB, sets `meta.seededAt`. Subsequent runs skip seeding (store already populated).
- Parsing rules: YAML frontmatter → entity fields (1:1 with §4); `## Steps` → `steps[]`; `## Feedback log` dated bullets → `feedbackLog[]`; ratings block → `ratings`. Purchase-units/pantry/preferences parsed from their bullet lists. The seed step is a small Node script run once by the engineer; the app itself only consumes `seed.json` (it never reads the markdown at runtime — honoring "own storage, no live sync").
- A "**Re-seed / reset to sample data**" action (More → Backup) lets Rutger restore the bundled seed.

**Seed-step data corrections (required — do not skip):**

1. **Aisle re-assignment for `aisle: pantry` ingredients:** The source markdown uses `aisle: pantry` as a catch-all for non-store-section items. This is not a valid store-walk aisle (see §4, §5.3 Step 6). At seed time, the parser must re-assign these using the following lookup table. Ingredients with `staple: true` AND in the pantry catalog are correctly handled by the staple-subtraction rule regardless of their aisle; but they still need a valid aisle for store-walk ordering when NOT subtracted.

   | Item | Corrected `aisle` |
   |---|---|
   | jasmine or basmati rice | pasta-grains |
   | rigatoni | pasta-grains |
   | pasta (any) | pasta-grains |
   | egg noodles | pasta-grains |
   | crushed tomatoes | canned |
   | diced tomatoes | canned |
   | tomato paste | canned |
   | beef broth / chicken broth | canned |
   | black beans | canned |
   | corn (canned or frozen) | canned (or frozen if frozen variety) |
   | coconut milk | canned |
   | kalamata olives | international |
   | capers | condiments |
   | olive oil | spices |
   | croutons | pasta-grains |
   | tortilla chips | pasta-grains |
   | Any remaining `aisle: pantry` item not in the above table | condiments (fallback; log for review) |

   The seed script should emit a warning for any `aisle: pantry` item not explicitly mapped above, so the engineer can add it to the table.

2. **`day` field → `dayDate` + `dayLabel`:** For each PlanEntry, parse the `day:` string to extract an ISO date. Pattern: look for a date embedded in the label (e.g. `"Mon Jun 23"` with plan year → `"2026-06-23"`; `"Sun Jun 22 (batch cook)"` → `"2026-06-22"`). Store both `dayDate` and `dayLabel`. If parsing fails, set `dayDate: null` and log a warning.

3. **Alias map bootstrapping:** Scan all seed recipe ingredient `item` fields and populate the initial alias map with known synonyms found in the data. Required seed-time aliases: `"jasmine or basmati rice"` → `"jasmine rice"`, `"ground beef (85/15)"` → `"ground beef"`, `"corn (canned or frozen)"` → `"corn"`, `"chicken thighs (boneless)"` → `"chicken thighs"`, `"romaine lettuce hearts"` → `"romaine"`. Additional aliases can be added via the Purchase units settings UI.

4. **Photo handling for cookbook backlog:** The ~52 JPEG files in `recipe pics/` are NOT bundled into the app binary (potential 50–200 MB). Instead, the seed step records the filenames only (`sourcePhotoRef` strings). The Cookbook backlog grid (§5.6) shows placeholder cards for unimported photos. Photo display beside the capture form is only available after the user explicitly imports a photo (upload from their device). This decision keeps the app file small and avoids encoding large binaries into seed.json.

### Offline behavior
- Fully offline after first load (PWA cache + IndexedDB). No feature requires the network. Clipboard copy works offline.

### Performance
- Library is ~28 recipes now, growing slowly (+ up to ~52 from the backlog). Everything fits comfortably in memory; list generation is O(ingredients) — instant. No virtualization needed at this scale, but keep list rendering simple/fast.

### Data export / backup
- **Export:** one-tap JSON snapshot of all stores (download). Optional: regenerate a markdown bundle mirroring his original file layout (useful for the future sync project).
- **Import:** restore from a JSON snapshot (replaces store after confirm).
- Encourage periodic export (show `lastBackupAt`), since IndexedDB can be cleared by the browser.

### Future file-sync path (out of scope, not designed against)
- The schema deliberately mirrors his markdown frontmatter 1:1, and export can emit the same file layout, so a later project can diff app-store ↔ files and sync. We add nothing that would make markdown round-tripping impossible (e.g. we preserve `note`, `source`, `base_recipe`, feedback-log text). **No sync UI/logic is built now.**

---

## 9. MVP vs later

### MVP (first working version must do)
- Seed from real data; persist in IndexedDB; offline.
- **Recipes:** library list, search/filter, recipe detail, **capture/edit** with structured ingredients + base/finish.
- **Plan:** view active plan; build a plan (at least the **2-week bulk-prep** template + custom) with base+finish, week1/week2, lunch slots; calorie roll-up; rule-check banner.
- **Grocery list:** full deterministic algorithm (§5.3) — aggregate, pantry-subtract, purchase-unit round, leftover flag, store-walk order, flat no-header list, check-off, copy-to-clipboard, unknown-unit flagging.
- **Cook feedback:** four-question log → updates ratings + feedback log.
- **Settings:** edit pantry, purchase units, preferences.
- Bottom-tab navigation; mobile-optimized.

### Later (nice-to-haves)
- Cookbook backlog grid + planner nudges + photo-beside-form capture (capture itself is MVP; the backlog gallery/nudge can be v1.1).
- "Suggest a plan" auto-planner weighting (manual planning is MVP; auto-suggest is enhancement).
- LLM/OCR pre-fill for cookbook-photo capture.
- Markdown-bundle export (JSON export is MVP).
- Desktop-optimized layout.
- Thaw/prep reminders/notifications.
- Aisle-order drag-reordering UI (defaults locked; editing is later).

---

## 10. Open questions (with sensible defaults applied)

1. **Servings vs calories as the scaling unit.** His recipes carry both `servings` and `caloriesPerServing`; plans scale by servings. **Default applied:** scale by servings (matches his plan files); calories are a display roll-up only. *Confirm this is the intended scaling basis.*
2. **Garlic clove→head conversion (and similar count conversions).** Purchase-units says `garlic: 1 head ≈ 10 cloves`. **Default applied:** convert cloves→heads only at the rounding step using that hint; if absent, list cloves and flag. *Confirm the ~10-cloves/head assumption.*
3. **Leftover-flag threshold.** **Default applied:** flag when used < ~25% of the purchased package (per architecture doc). *Confirm 25% feels right, or set a different cutoff.*
4. **Re-seed behavior on app updates.** **Default applied:** seed only when the store is empty; never auto-overwrite user edits. *Confirm you'd prefer a manual "reset to sample data" over any auto-refresh.*
5. **Plan length default.** **Default applied:** the 2-week bulk-prep template is the primary/default given current cooking style; a 1-week template exists for when style switches to fresh-nightly. *Confirm 2-week is the default to optimize for now.*
6. **Cookbook capture method.** **Default applied:** manual/assisted transcription beside the photo (no OCR) for MVP. *Confirm you're OK transcribing for now, with OCR as a later add.*

---

*End of spec.*
