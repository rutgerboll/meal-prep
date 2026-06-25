# Project Context — Meal Planning App for Rutger

This file is the shared brief for every agent working on this project. Read it fully before starting.

## What we're building
A **personal meal-planning app** for Rutger, a perfect fit to how he already plans meals.
Today his system is a set of Claude "skills" operating over markdown files. We're turning
that workflow into a real app he can use day to day.

### Locked product decisions (from Rutger — do not relitigate these)
1. **Mobile-first.** Primary device is his **phone**. Optimize layouts, tap targets, and
   flows for a phone. Desktop can be a nice-to-have but phone wins every tradeoff.
2. **Deliverable: prototype first, then working app.** Build a high-fidelity clickable
   prototype to lock the design, THEN implement it as a real, working app.
3. **Self-contained storage seeded with his real data.** The app has its **own storage
   system** (e.g. browser localStorage/IndexedDB), **seeded** from his real meal-planning
   files. It does NOT read/write his markdown files directly. (If it works well, a later,
   separate project will sync app <-> files. Out of scope here.)
4. Technical default unless a strong reason otherwise: a **single self-contained web app**
   (HTML/CSS/JS, no server, no build step required to run) so it opens in a phone browser.
   Frameworks are fine if bundled to a runnable artifact.

## How Rutger plans meals today (the workflow to honor)

The system's core insight (from his architecture doc): recommendations, recipes, and the
grocery list drift apart when each is freeform text. The fix is **one structured source of
truth** (recipes with machine-readable ingredients) and a grocery step that **mechanically
aggregates** from it. The app must preserve this principle.

Four workflows (today implemented as skills):
1. **recipe-capture** — the single gate. Every recipe (pasted, URL, photo, dictated,
   generated) is normalized into a structured format with a machine-readable ingredient
   list (item, qty, unit, aisle, staple flag). Nothing reaches a plan/list without this.
2. **meal-planner** — recommends meals for a period, referencing recipes by `id`. Favors
   liked recipes and realistic cook times; honors preferences; mixes library + new ideas.
   Writes a plan = list of recipe ids + day each is cooked (+ optional servings/meal slot).
3. **grocery-list** — DETERMINISTIC. Reads a plan, loads each recipe's structured
   ingredients, scales by servings, aggregates by item, subtracts pantry staples, rounds
   each up to a purchasable unit (purchase-units.md), groups by aisle, flags big leftovers.
4. **cook-feedback** — after cooking, logs difficulty (1-5), actual vs estimated time,
   liking (1-5), and "what I'd change". Updates rolling `ratings` on the recipe; planner
   reads these next time.

## Rutger's real data (the seed)

Live files live in the parent folder `Meal planning/`:
- `preferences.md` — household & rules (SEE BELOW, critical).
- `pantry.md` — staples assumed on hand, skipped on grocery lists.
- `purchase-units.md` — how each item is sold (package sizes) for rounding.
- `recipes/*.md` — ~28 recipes, each with structured frontmatter (id, title, servings,
   time_minutes, tags, source, calories_per_serving, ingredients[], ratings{}), Steps,
   and a Feedback log. NOTE the "base + finish" pattern: neutral protein BASE recipes
   (e.g. `garlic-ground-beef-base`, `lemon-herb-chicken-base`) cooked in bulk, plus
   `finish-*` recipes that turn a base into a specific dinner.
- `meal-plans/*.md` — plans referencing recipe ids; note the 2-week bulk-prep plan with
   batch-cook day, week1 fresh / week2 freezer, and lunch salads with a `meal: lunch` slot.
- `grocery-lists/*.md` — generated lists ordered by his store walk.
- `recipe pics/*.jpeg` — ~50 cookbook photos = a backlog of recipes to capture over time.

### Key preferences (from preferences.md — honor in the app)
- Cooking for **2** (Rutger + wife). 6 dinners/week (7th not cooked) = 12 dinners/wk.
- Calorie targets: Rutger ~800 cal/dinner, wife ~600 → ~1,400/pair/dinner.
- Dislikes/diet: **cilantro** optional (wife dislikes); **no soups/stews** (curries OK —
  texture issue not spice); **no cut pork** (sausage OK); **no Chinese/other E.Asian
  except Thai**; Western/Mexican/Mediterranean/Indian fine.
- Cooking style **now**: **bulk meal prep ~2 weeks at a time**; favor recipes that scale,
  divide into portions, reheat without going mushy, keep 4-5 days or freeze. (May change.)
- Variety: balanced — mostly favorites, occasional new dish. Periodically suggest a recipe
  from `recipe pics/` to work through the cookbook backlog; harder ones go on time-rich nights.
- Equipment: well-equipped traditional kitchen + air fryer + slow cooker. **No Instant Pot /
  pressure cooker** — avoid recipes needing one.
- **Store-walk grocery order** (Woodman's, Menomonee Falls), list ordered top-to-bottom,
  NO section headers, one flat list: Frozen, Dairy, Refrigerated, Spices/oil, International,
  Canned, Pasta/grains/rice, Condiments, Meat, Produce. Include leftover/qty guidance.
- US units always (lb/oz/cups), never metric.

## Project working folder
`Meal planning/app-build/`
- `CONTEXT.md` (this file)
- `spec/spec.md` — the evolving spec (Phase 1+)
- `logs/change-log.md` — spec-improver's decisions/defenses (Phase 2)
- `logs/feedback-log.md` — evaluator's critiques (Phase 2)
- `logs/planner-review.md` — original planner's sign-off (Phase 3)
- `design/` — UX mockups/assets (Phase 4)
- `app/` — the actual app (Phase 4)
- `logs/test-report.md` — testing results (Phase 5)

## Process (how the agents collaborate)
1. Opus planner writes spec.md.
2. Sonnet spec-improver <-> Sonnet evaluator iterate (logs kept) until they agree;
   genuinely-stuck disagreements escalate to Rutger.
3. Original planner reviews the revised spec; wild disagreement escalates to Rutger.
4. UI/UX designer + engineer build prototype then working app; consult planner on
   questions; unresolvable blockers escalate to Rutger.
5. Testing agents verify; bugs route to engineer/designer; big issues to planner; then
   present to Rutger.
