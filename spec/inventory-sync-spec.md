# Inventory Sync — Product & Technical Spec

**Status:** Addendum to main spec (Phase 2 addition)
**Audience:** Engineer building the meal-planning app; read alongside `spec.md` and `TECH-SCOPE.md`.
**Scope:** Adds inventory awareness to the existing app. Everything in `spec.md` stands; this document specifies the additions and modifications only. The app already runs on IndexedDB, seeded from `seed.json`, with `schemaVersion: 2`.

---

## 1. Overview & boundary

### What this adds

Rutger has a freezer full of beef and a pantry full of grains, canned goods, and dried chiles. The skill layer already tracks this in `inventory.md`. This spec wires that data into the app so the grocery list shows stock indicators, the Plan screen surfaces what's on hand, and logging a cook decrements the relevant items.

### Layer ownership

The skill layer (the Claude chat skills) owns `inventory.md` as the authoritative source of truth. It handles intake (receipt → inventory, photo → inventory), depletion logic during cook-feedback, and planning prioritization in chat. The app is a **consumer** of inventory data, not a co-owner of the markdown. The app may write rough quantity adjustments back to its local IndexedDB store, but it never writes `inventory.md` directly.

| Task | Skill (chat) owns it | App (interface) owns it |
|---|---|---|
| Capture from grocery photo | Yes — structured parse in chat | No |
| Capture from receipt | Yes — receipt text → frontmatter items | No; app may later add an intake screen (§8), but not in this scope |
| Planning prioritization (prefer on-hand) | Yes — meal-planner skill applies the floor rule | Yes — Plan screen surfaces the floor-rule status as a badge (§7); planner skill is the decision engine |
| Grocery stock indicator ("probably enough on hand") | Yes — grocery-list skill cross-checks inventory in chat output | Yes — List screen renders `stockStatus` field on each GroceryItem (§5) |
| Depletion on cook | Yes — cook-feedback skill decrements `inventory.md` | Yes — Cook screen mirrors depletion into IndexedDB inventory (§6) |
| Manual stock edits | No (user can edit `inventory.md` directly, re-seed if needed) | Yes — Inventory screen (§8) allows add/edit/delete/adjust qty in-app |

### No live sync

The app has no live connection to `inventory.md`. Inventory is seeded into IndexedDB exactly like recipes and preferences are: `build_seed.py` parses the markdown and writes a `seed.json` that is loaded on first run (or on explicit re-seed). This is consistent with the non-goal in `spec.md` §1: "No live sync to his markdown files." A future bridge between the app's local edits and the markdown file is explicitly out of scope here.

When Rutger adds items via the skill (receipt intake, photo capture), he re-seeds the app. When he makes in-app adjustments, those live in IndexedDB only — they don't flow back to the markdown. Both layers drift over time; rough tracking is the explicit design goal (see §9).

---

## 2. Inventory entity schema for `seed.json`

### Schema version bump

`seed.json` moves from `schemaVersion: 2` to `schemaVersion: 3`. The `meta` block becomes:

```json
"meta": {
  "schemaVersion": 3,
  "generatedAt": "2026-06-28T00:00:00Z",
  "description": "Seed data parsed from Rutger's markdown meal-planning files"
}
```

**What v3 adds over v2:**
- A top-level `inventory` array (the new entity, described below).
- `GroceryItem` gains three new fields: `stockStatus`, `onHandQty`, `onHandUnit` (§5).
- `PlanEntry` gains one new field: `usesInventory` (§7).
- `meta.inventoryUpdatedAt` — the `updated:` date from `inventory.md` frontmatter, carried through for display.

Old v2 seeds (without an `inventory` key) are valid. The app treats a missing `inventory` array as an empty inventory. No migration needed for existing data; the IndexedDB seed-loader skips the inventory store if the key is absent.

### InventoryItem entity

Maps 1:1 to each entry in `inventory.md`'s `items:` list. Field names are camelCase to match the rest of the schema; values mirror the markdown frontmatter exactly.

| Field | Type | Notes |
|---|---|---|
| `id` | string (slug) | Primary key, e.g. `chuck-roast`. Generated from `item` name: lowercase, spaces → hyphens, special chars stripped. |
| `item` | string | Normalized item name, e.g. `"chuck roast"`. Must match the normalization rule (§4) used in recipes and grocery items. |
| `qty` | number | Current approximate quantity on hand. |
| `unit` | string | `each` \| `lb` \| `oz` \| `can` \| `jar` \| `bag` \| `box`. US units only. |
| `location` | string | `freezer` \| `fridge` \| `pantry`. |
| `aisle` | string | `meat` \| `canned` \| `pasta-grains` \| `spices` \| `international` \| `condiments` \| `produce` \| `dairy`. Same aisle vocabulary as the grocery algorithm. |
| `group` | string | Coarse bucket: `beef` \| `tomatoes` \| `beans` \| `grains` \| `pasta` \| `chiles` \| `fish` \| `other`. Used by the Plan screen to enforce variety (§7). |
| `addedAt` | ISO date string | Date the item was added to inventory, e.g. `"2026-06-28"`. Corresponds to `added:` in frontmatter. |
| `approx` | boolean | `true` when the quantity is a rough estimate (most freezer items). Passed through to the stock indicator (§5): `approx: true` items always render in the "check before you shop" section regardless of computed `stockStatus`. |
| `note` | string \| null | Free-text note from frontmatter, e.g. `"steak; quick high-heat cook"`. Display-only. |

**Example single entity:**

```json
{
  "id": "chuck-roast",
  "item": "chuck roast",
  "qty": 4,
  "unit": "each",
  "location": "freezer",
  "aisle": "meat",
  "group": "beef",
  "addedAt": "2026-06-28",
  "approx": true,
  "note": "braising cut → ragù / pot roast / shredded (not soupy)"
}
```

**Example `inventory` array block in `seed.json` (truncated):**

```json
"inventory": [
  {
    "id": "bone-in-rib-eye",
    "item": "bone-in rib-eye",
    "qty": 2,
    "unit": "each",
    "location": "freezer",
    "aisle": "meat",
    "group": "beef",
    "addedAt": "2026-06-28",
    "approx": true,
    "note": "steak; quick high-heat cook"
  },
  {
    "id": "chuck-roast",
    "item": "chuck roast",
    "qty": 4,
    "unit": "each",
    "location": "freezer",
    "aisle": "meat",
    "group": "beef",
    "addedAt": "2026-06-28",
    "approx": true,
    "note": "braising cut → ragù / pot roast / shredded (not soupy)"
  },
  {
    "id": "coconut-milk",
    "item": "coconut milk",
    "qty": 1,
    "unit": "can",
    "location": "pantry",
    "aisle": "international",
    "group": "other",
    "addedAt": "2026-06-28",
    "approx": false,
    "note": "unsweetened, 13.5 fl oz — good for Thai curry"
  },
  {
    "id": "farro",
    "item": "farro",
    "qty": 1,
    "unit": "bag",
    "location": "pantry",
    "aisle": "pasta-grains",
    "group": "grains",
    "addedAt": "2026-06-28",
    "approx": false,
    "note": "Bob's Red Mill, 24 oz — grain bowls/salads"
  }
]
```

`unitsSystem` remains `"US"` in preferences (unchanged from v2). No metric quantities ever appear in inventory items.

### IndexedDB object store

Add one new object store to the IndexedDB schema (alongside `recipes`, `mealPlans`, etc.):

| Store name | Key | Indexes |
|---|---|---|
| `inventory` | `id` | `location`, `group` |

The `location` index supports "show me all freezer items" queries (Plan screen chips, §7). The `group` index supports the variety check (§7).

---

## 3. How `inventory.md` parses into seed

`inventory.md` uses the same frontmatter-YAML pattern as recipes: a YAML block between `---` delimiters at the top of the file, with an `items:` list.

`build_seed.py` already knows how to parse this pattern (it uses the same parser for recipes). Add a step:

1. Read `inventory.md`, parse YAML frontmatter.
2. Extract `updated:` → write to `meta.inventoryUpdatedAt` in seed.
3. For each entry in `items:`:
   - Generate `id` slug from `item`: `item.lower().replace(' ', '-').replace('/', '-')`, strip parentheses and special chars.
   - Map `added` → `addedAt` (rename to camelCase; value unchanged).
   - Pass all other fields through as-is (they already match the schema).
4. Write the resulting array to `seed.json` under the `inventory` key.
5. Bump `schemaVersion` to `3`.

Items with `approx: true` (no special handling needed at parse time — the flag is just carried through and consumed at render time in the stock indicator).

Re-seeding is the same process as always: run `build_seed.py`, then on next app load the seed-loader detects `schemaVersion: 3`, clears and re-populates the `inventory` store. The seed-loader should merge rather than wipe existing in-app edits where possible (match by `id`; preserve `qty` if the item exists in the store already and the user hasn't re-seeded with a fresh receipt). However, an explicit "re-seed from file" action (already in the Backup/export screen per `spec.md`) is a full replace — document this behavior to the user.

---

## 4. Name normalization and matching rules

This section is the crux. Three layers — recipe ingredients, inventory items, and grocery line items — must use the same normalized item names so they can be cross-referenced reliably. The normalization is already partially specified in the main spec (§4, `Ingredient.item`) and in the design brief; this section formalizes it for the inventory layer and the grocery algorithm.

### Canonical normalization function

A single `normalizeItem(str)` function lives in `grocery-algo.js` and is used everywhere names are compared. The rules, in order:

1. **Lowercase.** `"Chuck Roast"` → `"chuck roast"`.
2. **Strip brand names and package sizes.** Remove parenthetical qualifiers and leading/trailing brand words. `"Bob's Red Mill farro"` → `"farro"`. `"Cento canned diced tomatoes (14.5 oz)"` → `"canned diced tomatoes"`. The brand removal relies on a small known-brands list (`build_seed.py` handles this at seed time so the `item` field in seed.json is already clean; the app's runtime normalization only needs to handle user-typed names in the Inventory screen).
3. **Normalize tomato variants to their meaningful noun.** `"canned diced tomatoes"`, `"canned whole tomatoes"`, `"petite diced tomatoes"` — these are distinct items and should NOT be collapsed (a recipe calling for diced tomatoes should match the diced-tomatoes inventory entry, not the whole-tomatoes entry). Keep the qualifier that distinguishes them.
4. **Singular-ish.** Drop a trailing `s` only when it's clearly a plural inflection and the singular form is unambiguous. `"onions"` → `"onion"`. Do not de-pluralize compound nouns like `"black beans"` — that would produce `"black bean"`, which then fails to match. In practice: keep the item name exactly as it appears in `inventory.md`'s `item` field; the seed data is already clean. Apply de-plural only for user input in the Inventory screen add/edit form.
5. **No aisle prefix in the item name.** The `aisle` field carries location info; the item name itself should not repeat it. `"pantry coconut milk"` → `"coconut milk"`.

### Fuzzy matching for steaks and braising cuts

Exact normalization handles most cases. Two categories need fuzzy matching because recipe ingredient names don't always align with specific cut names in inventory:

**Steaks (quick-cook cuts):** Any recipe ingredient whose normalized name contains `"steak"`, or is one of `["ribeye", "rib-eye", "new york strip", "sirloin", "strip steak"]`, matches any inventory item in the beef group whose note contains `"steak"` or whose item name contains `"steak"`. The inventory items `bone-in rib-eye`, `new york strip steak`, `sirloin steak`, `cube steak`, and `round steak` all match.

**Braising cuts:** Any recipe ingredient whose normalized name is one of `["beef chuck", "chuck roast", "stew beef", "beef stew meat", "braising beef", "arm roast", "short rib", "beef short rib"]` matches inventory items in the beef group whose note contains `"brais"` or whose item name contains any of: `"chuck"`, `"arm roast"`, `"stew meat"`, `"short rib"`, `"oxtail"`. This covers `chuck roast`, `arm roast`, `beef stew meat`, `beef short ribs`.

Implement this as a two-pass lookup in `grocery-algo.js`:
1. Exact match on `normalizeItem(ingredient.item) === normalizeItem(inventoryItem.item)`.
2. If no exact match, run the steak/braise fuzzy rule.
3. If still no match, `stockStatus` is `"buy"` (not in inventory).

The matching result returns the best single inventory item (highest `qty` if multiple candidates match). When multiple cuts match (e.g. a recipe calls for "beef stew meat" and both `beef stew meat` and `chuck roast` entries exist), prefer the entry whose `item` name is the closest string match, then fall back to highest qty.

### Why this matters

If normalization diverges across layers, items go un-matched: a recipe says `"chuck roast"`, inventory has `"Chuck Roast"`, and the grocery algorithm marks it `"buy"` when the freezer has four. Getting this right in `grocery-algo.js` once — and using the same function everywhere names are compared — is the cheapest fix.

---

## 5. Grocery list stock fields

### New fields on GroceryItem

Each `GroceryItem` gains three new fields (added to the entity defined in `spec.md` §4):

| Field | Type | Notes |
|---|---|---|
| `stockStatus` | `"have"` \| `"low"` \| `"buy"` | Computed at list-generation time. |
| `onHandQty` | number \| null | The matched inventory item's current `qty`. `null` if no match. |
| `onHandUnit` | string \| null | The matched inventory item's `unit`. `null` if no match. |

### Computation

Run this check inside `grocery-algo.js` after the existing 6-step aggregation, before producing the final list. For each aggregated grocery line (after pantry subtraction):

1. Run the name match (§4) against the inventory store.
2. If no match: `stockStatus = "buy"`, `onHandQty = null`, `onHandUnit = null`.
3. If match found, compare on-hand quantity to needed quantity:
   - Convert both to the same unit when possible (e.g. `onHandQty` in `lb` vs `neededQty` in `lb` — direct compare; `each` vs `lb` — cannot compare numerically, treat as `low`).
   - If `onHandQty >= neededQty` (same unit, same scale): `stockStatus = "have"`.
   - If `onHandQty > 0` but `< neededQty` (or units not directly comparable but inventory is non-zero): `stockStatus = "low"`.
   - If `onHandQty === 0`: `stockStatus = "buy"`.
4. If the matched inventory item has `approx: true`, cap `stockStatus` at `"low"` — never mark an approx-tracked item as `"have"`. The quantity estimate isn't precise enough to guarantee sufficiency. This is the single most important safeguard against silently skipping a shopping trip.

### List screen rendering

The grocery list currently renders a flat, ordered list. Inventory awareness adds a **"Check before you shop"** section above the main buy list:

**"Check before you shop" section** — collapsible, defaults open:
- Contains all items where `stockStatus === "have"` (including any `approx: true` items that would have scored `"have"` before the approx cap).
- Each row shows: item name + `"probably enough on hand"` badge (green background, muted text).
- Tapping the row expands to show: `"On hand: {onHandQty} {onHandUnit}"` and a note `"Tracking is rough — verify before skipping this."`.
- These items do **not** appear in the buy list. They are surfaced, not silently dropped.

**"Have some — top up" indicator** — on buy-list rows where `stockStatus === "low"`:
- Render a yellow badge `"have some"` next to the item name in the buy list.
- The row remains in the buy list (still needs to be purchased; just less urgently).
- Expand to show: `"On hand: {onHandQty} {onHandUnit} — top up to {buyQty} {buyUnit}."`.

**Normal buy rows** — `stockStatus === "buy"`: no change from current behavior.

**Section order in the rendered list:**
```
[ Check before you shop (have) ]  ← collapsible header
  • bone-in rib-eye × 2 each  [probably enough on hand]
  • coconut milk × 1 can       [probably enough on hand]

[ Your buy list ]
  • chuck roast × 2 each  [have some]   ← low
  • jasmine rice 2 lb bag
  • ...
```

The section headers are the only structural change to the flat list. The existing store-walk order is preserved within the buy list section; the "have" section groups all have-items together above it regardless of aisle.

---

## 6. Depletion semantics (Cook screen)

When Rutger logs a cook in the app, the Cook screen decrements inventory quantities for matching ingredients, mirroring what the cook-feedback skill does to `inventory.md` in chat. Both layers deplete independently and drift over time — rough tracking by design.

### Algorithm

Run `depleteInventory(recipeId, scaledServings)` after the user confirms the cook log. Steps:

1. Load the recipe from the IndexedDB `recipes` store.
2. Compute the serving scale factor: `scale = scaledServings / recipe.servings`.
3. For each ingredient in `recipe.ingredients`:
   a. Skip if `ingredient.staple === true` (pantry staples are not tracked in inventory).
   b. Run the name match (§4) against the `inventory` store.
   c. If no match: skip silently (that ingredient wasn't in inventory — nothing to decrement).
   d. If match found:
      - Compute `usedQty = ingredient.qty * scale`.
      - Convert units if needed: recipe qty in `oz` and inventory qty in `lb` → convert `usedQty` to `lb` (`usedQty / 16`). Recipe qty in `each` and inventory qty in `lb` → cannot convert numerically; decrement inventory by `1 each` count if unit is `each`, or skip if unit mismatch is irreconcilable.
      - New qty: `newQty = Math.max(0, inventoryItem.qty - usedQty)`. Floor at 0 — never go negative.
      - Write `{ ...inventoryItem, qty: newQty }` back to the `inventory` IndexedDB store.
4. After all decrements: if any inventory item reached `qty === 0`, optionally show a toast: `"Marked {item} as used up."` (non-blocking).

### Worked example

Recipe: **Chuck Roast Ragù** (serves 6). User logs cook scaled to 6 servings (scale = 1.0). Relevant ingredients:

| Ingredient | Recipe qty | Unit | Inventory match | On-hand qty | After depletion |
|---|---|---|---|---|---|
| chuck roast | 1 | each | `chuck-roast` (4 each) | 4 | 3 |
| canned diced tomatoes | 1 | can | `canned-diced-tomatoes` (1 can) | 1 | 0 |
| garlic | 4 | clove | no match | — | unchanged |
| olive oil | 2 | tbsp | staple → skip | — | unchanged |

Result: `chuck-roast` qty goes 4 → 3; `canned-diced-tomatoes` goes 1 → 0 (toast shown); garlic and olive oil unaffected.

### Write-through

Each `put()` call to the `inventory` store is immediate (same write-through pattern as all other IndexedDB writes in the app). No batching, no undo. The rough-tracking design means a mistaken decrement is corrected by the user on the Inventory screen (§8) or by the next re-seed from a fresh receipt.

---

## 7. Planner surfacing

### `usesInventory` on PlanEntry

Add one field to `PlanEntry` (defined in `spec.md` §4):

| Field | Type | Notes |
|---|---|---|
| `usesInventory` | string[] | Array of `inventoryItem.id` slugs that the plan entry's recipe ingredients match against the current inventory at plan-generation time. Computed when the plan is created or edited. Empty array `[]` if no matches. |

This field is computed by running the same name-match (§4) over the recipe's ingredients against the inventory store at the moment the plan entry is saved. It is not updated in real time as inventory depletes — it reflects what was on hand when the plan was built.

### "From your freezer/pantry" chips

On the **Plan screen**, each plan entry card (DayRow) gains small chips below the recipe title when `usesInventory` is non-empty:

```
[Chuck Roast Ragù]
  🧊 from freezer  🥫 from pantry
```

- `🧊 from freezer`: shown if any matched inventory item has `location === "freezer"`.
- `🥫 from pantry`: shown if any matched inventory item has `location === "pantry"` or `"fridge"`.

Tapping a chip expands a small popover: `"Uses: chuck roast (×1), canned diced tomatoes (×1 can)"` — the specific items from inventory being consumed.

### Floor rule badge

The design brief specifies a soft weekly floor: **at least 1 on-hand meat AND at least 1 other on-hand ingredient used each week.** Validate this on the Plan screen and display it as a checklist badge at the top of the weekly group:

```
Week 1  ✓ Uses freezer meat  ✓ Uses pantry item
Week 2  ✗ No on-hand meat this week
```

**Validation logic:**
- "On-hand meat used this week": any PlanEntry in the week where `usesInventory` includes an inventory item with `aisle === "meat"`.
- "Other on-hand item used this week": any PlanEntry in the week where `usesInventory` includes any inventory item with `aisle !== "meat"`.
- A week that satisfies both conditions shows two green checkmarks; failing one shows a red `✗` for that line only.

The badge is informational — no blocking, no forced correction. The user dismisses it or adjusts the plan at will.

### Variety guidance (no beef-only weeks)

The beef freezer is heavily loaded. A week where every on-hand ingredient used is in `group === "beef"` should surface a soft warning:

```
⚠️  All on-hand items this week are beef — consider adding a pantry grain or canned good.
```

Trigger this when the week has 2+ `usesInventory` matches and ALL matched items have `group === "beef"`. One simple banner under the week header; not a blocking validation.

---

## 8. Inventory screen (app-side management)

Receipt intake (receipt → inventory) stays in the skill layer for now. The app needs a place where Rutger can view and hand-edit his current inventory — adjusting quantities after a cook, removing items he used up, adding something he noticed in the freezer.

### Location in navigation

Add **Inventory** as an item in the **More** tab hub (alongside Preferences, Pantry, Purchase units, Cookbook backlog, Backup). This keeps the bottom nav unchanged.

### Screen: Inventory

Add `InventoryScreen.js` to `src/screens/`.

**List view (default):**
- Grouped by `location` (Freezer / Fridge / Pantry), then sorted by `group` within each location.
- Each row: item name + qty + unit + a small `approx` badge if `approx: true`.
- Swipe-left on a row (or a row action button): Edit | Delete.
- `+` button in the header: Add new item (opens edit form).

**Edit form (modal or push screen):**
- Fields: Item name (text), Qty (number), Unit (picker: each / lb / oz / can / jar / bag / box), Location (picker: freezer / fridge / pantry), Aisle (picker: same values as schema), Group (picker: same values as schema), Approx (toggle), Note (text, optional).
- On save: generate `id` slug from item name, write to IndexedDB `inventory` store. If an item with that `id` already exists, update in place.
- Validation: item name and qty are required; all others optional (default `approx: true` for new items since tracking is rough).

**Qty adjust shortcut:**
- On the list view, tapping the qty value directly (e.g. `"4 each"`) opens an inline stepper to increment/decrement by 1. Faster than opening the full edit form for a quick "used one last night" adjustment.

**No barcode scanning in this scope.** (Listed explicitly in §9 non-goals.)

**Relationship to re-seed:** A note at the top of the Inventory screen: `"Last seeded from inventory.md on {meta.inventoryUpdatedAt}. In-app edits are stored locally. To sync from your markdown file, use Backup → Re-seed."` This keeps the boundary clear for the user.

---

## 9. Scope, non-goals, and versioning

### Schema versioning

- `schemaVersion: 3` adds the `inventory` array, the three new `GroceryItem` fields, and the `PlanEntry.usesInventory` field.
- Old v2 seeds load correctly; the `inventory` store initializes empty, stock indicators show `"buy"` for all items (no inventory data), and no chips appear on the Plan screen. The Inventory screen shows an empty state with a prompt to re-seed.
- A v3 → v4 migration path is not specified here; follow the existing pattern in `db.js` (check `meta.schemaVersion` on open, run migrations in sequence).

### Non-goals for this addition

- **No barcode scanning.** Intake is photo+receipt in the skill layer or manual entry in the Inventory screen.
- **No live sync.** `inventory.md` and the app's IndexedDB inventory diverge over time. That is acceptable; tracking is rough.
- **No unit system changes.** US units only (lb/oz/cups/each). The `unitsSystem: "US"` preference in seed is unchanged.
- **No perfect depletion accuracy.** The depletion algorithm makes best-effort matches and floors at zero. A missed match (unit mismatch, fuzzy match failure) is logged to the console but does not block the cook log save.
- **No cross-device sync.** Single device primary, consistent with the main spec non-goals.
- **No receipt OCR in the app.** Receipt intake stays in chat (skill layer) for this phase.
- **Inventory does not replace the Pantry catalog.** The `pantry` store (the staples list in `spec.md` §4) remains unchanged and continues to govern `staple: true` grocery suppression. Inventory tracks quantities of specific items; the Pantry catalog tracks the always-assumed-on-hand staples that are never listed on the grocery list at all. A coconut milk can in inventory is tracked and depleted; table salt in the Pantry catalog is always assumed present and never tracked.

### Tracking philosophy

Inventory tracking is rough by design. The goal is "roughly correct" — enough to surface useful stock indicators and avoid obvious unnecessary purchases, not a precise running ledger. When in doubt, surface the item for verification (`approx: true` items always land in "check before you shop") rather than silently assuming the quantity is right. The system should never cause Rutger to skip buying something he actually needs.
