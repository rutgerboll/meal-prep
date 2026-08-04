# Meal Planner — Design System (v3: "Sage")

Current system, from the Claude Design handoff. Supersedes the earlier "Spiced
Linen" (terracotta) system. Build all new screens from these tokens.

## Principles
- **Dark-first**, flat, hairline. Light is a token swap (`html[data-theme]`).
  App defaults to dark; Light/Dark/Auto toggle in More → Appearance.
- **One accent — sage green.** Use it only for what is chosen, active, or
  actionable. `#9CC39C` (dark) / `#4C7C5A` (light).
- **Flat, never glass.** Solid tonal surfaces, 1px hairline borders, no shadows,
  no backdrop-filter.
- **Type:** Schibsted Grotesk for headings (`--font-head`, loaded from Google
  Fonts, falls back to system sans offline); system sans for body/UI. Weights
  600 headings / 400–500 body. Sentence case.
- **Scale:** screen title 30 · section 20 · item 18 · body 15 · meta 12.5 ·
  overline 10.5 uppercase. Tap targets ≥ 44px.

## Tokens (CSS variables; names mirror the app so every screen re-themes)
| Token | Dark (primary) | Light |
|---|---|---|
| `--bg-app` | #0F1114 | #F3F4F1 |
| `--bg-card` | #171A20 | #FFFFFF |
| `--bg-alt` / `--bg-in` | #212630 | #EBEDE8 |
| `--text` | #F1F3F6 | #191C20 |
| `--text2` | #A4ADBA | #586069 |
| `--text3` | #69727E | #888F98 |
| `--pr` (accent) | #9CC39C | #4C7C5A |
| `--prd` | #8AB58A | #3E6A4B |
| `--prl` (accent tint) | #18231A | #E4EFE6 |
| `--secondary` | #86A98F | #5C7A63 |
| `--secondary-tint` / `-ink` | #1F2A22 / #A9C9B0 | #E6EFE7 / #3C5A43 |
| `--bdr` / `--bdrs` | #2A2F39 / #20242C | #DFE2DC / #ECEEE9 |
| `--chip-bg` / `--chip-fg` | #212630 / #A4ADBA | #EBEDE8 / #586069 |
| `--textop` (on accent) | #0E1A12 | #FFFFFF |
| `--font-head` | 'Schibsted Grotesk', system-ui, sans-serif | (same) |

Source of truth for tokens: **`app/styles/01-tokens.css`**, where each token is declared
exactly once (T0.7 extracted the CSS out of `index.html`; T0.8 deleted the superseded set that
used to shadow it). Component CSS: `app/styles/02-base.css` and `03-sage.css`.
Cook-screen behaviour spec: handoff `SPEC.md`.

## Cook screen — unified meal slot
Every meal (lunch or dinner) uses ONE component: an edge-bleeding **carousel** of
recipe cards (planned recipe first, then the rest) + a "Didn't cook" card →
**chosen** (View recipe · Rate it · Change) → **logged** (★ line · Edit log ·
Change). One shared bottom-sheet rating (liking, difficulty, time stepper, notes,
"Skip — just mark it made"). Days collapse when fully logged; weeks collapse when
done; today is marked and never auto-collapses. New persisted fields:
`plan.dinnerLogged` / `plan.lunchLogged` (additive).

## Component conventions
- **Lists are borderless.** List screens (Plan, Recipes, Grocery, More) render rows
  as flush hairline entries (`padding: ~14px 0; border-bottom: 1px var(--bdr)`)
  directly on `--bg-app` under `.ssec` uppercase overlines — the same pattern as the
  Cook screen's day entries (`.ck-ent`). **No card box around a list.** Reserve
  `.card` for callouts, control panels (e.g. the Appearance theme picker), forms,
  empty states, and the recipe-detail content blocks.
- Card: `--bg-card`, 1px `--bdr`, 16px radius, no shadow.
- Primary button: filled `--pr`, `--textop` text, 13px radius.
- Tags: tonal `--chip-bg` / `--chip-fg`. Heading text uses `--font-head`.
- Recipe thumbnails: optional/where-helpful (not bundled yet).

## Superseded
"Spiced Linen" (terracotta/olive, light-first, all-sans) — replaced by Sage.
Old pre-Sage Cook code (dropdown day-slots, `renderDaySlot`, `chooseDinner/Lunch`,
etc.) has been removed. The recipe-detail "Log a Cook" still uses the original
`startCookLog`/`renderCookModal` bottom sheet for free (non-slot) logging.

**This file is the only authoritative design document.** The Spiced Linen spec is archived at
`docs/archive/design-system-v1-spiced-linen.md`; until 2026-08-04 it also called itself the
source of truth, which is why "is this app's UI current?" had two answers. Its colours and type
are wrong for this app. Three parts of it were never restated here and may still be worth
reading — the 4px **spacing scale**, **iconography**, and **mobile interaction patterns**
(gestures, hit areas, sticky CTAs, keyboard) — but they are *unverified proposals*, not a record
of the code: `--space-*` appears nowhere in `app/styles/`. Promote anything from there into this
file only after checking it against the app.
