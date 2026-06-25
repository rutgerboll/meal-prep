# Design brief — Unify the "Cook" screen meal-slot UX

A self-contained brief for designing one consistent interaction for logging meals.
(No prior context needed.)

## Product in one paragraph
A personal, mobile-first meal-planning PWA for one user. He **bulk-preps ~2 weeks**
of food: two neutral protein **bases** (e.g. chicken, beef) are batch-cooked once, then
**"finish" recipes** turn a base into a specific dinner across the week; **week 2 reheats
from the freezer**. He also meal-preps two **lunch salads** for Mon–Thu. Crucially, he
does **not** cook in the planned day order — each day he picks what to actually make
from the planned pool. The app is offline-capable and installed to the home screen.

## The problem to solve
On the **Cook** tab, dinners and lunches use *different* interaction models for the
*same* underlying job, which feels inconsistent:

- **Dinner (each day):** a dropdown `<select>` to pick which planned dinner he made;
  after picking, two text links appear — "View recipe ›" and "Log this cook ›"; a ✓
  shows when chosen; the whole day collapses when complete.
- **Lunch (Mon–Thu):** the two salads render as **check-circle rows** (tap the circle =
  "this is the one I had"; tap the name = view recipe), plus a "None" row; a small
  "log/rate ›" link appears once a salad is chosen.

So "pick the meal → view its recipe → mark it cooked → rate it" looks and behaves
differently depending on whether it's lunch or dinner.

## Goal
Design **one unified "meal slot" interaction** used for both lunch and dinner (and any
future meal type), differing only by the **option pool** and label. Each meal slot must
support, consistently:

1. **Choose** which recipe was made for that slot, from a pool — or "none / didn't cook."
2. **View** that recipe (to cook from it).
3. **Log / rate** it: difficulty (1–5), actual time vs estimate, liking (1–5), "what I'd
   change next time."
4. **Show status** at a glance: not started / chosen / logged.
5. **Collapse** cleanly when the day is done (the plan spans ~12 day-slots — completed
   days must stay compact and scannable).

## The day-by-day model (important to honor)
- The Cook tab is grouped by **Week 1** and **Week 2**, each containing **day rows**.
- Every day has a **Dinner** slot; **Mon–Thu** days also have a **Lunch** slot.
- **Dinner pool** = the distinct planned dinner recipes for the plan (~6).
  **Lunch pool** = the planned salads (usually 2).
- He can make **any pool item on any day** (out of order), so a slot is a *free choice
  from the pool*, not a fixed day assignment. The originally-planned recipe for that day
  may be shown as a faint hint ("planned: Beef Bolognese").
- Choices persist per day. Marking something cooked also (a) auto-decrements linked
  fridge **inventory** and (b) saves a cook-log entry + rating.

## Data available per slot (for realistic mockups)
```
slot = {
  meal: "dinner" | "lunch",
  pool: [ { id, title, tags[], timeMinutes, caloriesPerServing } ],  // ~6 dinners or ~2 salads
  plannedRecipeId,        // optional hint for that day
  choice: recipeId | "none" | null,
  status: "none" | "chosen" | "logged"
}
```
A recipe detail screen exists and is reachable by id. The rating capture today is a
**bottom sheet** with: difficulty stars, a +/- time stepper, liking stars, and a notes
textarea — reuse or redesign as you see fit.

## Constraints
- **Mobile-first**, ~390px wide, one-handed/thumb-friendly, big tap targets (he's often
  cooking with messy hands — fast logging matters).
- Must fit the **locked design system** (below): calm, premium, warm, all-sans, soft
  tonal cards, auto light/dark. Recipe **thumbnails** are optional/where-helpful.
- 12 day-slots across 2 weeks → **completed days collapse** to one line; whole weeks can
  collapse when fully logged.
- Keep steps minimal: choosing should be quick; rating should be optional (you can log
  "made it" without forcing a full rating, but make rating one tap away).

## Design system — "Spiced Linen" (match this)
All sans (system UI). Sentence case. Two weights (400/600). Soft tonal cards (16px
radius, subtle shadow), no glass/translucency. One primary accent + one secondary.

| Token | Light | Dark |
|---|---|---|
| Page bg | #EFE8DD | #1B1916 |
| Card surface | #F8F2E9 | #262320 |
| Raised/alt | #EAE1D3 | #2F2B25 |
| Text primary | #2E2A24 | #ECE6DC |
| Text secondary | #5A5347 | #C3BBAD |
| Text hint | #948A79 | #A49C8E |
| Primary accent (terracotta) | #B05334 | #D08A5E |
| Accent tint | #EFE0D5 | #33291F |
| Secondary (olive) | #6E7356 | #9FA67E |
| Secondary tint / ink | #E6E4D2 / #565C32 | #33372E / #C7CBA6 |
| Border / hairline | #E0D6C6 / #EBE2D4 | #3A352D / #322E27 |
| Tag chip bg / fg | #EAE3D4 / #6A6150 | #322E27 / #BCB3A2 |
| Text on accent | #FFFFFF | #21180F |

Components: primary button = filled terracotta, 18px radius, sentence case. Tags = tonal
chips. Day "done" check = filled terracotta circle with ✓.

## What to produce
1. A **unified meal-slot component** with all states (empty → picking → chosen → logged),
   identical for lunch and dinner (only pool + label change).
2. The **choose** interaction — how he picks from the pool (inline list? bottom sheet?
   segmented control?), the **view-recipe** affordance, and the **log/rate** trigger —
   the same pattern for both meals.
3. How **"none / didn't cook"** is expressed.
4. The **day row** containing one or two slots, in **expanded** and **collapsed** states.
5. Optional: rethink the overall Cook tab (top progress bar, an inventory "thaw ahead"
   heads-up card, Week 1 / Week 2 sections) if it helps coherence.

## Deliverable that lets me implement
Mobile mockups (light + a peek at dark) plus a short **spec of components, states, and
interactions** (which taps open what; sheet vs inline). It'll be built in a vanilla-JS
single-file app against the data model above — so concrete states and behaviors matter
more than pixel polish.
