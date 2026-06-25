# Meal Planner App — UI & Persistence QA Report

**Date:** 2026-06-21  
**Tester:** Automated QA (jsdom + fake-indexeddb + Node.js)  
**App:** `/app-build/app/index.html` — single-file, 2 018 lines  
**Method:** jsdom runtime execution with fake-indexeddb; function calls via window globals; DOM querying after `render()`; simulated reload via second JSDOM instance over shared IndexedDB; static HTML/JS analysis.  

---

## Results Summary

| Section | Tests | PASS | FAIL | WARN |
|---|---|---|---|---|
| 1. Static Analysis | 10 | 10 | 0 | 0 |
| 2. Boot & Seed | 13 | 13 | 0 | 0 |
| 3. Navigation | 16 | 16 | 0 | 0 |
| 4. Recipe Library | 11 | 11 | 0 | 0 |
| 5. Recipe Capture | 13 | 13 | 0 | 0 |
| 6. Grocery List | 14 | 14 | 0 | 0 |
| 7. Cook Feedback | 10 | 10 | 0 | 0 |
| 8. Persistence (Critical) | 9 | 9 | 0 | 0 |
| 9. More Sub-screens | 8 | 8 | 0 | 0 |
| 10. Plan Screen | 10 | 10 | 0 | 0 |
| **Total automated** | **114** | **114** | **0** | **0** |
| Warnings (all jsdom noise) | 7 | – | – | 7 |

**All 7 WARNs are `jsdom: Not implemented: Window's scrollTo()` — a jsdom environment limitation, not an app bug.**

---

## Test Methodology

Tests used:
- `jsdom` with `runScripts: 'dangerously'` to execute the inlined JS
- `fake-indexeddb` (IDBFactory) as the IndexedDB backend
- Static analysis of the HTML source for CSS rules, render function code, and data structures
- Dynamic DOM queries after `navigate()` + sleep to verify rendered output
- Direct calls to `window.dbGet/dbPut/dbGetAll` to verify DB state
- Second JSDOM instance over same IDB to simulate browser reload
- Manual code reading for edge-case behavior

---

## Detailed Test Results

### 1. Static Analysis

| Test | Result |
|---|---|
| T01 Viewport meta `width=device-width,initial-scale=1,viewport-fit=cover` | PASS |
| T02 Apple PWA meta tags (`apple-mobile-web-app-capable`, `theme-color`) | PASS |
| T03 Nav CSS classes `#nav`, `.nt` defined | PASS |
| T04 All 5 tab labels (Plan, Recipes, List, Cook, More) in render code | PASS |
| T05 No metric (kg/g) units in app code | PASS |
| T06 FAB button in render code | PASS |
| T07 44px minimum tap targets in CSS | PASS |
| T08 Clipboard `execCommand` fallback for non-HTTPS | PASS |
| T09 Grocery list renders flat — no `<h2>`/`<h3>`/section headers | PASS |
| T10 AISLE_ORDER constant starts `frozen,dairy,refrigerated,…` | PASS |

### 2. Boot & Seed

| Test | Result | Detail |
|---|---|---|
| T11 28 recipes seeded | PASS | Exactly 28 |
| T12 Active plan seeded | PASS | `2026-06-22-two-weeks` |
| T13 Pantry seeded | PASS | 13 items |
| T14 Purchase units seeded | PASS | 54 entries |
| T15 Preferences correct | PASS | `householdSize=2, unitsSystem=US` |
| T16 Alias map loaded | PASS | 18 entries |
| T17 Cookbook backlog seeded | PASS | 52 entries |
| T18 Meta `seededAt` in IndexedDB | PASS | — |
| T19 No JS errors on boot | PASS | 0 errors |
| T20 App renders content | PASS | 11 496 chars in `#app` |
| T21 All 5 nav tab buttons rendered | PASS | 5 `.nt` buttons |
| T22 Loading screen hidden after boot | PASS | — |
| T23 `getActivePlan()` returns active plan | PASS | 22 entries |

### 3. Navigation

All 13 routes confirmed reachable with rendered content:

| Route | Rendered | Back button |
|---|---|---|
| `#/plan` | ✓ 11 496 chars | n/a (tab) |
| `#/recipes` | ✓ 17 152 chars | n/a (tab) |
| `#/list` | ✓ 2 257 chars | n/a (tab) |
| `#/cook` | ✓ 3 741 chars | n/a (tab) |
| `#/more` | ✓ 2 810 chars | n/a (tab) |
| `#/more/prefs` | ✓ 4 960 chars | ✓ → `#/more` |
| `#/more/pantry` | ✓ 3 838 chars | ✓ → `#/more` |
| `#/more/units` | ✓ 17 255 chars | ✓ → `#/more` |
| `#/more/backup` | ✓ 3 037 chars | ✓ → `#/more` |
| `#/more/backlog` | ✓ 16 148 chars | ✓ → `#/more` |
| `#/plan/build` | ✓ 3 978 chars | ✓ → `#/plan` |
| `#/recipes/new` | ✓ 6 821 chars | ✓ → `#/recipes` |
| `#/recipes/:id` | ✓ with content | ✓ → `#/recipes` |

No dead ends. All back navigations confirmed.

### 4. Recipe Library

| Test | Result | Detail |
|---|---|---|
| T41 All 28 recipe cards rendered | PASS | Exactly 28 `.rc` elements |
| T42 BASE badges | PASS | 4 badges (matches 4 base recipes) |
| T43 FINISH badges | PASS | 12 badges (12 finish recipes) |
| T44 Search bar present | PASS | — |
| T45 Filter chips | PASS | 92 chips (one per tag × recipes) |
| T46 Search filters results | PASS | 2 results for "bolognese" |
| T47 Base recipe shows finish links | PASS | — |
| T48 Finish recipe shows base link | PASS | — |
| T49 Recipe detail shows ingredients (lb/oz/cup) | PASS | — |
| T50 Ratings shown in detail | PASS | — |
| T51–T52 Back from detail | PASS | Returns to `#/recipes` |

### 5. Recipe Capture

| Test | Result | Detail |
|---|---|---|
| T52 Title input present | PASS | — |
| T53 Type select (Standalone/Base/Finish) | PASS | — |
| T54 Servings input | PASS | — |
| T55 Ingredient editor (`#ing-editor`) | PASS | — |
| T56 Base picker appears for Finish type | PASS | `display:none` removed |
| T57 Base picker hides for Standalone | PASS | `display:none` restored |
| T58 "Add ingredient" row appends row | PASS | 1→2 rows |
| T59 Recipe saved to IndexedDB | PASS | 28→29 recipes |
| T60 Saved recipe has ingredients | PASS | — |
| T61 FAB opens capture form | PASS | — |
| T62 Saved recipe shows in library | PASS | (count increment confirmed) |
| T63 Capture saves correct ID to DB | PASS | — |
| T64 FAB navigates to `#/recipes/new` | PASS | — |

### 6. Grocery List

| Test | Result | Detail |
|---|---|---|
| T63 List screen renders | PASS | — |
| T64 Grocery list generates | PASS | **53 items** from active plan |
| T65 Flat list (no section headers inside card) | PASS | — |
| T66 Grocery check-off toggles visual state | PASS | `.gr-row.chk` / `.gr-chk.on` |
| T67 Check state persisted to IndexedDB | PASS | — |
| T68 Copy to clipboard | PASS | 1 474 chars |
| T69 Clipboard output is flat (no aisle headers) | PASS | No "Meat:", "Produce:" etc. |
| T70 Check state preserved after regen | PASS | `frozen peas` check survived |
| T71 Store-walk order correct | PASS | frozen→dairy→…→meat→produce |
| T72 US units in display text | PASS | No kg/g found |
| T73 Check state preserved on regeneration | PASS | item key matched |
| T74 `unknownUnits` array present | PASS | 18 items without purchase units |
| T75 `warnings` array present | PASS | 0 warnings (plan is complete) |
| T76 Grocery toggle (check then uncheck) | PASS | `on=true → on=false` confirmed |

**Grocery algorithm details:**
- Garlic clove→head conversion: 22 cloves → 3 heads (correct)
- Store-walk order verified across all 53 items
- No metric units in any display text
- 18 items flagged in "Add package size for these" collapsible section (see bugs)

### 7. Cook Feedback

| Test | Result | Detail |
|---|---|---|
| T77 Cook screen renders | PASS | 3 741 chars |
| T78 "Up next to cook" section | PASS | Shows uncooked plan entries |
| T79 Log a Cook button | PASS | — |
| T80 Cook modal opens | PASS | Sheet with 5 difficulty stars + 5 like stars |
| T81 `cookCount` incremented | PASS | 0→1 after `saveCookFeedback()` |
| T82 `avgDifficulty` computed | PASS | 3 |
| T83 Feedback log entry saved | PASS | With correct `changeNote` |
| T84 CookLog entry in IndexedDB | PASS | — |
| T85 Recipe ratings persisted | PASS | `{cookCount:1,avgDifficulty:3,avgActualMinutes:50,liked:5}` |
| T86 `markDone()` function for freezer | PASS | toggles `cooked: true` |

Cook modal has all 4 inputs: 5 difficulty stars, stepper for time, 5 like stars, textarea for notes. All update `_cookLogState` correctly.

Freezer detection: 5 week-2 entries correctly detected as "likely from freezer."

### 8. Persistence (Critical)

All 9 persistence tests **PASS** — this is the most critical section.

| Test | Result |
|---|---|
| T87 App re-boots on reload (same IDB) | PASS |
| T88 Added recipe survives reload | PASS |
| T89 Cook feedback persists | PASS |
| T90 Ratings persist | PASS |
| T91 Pantry item persists | PASS |
| T92 Grocery check state persists | PASS |
| T93 Preferences persist | PASS |
| T94 Reset to seed restores 28 default recipes | PASS |
| T95 Reset restores default preferences | PASS |

Write-through confirmed: every mutation (`dbPut`) immediately writes to IndexedDB. Second JSDOM instance (simulating browser reload) sees all changes.

### 9. More Sub-screens

| Test | Result |
|---|---|
| T96 Preferences form saves to DB | PASS |
| T97 Pantry chips rendered (13) | PASS |
| T98 Pantry add item via form | PASS |
| T99 Purchase units content (lb/oz) | PASS |
| T100 Backup screen (Export/Import/Reset) | PASS |
| T101 Export button triggers download | PASS |
| T102 Cookbook backlog content | PASS |
| T103 No console errors | PASS |

### 10. Plan Screen & Builder

| Test | Result |
|---|---|
| T104 Plan screen has content | PASS |
| T105 Day rows rendered (14) | PASS |
| T106 Batch cook section visible | PASS |
| T107 Calorie info shown (1 660, 1 800, 1 780 cal…) | PASS |
| T108 Base recipes shown | PASS |
| T109 "Make grocery list" / "List" button present | PASS |
| T110 Week 1 and Week 2 sections | PASS |
| T111 Plan Builder renders | PASS |
| T112 Builder shows template options (2-week bulk, 1-week, custom) | PASS |
| T113 Builder step navigation works (Next → advances step) | PASS |

---

## Bug List

### Minor Bugs (no critical/major failures found)

#### BUG-1 — "Add to plan" button missing from recipe detail
**Severity:** Minor  
**Spec:** §6.4 — "Primary actions: Add to plan, Log a cook, Edit"  
**Screen:** Recipe Detail (`#/recipes/:id`)  
**Repro:** Navigate to any recipe → detail screen  
**Actual:** Only "Edit" button shown. "Add to plan" is absent.  
**Impact:** User cannot add a recipe to a plan directly from the detail view. They must use Plan Builder. Workflow friction, not blocking.  
**Function:** `renderRecipeDetail()` lines 924-927 — no "Add to plan" button implemented.

#### BUG-2 — "Log a Cook" hidden for recipes not on active plan
**Severity:** Minor  
**Spec:** §6.4 — "Primary actions: …, Log a cook, …"  
**Screen:** Recipe Detail (`#/recipes/:id`)  
**Repro:** Navigate to a recipe that is NOT in the active plan (e.g. `beef-bolognese-rigatoni`, which is a standalone not on the current two-week plan) → detail screen  
**Actual:** "Log a Cook" button is absent (condition: `planEntryIdx >= 0` is false).  
**Impact:** Can only log cooks for plan entries, not for ad-hoc cooking. `saveCookFeedback` works fine when called directly; the button is just hidden.  
**Fix:** Change `${planEntryIdx >= 0 ? ... : ''}` to always show the button, calling `startCookLog(-1)` and letting the user pick the recipe in the modal.

#### BUG-3 — 18 items lack purchase unit entries (cosmetic/UX, not a data bug)
**Severity:** Minor / Informational  
**Screen:** Grocery List (`#/list`)  
**Items:** dried thyme, cucumber, cherry tomatoes, red onion, rigatoni, carrot, celery, bay leaf, red pepper flakes, curry powder, garam masala, fish sauce, dijon mustard, worcestershire sauce, butter, fresh parsley, garlic powder, caesar dressing  
**Actual behavior:** These appear correctly in the "Add package size for these (18)" collapsible section with deep-link to Purchase Units. This is per-spec behavior (the app correctly flags them). The section is functional — just needs Rutger to fill in the sizes.  
**Not a code bug** — this is expected first-run behavior.

#### BUG-4 — `URL.createObjectURL` throws in non-browser environments (jsdom only)
**Severity:** Not an app bug (test environment limitation)  
**Screen:** Backup & Export  
**Notes:** Export correctly uses `URL.createObjectURL(blob)` + anchor click to trigger download. This throws in jsdom but works in a real browser. Verified by mocking `URL.createObjectURL` — the download link is constructed and `click()` is called.

---

## Additional Verified Behaviors

### Grocery Algorithm (§5.3)
- **Store-walk order:** Verified across all 53 items: frozen → dairy → refrigerated → spices → international → canned → pasta-grains → condiments → meat → produce
- **No section headers:** Flat list confirmed in both rendered DOM and clipboard output
- **Pantry subtraction:** All 13 pantry staples (salt, pepper, olive oil, etc.) correctly excluded via `staple: true`
- **Unit normalization:** `cup grated→cup`, `bottle (12 oz)→each`, `stalk→each`, `cans→each` — all correct
- **Garlic conversion:** 22 cloves → 3 heads, display: "3 head garlic (~10 cloves each)"
- **Alias map applied:** 18 alias entries correctly normalize ingredient names for aggregation
- **aisle:pantry re-assigned:** 0 ingredients with `aisle:'pantry'` in DB (all re-mapped at seed time)
- **No bad ingredients:** 0 ingredients with missing item/qty/unit/aisle

### Rule Checks (§7)
- Pork chop → "Contains cut pork" ✓
- Soup-tagged recipe → "Contains soup/stew tag" ✓
- Korean-tagged recipe → "Non-Thai East-Asian cuisine" ✓
- Thai-tagged recipe (tag `thai` only) → no warning ✓ (correct: only `chinese/japanese/korean/vietnamese/asian` blocked)
- `dismissRuleWarnings()` function present ✓

### Plan Screen
- Calorie roll-ups shown per dinner: 1 660, 1 800, 1 780, 1 720, 1 800 cal/pair
- Week 1 / Week 2 sections present
- Batch cook card visible
- 14 day rows rendered for active plan
- Progress: "0 / 12 dinners cooked" indicator
- `toggleCooked()` correctly toggles `cooked` flag and persists to DB

### Cook Screen
- "Up next to cook" shows uncooked dinners sorted by date (earliest first)
- Freezer entries (5 week-2 repeated recipes) show "From freezer — reheat" with "Mark done" button
- Recent cooks section appears after any feedback is logged
- All 4 inputs functional: difficulty stars, time stepper (+5 min increments), liking stars, change-note textarea

### Mobile / Static
- Viewport meta: `width=device-width,initial-scale=1,viewport-fit=cover` ✓
- PWA: `apple-mobile-web-app-capable`, `theme-color:#1C1917` ✓
- Tap targets: `.btn-p` = 52px, `.nt` = 8px padding + icon + label (~56px), `.more-row` = `min-height:56px` ✓
- `safe-area-inset-bottom` used in nav padding ✓
- System font stack (no external fonts) ✓
- Clipboard: `navigator.clipboard` with `execCommand('copy')` fallback for non-HTTPS ✓

---

## Conclusion

The app is **solid end-to-end.** All 114 automated tests pass. Persistence is excellent — every mutation (recipe add, cook feedback, pantry edit, grocery check, preferences) survives a simulated reload. The grocery algorithm is correct: store-walk order, flat list, pantry subtraction, unit normalization, check-state preservation on regen, and US units throughout all pass.

The two Minor bugs found (missing "Add to plan" button and "Log a Cook" hidden for off-plan recipes) are spec gaps with easy fixes, not blocking for real use. The 18 missing purchase-unit entries are expected first-run data gaps, not code bugs — the flagging mechanism works correctly.

**No Critical or Major bugs found.**
