> # ⚠️ ARCHIVED — superseded 2026-06-27, filed here 2026-08-04 by T0.9
>
> This is the **"Spiced Linen"** system (terracotta/olive, light-first, all-sans). It was
> replaced by **"Sage"** — see `DESIGN-SYSTEM.md`, which is the only authoritative design
> document. Its colour palette (§2) and typography (§3) are **wrong for the current app**;
> the terracotta tokens they describe were deleted from the CSS by T0.8.
>
> Kept because it is the record of a real design decision, and because three parts were
> never restated in Sage and may still be worth reading: the **4px spacing scale** (§4), the
> **iconography** rules (§6), and the **mobile interaction patterns** (§7 — gestures, hit
> areas, sticky CTAs, keyboard behaviour). Treat those as *proposals that were never
> verified against the code*: `--space-*` appears nowhere in `app/styles/`, so §4 in
> particular was never implemented.
>
> Do not build from this document.

# Meal Planning App — Design System

**Version:** 1.0 (Prototype lock)
**Date:** 2026-06-21
**Purpose:** Visual language specification for the mobile-first meal planning app, as it stood at prototype lock. (The original text called this "the source of truth for the engineer and the basis for the `prototype.html`". Both claims are now false: `DESIGN-SYSTEM.md` is authoritative, and no `prototype.html` exists in this repo.)

---

## 1. Design Principles

1. **Warm but fast.** Kitchen energy: earthy, appetizing, but zero fuss. Not a food magazine — a tool Rutger picks up one-handed in the middle of cooking.
2. **Content first.** Recipe titles, ingredient lines, and plan days are the UI. Decoration yields to data.
3. **Thumb-native.** Primary actions bottom-anchored. Nav at the bottom. Nothing critical in the top 100px on a tall phone.
4. **Reliable.** Never truncate an ingredient. Never drop a line item. Visual affordances reinforce that the list is complete.
5. **Accessible.** All text/background pairs meet WCAG-AA (≥ 4.5:1 for body text, ≥ 3:1 for large/bold text and UI components).

---

## 2. Color Palette

### Brand palette

| Name | Hex | Usage |
|---|---|---|
| **Saffron** (primary) | `#D97706` | Primary CTAs, active tab indicator, accents, FAB background. |
| **Saffron Dark** | `#B45309` | Primary button pressed state; hover on desktop. |
| **Saffron Light** | `#FEF3C7` | Chip/tag backgrounds, selected-state highlight, banner background. |
| **Bark** (surface) | `#292524` | Primary app background (dark-mode default). |
| **Stone 900** | `#1C1917` | Bottom-tab bar background. |
| **Stone 800** | `#292524` | Card surface / modal background. |
| **Stone 700** | `#44403C` | Dividers, secondary card surface. |
| **Stone 600** | `#57534E` | Disabled text / placeholder text. |
| **Stone 400** | `#A8A29E` | Secondary/tertiary text, icons (inactive). |
| **Stone 200** | `#E7E5E3` | Body text on dark surfaces. |
| **White** | `#FFFFFF` | High-emphasis text, icon fill on primary, list item text. |

### Semantic palette

| Purpose | Token | Resolved value |
|---|---|---|
| Background (app) | `--bg-app` | `#1C1917` (Stone 900) |
| Background (card) | `--bg-card` | `#292524` (Stone 800) |
| Background (card-alt) | `--bg-card-alt` | `#3C3836` |
| Background (input) | `--bg-input` | `#44403C` |
| Text (primary) | `--text-primary` | `#FFFFFF` |
| Text (secondary) | `--text-secondary` | `#D6D3D1` |
| Text (tertiary) | `--text-tertiary` | `#A8A29E` |
| Text (on-primary) | `--text-on-primary` | `#1C1917` |
| Border | `--border` | `#57534E` |
| Border (subtle) | `--border-subtle` | `#3C3836` |
| Primary | `--primary` | `#D97706` |
| Primary dark | `--primary-dark` | `#B45309` |
| Primary light | `--primary-light` | `#FEF3C7` |
| Success | `--success` | `#4ADE80` |
| Warning | `--warning` | `#FB923C` |
| Danger | `--danger` | `#F87171` |
| Info | `--info` | `#60A5FA` |

### Tag/chip color map (cuisine / type chips)

| Tag | Background | Text |
|---|---|---|
| chicken | `#78350F` bg, `#FDE68A` text | warm amber |
| beef | `#7C2D12` bg, `#FDBA74` text | orange |
| turkey | `#713F12` bg, `#FDE68A` text | amber |
| base | `#1E3A5F` bg, `#93C5FD` text | blue |
| finish | `#14532D` bg, `#86EFAC` text | green |
| italian | `#6B2D32` bg, `#FCA5A5` text | rose |
| tex-mex | `#7C2D12` bg, `#FDBA74` text | orange |
| greek / mediterranean | `#1E3A5F` bg, `#93C5FD` text | blue |
| thai | `#14532D` bg, `#86EFAC` text | green |
| indian | `#78350F` bg, `#FDE68A` text | amber |
| lunch / salad | `#1A3A4A` bg, `#67E8F9` text | cyan |
| batch-friendly | `#4A1D96` bg, `#C4B5FD` text | violet |
| freezes-well | `#0C4A6E` bg, `#7DD3FC` text | sky |

### WCAG-AA checks

- White (`#FFF`) on Stone 800 (`#292524`): contrast ≈ 13.7:1 — pass.
- Stone 200 (`#E7E5E3`) on Stone 900 (`#1C1917`): contrast ≈ 12.1:1 — pass.
- Stone 400 (`#A8A29E`) on Stone 900 (`#1C1917`): contrast ≈ 5.9:1 — pass (AA for body text).
- Saffron (`#D97706`) on Stone 900 (`#1C1917`): contrast ≈ 4.6:1 — pass (AA for large text; borderline body — use only for large/bold text or UI components at this ratio).
- Text-on-primary (`#1C1917`) on Saffron (`#D97706`): contrast ≈ 4.6:1 — pass (AA).
- White on Saffron (`#D97706`): contrast ≈ 2.9:1 — fail; use `--text-on-primary` (dark) on saffron buttons, not white text.

---

## 3. Typography Scale

System font stack: `system-ui, -apple-system, "Segoe UI", sans-serif`. No external fonts — keeps the app fully offline and fast.

| Role | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| `display` | 24px / 1.5rem | 700 | 1.2 | Screen titles (Plan header, section names). |
| `title-lg` | 20px / 1.25rem | 700 | 1.3 | Recipe titles in detail view, modal headers. |
| `title-md` | 17px / 1.0625rem | 600 | 1.35 | Card titles, list item primary text. |
| `title-sm` | 15px / 0.9375rem | 600 | 1.4 | Tab labels, section headers, button text. |
| `body` | 15px / 0.9375rem | 400 | 1.5 | Default body text, ingredient lines, step text. |
| `body-sm` | 13px / 0.8125rem | 400 | 1.45 | Secondary meta (time, servings, source), leftover notes. |
| `label` | 12px / 0.75rem | 500 | 1.3 | Chip/tag text, form labels, category badges. |
| `micro` | 11px / 0.6875rem | 500 | 1.2 | Progress sub-labels, timestamp. |

> Min body text on-screen: 13px (`body-sm`). Nothing smaller in interactive or critical-path content.

---

## 4. Spacing Scale

Base unit: 4px.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Intra-chip gap, icon-to-label gap. |
| `--space-2` | 8px | Tight padding (chip, badge). |
| `--space-3` | 12px | Card inner padding (tight). |
| `--space-4` | 16px | Standard card padding, list item padding. |
| `--space-5` | 20px | Section gap, form field gap. |
| `--space-6` | 24px | Section heading margin. |
| `--space-8` | 32px | Between major card groups. |
| `--space-12` | 48px | Bottom safe-area buffer above tab bar. |

Page horizontal padding: 16px (`--space-4`) on both sides.

---

## 5. Components

### 5.1 Bottom Tab Bar

- Height: 64px + device safe-area inset (iOS home bar).
- Background: Stone 900 (`#1C1917`), top 1px border `--border-subtle`.
- 5 tabs: Plan · Recipes · List · Cook · More.
- Each tab: icon (24×24) + label (`label` scale, 11px).
- Active tab: Saffron icon + Saffron text.
- Inactive: Stone 400 icon + Stone 600 text.
- Active indicator: 2px Saffron underline above icon (not a full pill — cleaner in a 5-tab bar).
- Tap target: full column width × 64px.

### 5.2 Cards

**Standard card**
- Background: `--bg-card` (`#292524`).
- Border-radius: 12px.
- Padding: 16px.
- Shadow: `0 1px 3px rgba(0,0,0,0.4)`.
- Dividers between stacked cards: 8px gap (not a line).

**Recipe card (library list)**
- Left: a 56×56 color swatch (cuisine color) containing first letter of recipe title.
- Right: title (`title-md`), tags row (chips), meta row (time + cal + liked stars).
- BASE / FINISH badge: top-right corner.
- Height: ~80px. Tap target: full width.

**Batch-cook card (Plan tab)**
- Larger card with amber left-border accent (4px).
- Two-line protein listing + "freeze half" reminder sub-text.
- Background: slightly lighter `--bg-card-alt`.

**Day row (plan week view)**
- Full-width, 56px height.
- Left: day label (`body-sm`, tertiary) — tight col, ~56px wide.
- Center: recipe title (`title-md`) + cuisine chip.
- Right: finish time, cooked checkmark.
- Swipe-left on a row → reveals "Mark cooked" action (amber, 72px wide).
- Long-press → bottom sheet with "Swap", "Remove", "View recipe".

### 5.3 Buttons

**Primary (full-width sticky)**
- Background: Saffron `#D97706`.
- Text: `#1C1917`, `title-sm` weight 600, uppercase tracking 0.05em.
- Height: 52px, border-radius: 26px (pill).
- Pressed: Saffron Dark `#B45309`.
- Position: `position: sticky; bottom: calc(16px + safe-area-inset-bottom)` on screens that need a persistent CTA (List, Plan, Recipe capture).

**Secondary (outline)**
- Border: 1.5px `--primary`. Text: `--primary`. Background: transparent.
- Height: 44px, border-radius: 22px.
- Pressed: `--primary-light` background, opacity 0.15.

**Destructive**
- Background: `--danger` (`#F87171`). Text: `#1C1917`.

**Icon button (FAB)**
- Circular, 56px diameter.
- Background: Saffron.
- Icon: 24px, `#1C1917`.
- Shadow: `0 4px 12px rgba(0,0,0,0.5)`.
- Position: fixed bottom-right, 16px from edge, 80px above tab bar.

**Text button / link**
- Text: Saffron `#D97706`, `body` weight 400.
- No background. Min height 44px.

### 5.4 Chips / Tags

- Height: 24px. Padding: 4px 8px. Border-radius: 12px.
- Font: `label` (12px, weight 500).
- Colors: per cuisine/type map in §2.
- Non-colored (generic) chip: `--bg-input` bg, `--text-secondary` text.
- Selected chip (filter): Saffron bg, `--text-on-primary`.
- Stacked chips in a row: 4px gap, allow horizontal scroll if they overflow.

### 5.5 List Rows (Grocery List)

- Height: auto, min 48px. Padding: 12px 0.
- Left: custom checkbox (24×24, unchecked: `--border` ring; checked: Saffron fill + white checkmark).
- Text: `body` (15px) for item name, `body-sm` (13px) for leftover note in tertiary color.
- Checked state: item name gets `text-decoration: line-through`, opacity 0.4, transitions 200ms.
- Checked items optionally "sink" to bottom (toggleable by user).
- Divider: 1px `--border-subtle` between rows.

### 5.6 Bottom Sheets / Modals

- Backdrop: `rgba(0,0,0,0.65)`, blur-none (performance).
- Sheet background: `--bg-card` (`#292524`), top border-radius 20px.
- Handle bar: 4×36px, `--border`, centered, 8px from top.
- Max height: 85vh; scrollable content inside.
- Header: 20px top padding, title `title-lg`, close X (44×44 tap target) top-right.
- Appears/dismisses with 300ms ease-out translate-Y animation.
- Dismiss: tap backdrop, swipe down, or explicit close.
- **Used for:** recipe picker in Plan Builder, cookbook capture, long-press context, ingredient detail.

### 5.7 Banners

**Rule-check warning banner**
- Background: `#7C2D12` (dark orange-red). Text: `#FED7AA`.
- Left: ⚠ icon (20px).
- Body: warning text (`body-sm`).
- Right: "Dismiss" text button (Saffron, 44px tap target).
- Sits just below the plan header, above first card.

**Informational banner**
- Background: `#1E3A5F`. Text: `#BFDBFE`.
- Same layout.

**"Freeze half" reminder chip** (inside batch-cook card)
- Snowflake icon + "Freeze half immediately" text. Background: `#0C4A6E`, text: `#BAE6FD`. Border-radius: 8px. 8px padding.

### 5.8 Steppers (Cook Feedback)

**Star rating (Liking / Difficulty)**
- 5 × 32px star icons, horizontal row. Saffron filled / Stone 600 empty.
- Tapping a star selects 1–N (standard pattern).
- Label below row: e.g. "Liked it" / "Really difficult".

**Numeric input (Actual time)**
- `-` button · number display · `+` button; each button 44×44.
- Number in `title-lg` centered between buttons.
- Or: a plain numeric keyboard input field (simpler for the prototype).

### 5.9 Form Fields

- Label: `label` (12px) above, `--text-tertiary`.
- Input background: `--bg-input` (`#44403C`).
- Border: 1px `--border`. Border-radius: 8px.
- Height: 48px (text input), 44px (select).
- Focus: 2px Saffron border-ring (`outline: 2px solid #D97706`, `outline-offset: 1px`).
- Placeholder: `--text-tertiary`.
- Error state: `--danger` border + error text below field (`body-sm`).

**Ingredient row (capture form)**
- 4 cells in a row: `item` (flex-grow 2, autocomplete), `qty` (60px), `unit` (80px select), `aisle` (80px select).
- Staple toggle: small pill at row end.
- Drag handle (left): `≡` icon, `--text-tertiary`. Supports reorder.
- Remove: red `×` (44×44) right-edge, requires row to be swiped left or long-pressed to reveal (avoid accidental delete).

### 5.10 Empty States

Centered vertically in content area. Structure:

1. Icon illustration (64×64 emoji-style or SVG).
2. Title: `title-md`, `--text-secondary`.
3. Sub-text: `body-sm`, `--text-tertiary`.
4. CTA button: Primary style.

| Screen | Icon | Title | CTA |
|---|---|---|---|
| Plan (no active) | 📅 | "No active plan" | "Create a plan" |
| Grocery list (not generated) | 🛒 | "No list yet" | "Generate grocery list" |
| Recipes (empty) | 📖 | "No recipes yet" | "+ Capture recipe" |
| Cook log (none) | 🍳 | "No cooks logged yet" | "Log a cook" |

### 5.11 Progress Indicators

**Inline progress (grocery list)**
- `"12 / 41 checked"` — `body-sm`, `--text-tertiary`.
- Thin progress bar: 4px tall, Saffron fill on `--border` track, border-radius: 2px. Sits below the header.

**Plan completeness**
- `"11 / 24 dinners planned"` — same treatment.

### 5.12 Calorie Roll-up Row

- Per-dinner row: `[day] [recipe title pair] [XXX + XXX = 1,660 cal/pair]`
- Cal number: `title-sm`, Saffron if within band, `--warning` if outside [1,200–1,800].
- Target reminder: `"Target ~1,400/pair"` — `micro`, tertiary.

---

## 6. Iconography

**Approach:** Use Unicode emoji and simple SVG inline icons — no external icon font required (offline-safe). Where precision matters (tab bar), use simple hand-drawn SVG paths. Fallback to emoji for empty states and banners.

| Location | Icon style |
|---|---|
| Tab bar | SVG path icons, 24×24, stroke-based, 1.5px stroke |
| Tags/chips | none (text only) |
| Empty states | Single large emoji (64px) |
| Banners | Unicode symbol (⚠, ❄, ✓, ℹ) at 20px |
| Buttons | Leading icon optional (SVG), 18×18 |
| Checkboxes | SVG check inside circle |
| Stars | Unicode ★ / ☆ or SVG |

**Tab icons:**
- Plan: calendar grid (4-cell grid outline)
- Recipes: open book
- List: checklist (3 lines + check)
- Cook: chef's hat
- More: horizontal three-dot / ellipsis

---

## 7. Mobile Interaction Patterns

### Navigation
- **Bottom tab bar** (5 tabs): primary navigation. No hamburger menu, no drawer.
- **In-screen nav:** push-style (detail from list). "Back" is top-left `‹` chevron (44×44 tap target) + screen title.
- **Modal screens** (Recipe Capture, Plan Builder steps, Cook feedback form): full-screen sheet, draggable dismiss (swipe down).

### Tap targets
- Minimum 44×44pt (iOS HIG + WCAG). All checkboxes, buttons, nav items, row taps meet this.
- Icon-only buttons always have a 44×44 invisible hit area even if the visible icon is 24px.

### Gestures
- **Swipe-left on a plan day row:** reveal "Mark cooked" (green check, 72px), "Remove" (red, 72px).
- **Swipe-left on a grocery row:** reveal "Uncheck" / "Delete from list".
- **Swipe down on a bottom sheet:** dismiss.
- **Long-press on a day row:** context bottom sheet (Swap, View, Remove).
- **Long-press on a grocery item:** "Add to pantry" / "Set package size".
- Gestures are never the *only* path — every action is also accessible via a visible button/menu.

### Sticky CTAs
Screens with a primary out-of-flow action (List → "Copy list", Plan Builder → "Save plan", Capture → "Save recipe") use a sticky bottom button:
- `position: sticky; bottom: calc(16px + env(safe-area-inset-bottom))`.
- Sits 80px above tab bar (or behind it if the tab bar is full-width sticky).
- Content scrolls under it; a 48px fade gradient above the button prevents content hard-clipping.

### Keyboard / form
- Numeric inputs (`qty`, `time`, `servings`) trigger `inputmode="decimal"` or `"numeric"` — shows number keyboard on iOS/Android.
- Form scrolls up on focus so the focused field is never occluded by the keyboard. (`scroll-padding-bottom: 300px` on the scroll container handles this in most browsers.)

### Pull to refresh
- Not implemented in prototype. Engineer: add on Plan tab and List tab once live data is in.

### Bottom sheet recipe picker
- Large searchable list displayed as a bottom sheet (85vh).
- Search field sticky at top of sheet.
- Recipe rows: 64px height, title + tags + time/cal meta.
- Tap row → selects recipe, sheet dismisses.

---

## 8. Design Rationale

**Why dark-mode only?**
Rutger uses the app in the kitchen (often dim lighting) and in the store aisle. Dark backgrounds reduce eye strain under mixed lighting and feel intentional rather than an afterthought. A light mode is a future enhancement.

**Why Saffron as the primary color?**
Saffron/amber sits squarely in the "warm, food, kitchen" semantic space without being clichéd tomato-red. It pops against dark stone surfaces, has high contrast against dark text, and avoids the blue-tinted cold palette most utility apps use.

**Why no section headers on the grocery list?**
Rutger explicitly wants a flat list with no section dividers — his store-walk order already gives him the grouping. Adding headers creates visual noise and slows scanning during shop.

**Why bottom tabs over a hamburger/drawer?**
5 tabs is at the upper boundary of bottom-tab comfort (4 is ideal, 5 is acceptable). With these 5 — Plan, Recipes, List, Cook, More — there is no ambiguity about where things live. A drawer would hide navigation behind an extra tap and make the app feel heavier.

**Type scale compression**
14 steps looks like a lot but the actual in-use sizes are 11/12/13/15/17/20/24 — seven levels, each distinct enough to read as a clear hierarchy on a 390px-wide phone screen.

---

*End of design system.*
