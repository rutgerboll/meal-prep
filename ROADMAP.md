# Meal Planner — Roadmap & Build Briefing

_Last updated: 2026-06-25. Companion docs: `spec/spec.md` (original spec),
`DESIGN-SYSTEM.md` (current "Sage" system), `SYNC-SETUP.md` (Mac mini sync),
`COOK-UX-BRIEF.md` (Cook redesign brief)._

---

## Guiding principles (the reasoning behind the app)

- **One structured source of truth.** Recipes carry machine-readable ingredients;
  the grocery list is a *deterministic mechanical sum* over them, never re-written
  from prose. This is the core fix for "ingredients drop off the list."
- **Planning is conversational; execution is the app.** Meal/recipe generation
  happens in Claude (where the meal-planning skills live); the app is where you
  read recipes, shop, cook, and log. They're connected by a one-way sync, not by
  rebuilding planning inside the app.
- **Keyless & private.** No API key lives in the app. The app talks only to your
  own Mac mini over your private Tailscale network. Nothing to steal.
- **Mobile-first, offline-first.** Installable PWA; everything works offline
  except the moment of sync. Durable on-device storage.
- **Bulk-prep reality.** Two protein bases batch-cooked → "finish" recipes across
  the week; week 2 from the freezer; meal-prep lunch salads. The whole UX honors
  that you cook out of order from a fixed pool of bought ingredients.

---

## Part 1 — What's built (briefing)

### Core app
- Self-contained single-file web app (`app/index.html`), IndexedDB storage,
  **seeded from your real markdown library** (28 recipes, the 2-week plan, pantry,
  purchase units, cookbook backlog). Built and verified through a spec → review →
  build → test agent chain.
- Tabs: **Plan · Recipes · List · Cook · More**. Opens to **Cook** (most-used).

### Design system — current: "Sage"
- Journey: dark saffron → sage/ocean light toggle → "Spiced Linen" (terracotta +
  olive, all-sans, light-auto) → **Sage** (green accent, **dark-first**, Schibsted
  Grotesk headings, flat hairline surfaces) from the Claude Design handoff.
- Documented in `DESIGN-SYSTEM.md`. Light/Dark/Auto toggle; defaults dark.
- _Reasoning:_ explored many directions; landed on a calm, flat, premium look. Cook
  screen sets the visual standard; other screens aligned typographically.

### Plan tab
- Simplified to **planning only**: lists the plan's bases, dinners, and salads
  (with time/calories/servings), tappable into each recipe, plus **Make grocery
  list**. No day-by-day assignment (you don't cook in order).
- **Smart in-app planner / "Suggest a plan":** auto-builds a balanced 2-week
  bulk-prep plan — picks bases whose finishes span the most cuisines, spreads
  cuisines so no two same-cuisine nights are adjacent, favors liked recipes,
  mirrors week 2 from the freezer, adds two lunch salads (now across both weeks).
  Manual builder has cuisine-aware "auto-fill" and repeat warnings.

### Cook tab (redesigned via Claude Design — "unified meal slot")
- Every meal (lunch **and** dinner) uses **one** component: a swipeable carousel
  of recipe cards (planned recipe first) + a "Didn't cook" card → **chosen**
  (View recipe · Rate it · Change) → **logged** (rating line · Edit log · Change).
- Shared bottom-sheet rating (liking, difficulty, time stepper, notes; "Skip —
  just mark it made"). Lunch row renders above dinner.
- **Portion-aware availability:** a recipe's capacity = times it's planned (=
  portions bought); once claimed on that many days it shows "used up" and can't be
  picked elsewhere.
- Day rows collapse when fully logged; weeks collapse when done; today is marked.
- Inventory **"Heads up — thaw ahead"** card surfaces low-fridge items.

### Grocery (List tab)
- **Deterministic** generation: sums structured ingredients, scales servings,
  subtracts pantry staples, rounds up to purchasable units, store-walk ordered,
  flags big leftovers, surfaces items missing a package size.
- **Per-week perishable split:** "Buy now" (all shelf-stable + week-1 fresh) +
  "Buy for week 2 (around …)" etc. — fresh produce split by the week it's used so
  it doesn't wilt; generalizes to 3–4 week plans. Per-list check-offs + "Copy for
  Notes" (clean flat text for your Notes app).

### Inventory (More → Fridge & Freezer)
- Track **anything** with fridge/freezer counts; optional link to a recipe/base;
  "move freezer → fridge". **Auto-decrements** the linked item's fridge when you
  log a cook (manual override always available). Drives the Cook "Heads up."

### Sync & data flow (keyless)
- `meal-server.py` runs on the Mac mini: serves the app **and** a live `sync.json`
  rebuilt from your markdown library on each request (newest plan marked active).
- App **pulls** on launch / on "Sync"; merge **preserves** your cook logs, recipe
  ratings, grocery check-offs, lunch/dinner choices, and theme.
- **Feedback → Claude:** on sync the app **pushes** cook ratings to the mini's
  `/feedback` endpoint into `feedback-inbox-{test,prod}.jsonl`, gated by a
  **Test/Production** toggle so junk data never touches real recipes.
- Exposed over HTTPS via **Tailscale** (private). Setup in `SYNC-SETUP.md`.

### PWA / platform
- Installable (manifest, service worker, icons), offline app shell, durable
  storage request, **Backup & Export** (JSON). Fixed the standalone nav-bar
  safe-area clipping bug. Sage app icon.

---

## Part 2 — Roadmap (discussed, not yet built)

Ordered roughly by value / how much we leaned into it.

### 1. Date-aware prep & thaw reminders  ·  _medium · needs recipe metadata_
Today's "Heads up" is inventory-driven (low fridge + freezer available). We
discussed smarter, **forward-looking** reminders tied to *what's coming up*:
- "Move tomorrow's chicken from freezer to fridge."
- "Salt the roast the night before" (and other prep-ahead steps).
Needs: per-recipe metadata (`thawHoursAhead`, `prepAhead` notes) added at capture,
and a notion of "today vs upcoming." This is the natural next feature.

### 2. Automated feedback → recipes (close the loop)  ·  _small–medium_
Cook feedback currently lands in `feedback-inbox-prod.jsonl` but is **not yet
applied** to the recipe markdown automatically. Build an `apply-feedback.py` (or a
skill step) that folds the prod inbox into each recipe's feedback log + rolling
ratings so the planner learns from real cooks.

### 3. Recipe thumbnails / imagery  ·  _medium · storage + pipeline_
Chosen direction was "thumbnails where helpful," but images aren't wired. Needs an
image pipeline (store/reference photos, e.g., from `recipe pics/`) and thumbnail
slots on recipe cards/detail. Cookbook backlog currently shows filenames only.

### 4. Finish the screen-by-screen redesign  ·  _medium_
Plan / Recipes / Grocery / More are aligned **typographically** with Cook, but
still use card-boxed lists rather than Cook's **borderless hairline-entry** layout.
Convert each screen to that exact pattern for full visual consistency.

### 5. Cookbook backlog activation  ·  _medium_
From the original spec (v1.1): show the backlog **photos**, capture a recipe from a
photo (OCR/transcription), and have the planner periodically suggest one from the
backlog so it gets cooked through. Today capture is manual and photos aren't shown.

### 6. Smarter carousel ordering  ·  _small_
Optional polish from the Cook handoff: after the planned recipe, order carousel
cards by **least-recently-cooked** so the best bets surface first.

### 7. Multi-week planning in-app  ·  _small–medium_
The grocery split already handles 3–4 week plans, but the in-app suggester/builder
only makes 2-week plans. Allow building longer plans in-app (or rely on Claude to
generate them and sync in).

### 8. Live two-way file sync  ·  _large · explicitly deferred_
The long-deferred "real" sync: app changes flow **back** to the markdown library
automatically (beyond the feedback inbox), so the app and files stay fully in step
in both directions. Today sync is one-way pull + a feedback push.

### 9. Phone push notifications  ·  _small but iOS-limited_
We chose in-app "Heads up" over notifications. Real push for thaw/prep reminders is
possible but constrained on iOS (needs the installed PWA + permission); revisit if
the in-app reminders aren't enough.

---

## Part 3 — Build sequence (dependency-aware)

Part 2 is ordered by _value_. This is ordered by _what unblocks what_. The key
observation: **#1, #3, and #5 all depend on richer recipe metadata captured at
recipe-capture time** (thaw hours, prep-ahead notes, image refs). Touch the
capture schema + IndexedDB/sync format **once** and add all three fields together
to avoid three separate data migrations.

### Phase 1 — Close the learning loop  ·  _cheap, high leverage, no schema change_
- **#2 Automated feedback → recipes** first. `apply-feedback.py` folds the prod
  inbox into each recipe's feedback log + rolling ratings. No app changes; makes
  everything downstream smarter. The planner doesn't actually learn until this
  exists.
- **#6 Smarter carousel ordering** next — small, self-contained, and _consumes_
  the data #2 produces. Natural pairing.

### Phase 2 — The metadata unlock  ·  _do the schema migration once_
- **#1 Date-aware prep & thaw reminders** — the marquee feature. Define the
  **full** metadata schema here (`thawHoursAhead`, `prepAhead`, **and** an image
  slot for #3) even though only reminders get wired up now.
- **#3 Thumbnails** — image field already exists from #1; build the pipeline + UI
  slots.
- **#5 Cookbook backlog activation** — reuses the same image/capture work; OCR is
  the only net-new piece.

### Phase 3 — Polish & scale  ·  _lower urgency, slot in anytime_
- **#4 Screen-by-screen redesign** — purely visual; good background work.
- **#7 Multi-week in-app planning** — grocery split already handles it.
- **#9 Push notifications** — revisit only if in-app "Heads up" proves insufficient.
- **#8 Live two-way sync** — large, deferred; only after the above is stable.

**Start with #2.** Cheapest item that makes the whole system better, no migration,
and #6 builds on it immediately — a visible "the app learns from my cooking" win
before the harder metadata work.

---

## Considered and set aside

- **In-app conversational planning via your own API key** — built, then **removed**
  for security; replaced by the keyless Claude-desktop + Mac-mini sync bridge. A
  serverless-proxy version remains possible but wasn't pursued.
- **"Recent cooks" list on the Cook tab** — dropped in the Sage redesign; you
  confirmed it isn't needed.
- **Hosted PWA / serverless proxy hosting** — discussed as alternatives to the Mac
  mini; the mini + Tailscale route was chosen instead.
