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

### 1. Date-aware prep & thaw reminders  ·  ✅ _DONE 2026-06-25_
~~Today's "Heads up" is inventory-driven.~~ "Heads up" now also shows
**forward-looking thaw reminders**: for each upcoming, uncooked, from-the-freezer
plan entry whose thaw lead time has arrived, "Move _X_ to the fridge today/tomorrow"
(`thawReminders()` + `thawHoursFor()`, which inherits the lead time from the
finish's base protein). Verified against the real plan: silent in week 1 (fresh),
fires exactly 1 day before each week-2 freezer cook. `prep_ahead` steps surface as a
**🌙 Prep ahead** card on the recipe and inline in the Cook "chosen" state. Schema:
`thaw_hours_ahead` + `prep_ahead` frontmatter (see Phase-2 schema note below).

### 2. Automated feedback → recipes (close the loop)  ·  ✅ _DONE 2026-06-25_
~~Cook feedback currently lands in `feedback-inbox-prod.jsonl` but is **not yet
applied** to the recipe markdown automatically.~~ Built `app/apply-feedback.py`:
folds the prod inbox into each recipe's `## Feedback log` + rolling `ratings:`
frontmatter, archives applied entries to `feedback-applied-{env}.jsonl` and
de-dupes by `id` so re-runs never double-count. `--dry-run` and `--env test`
supported; unmatched recipeIds are left in the inbox. Run after a Sync, before
planning the next week in Claude.

### 3. Recipe thumbnails / imagery  ·  ✅ _DONE 2026-06-25_
~~Images aren't wired.~~ `build_seed.py` now generates small base64 thumbnails with
macOS **`sips`** (no Python deps) for any recipe with an `image:` field and for
every cookbook-backlog photo, bundling them into `seed.json` so they work offline.
Cached by `(path, mtime)` in `.thumb-cache.json` — re-builds drop from ~6.5s to
~0.08s, which matters because `meal-server.py` rebuilds on every sync. Thumbnails
show on recipe cards + detail (letter avatar is the fallback). The heavy thumbnails
are **stripped from the inline bootstrap SEED** (`embed_seed.py`) and arrive on the
first sync, then persist in IndexedDB. _Note:_ recipes have no `image:` assigned yet
(the 52 `IMG_*.jpeg` files aren't mapped to recipes) — the pipeline is live and will
light up as images are assigned at capture.

### 4. Finish the screen-by-screen redesign  ·  ✅ _DONE 2026-06-27_
~~Plan / Recipes / Grocery / More still use card-boxed lists.~~ All four primary
tabs **and** the secondary More sub-screens now render **borderless hairline rows**
flush on the page background under `.ssec` overlines — Cook's exact `.ck-ent`
pattern (removed the `.card` wrappers; flushed `.rc`/`.more-row`/`.day-row`/
`.pick-row`/`.pu-row` to the screen edge). Converted lists: Plan, Recipes, Grocery,
More, Purchase Units, captured-backlog list, the three Plan-builder pick-lists, and
Fridge & Freezer inventory items. **Pantry Staples kept as a chip cloud** (restyled
with `.chip`) — better for short staple names. Control cards (Appearance picker,
forms, Sync/Backup, builder callout/summary, inventory add-form, banners, empty
states) intentionally kept. Verified visually + clean console on every screen. See
DESIGN-SYSTEM.md "Lists are borderless."

### 5. Cookbook backlog activation  ·  ◑ _PARTIAL — DONE 2026-06-25 (display); capture/suggest are Claude-side_
The backlog screen now shows the **photos** as a tappable 3-up thumbnail grid
("＋ Capture" overlay) instead of filenames, plus thumbnails on captured rows. The
remaining pieces are inherently Claude-side, not in-app (the app is keyless/offline):
**capturing** a recipe from a photo runs through the `recipe-capture` skill, and the
**planner periodically suggesting** a backlog recipe belongs in the `meal-planner`
skill. Follow-up: teach those two skills the new `image` field + a "pull from
backlog" nudge.

### 6. Smarter carousel ordering  ·  ✅ _DONE 2026-06-25_
~~Optional polish from the Cook handoff:~~ The Cook meal-slot carousel now orders
cards by **least-recently-cooked** (never-cooked sorts to the front), with the
planned recipe still pinned first. Driven by a new `ckLastCooked(id)` helper that
reads each recipe's `feedbackLog` — so it gets smarter as #2 applies real cooks.

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

### Phase 2 — The metadata unlock  ·  ✅ _DONE 2026-06-25 (in-app); skill-side follow-ups remain_
Did the schema migration once, then built all three. See #1, #3, #5 above.

**Phase-2 schema (schemaVersion 2).** Three additive recipe-frontmatter keys,
parsed by `build_seed.py`, surfaced in the app, and flowed through sync (the merge
spreads `{...inc}`, so existing installs pick them up):
```yaml
thaw_hours_ahead: 12          # freezer→fridge lead time (null = no thaw)
prep_ahead:                   # night-before / day-of steps (list)
  - Salt the roast the night before
image: some-photo.jpg         # filename in "recipe pics/" → bundled thumbnail
```
Recipe object gains: `thawHoursAhead`, `prepAhead[]`, `image`, `sourcePhotoRef`,
`thumbnail` (base64 data-URI or null). Backlog entries gain `thumbnail`.

**Build steps (run on the Mac mini, in order):**
1. `python3 build_seed.py` — parses markdown → `seed.json` (+ generates/caches
   thumbnails). `meal-server.py` already runs this on every sync.
2. `python3 embed_seed.py` — refreshes the inline bootstrap `const SEED` in
   `index.html` (thumbnails stripped to stay lean). Manual/dev step; only needed
   when you want a fresh install to ship newer seed data offline.

**Skill-side follow-ups (not in the app):**
- `recipe-capture`: support the new `image`, `thaw_hours_ahead`, `prep_ahead` keys
  when saving a recipe.
- `meal-planner`: occasionally suggest an un-captured backlog photo so the backlog
  gets cooked through (#5's "periodic suggest").

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
