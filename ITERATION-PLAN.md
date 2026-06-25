# Iteration Plan — Meal Planning App v2

Owner: PM (Claude). Based on Rutger's feedback after v1.

## Product reframe
**Planning is conversational; execution is the app.** Claude (via skills) generates recipes
and plans into the markdown library. The app is where Rutger reads recipes, shops, and logs
cooks — plus a lightweight in-app planner for assembling plans from the existing library.

## Decisions (locked by Rutger)
1. **Theme:** Build BOTH sage-green and ocean-blue, with a toggle in More → Settings.
2. **Phone access + persistence:** Ship as an installable **PWA** (manifest + service worker +
   icons), served from a private URL, "Add to Home Screen." Durable storage + Export backup.
   NOTE: actual hosting/publish step is handed to Rutger (Claude can't create host accounts).
3. **Planning bridge:** Lightweight **in-app planner** (assemble plans from the library) is the
   primary in-app path, PLUS a simple **"Import from Claude" paste box** so conversationally
   generated recipes/plans can merge into the library (pending Rutger confirm; he can skip import).

## Feedback → fixes
| Feedback | Fix |
|---|---|
| Can't generate plan in-app; rely on Claude for recipes | In-app planner over existing library + import bridge for Claude-generated recipes |
| Dislikes dark saffron theme | Sage + Ocean light themes, toggle in settings |
| Grocery list should be copy/paste ready for Notes | Prominent bottom-anchored "Copy for Notes" → clean flat plain-text list |
| Worried storage gets wiped on tab close | It doesn't; real risk is iOS 7-day eviction → PWA install + persistent-storage request + Export backup |
| Can't find bulk base recipes | "Bases" filter + pinned "Bulk bases" section atop Recipes |
| "Make grocery list" floats too high | Bottom-anchored sticky action bar (thumb reach) |
| Must be easy on phone (key req) | PWA install = home-screen icon, full-screen, offline |

## Sequenced delivery
**Iteration 1 (visible redesign + phone-ready):** theming (both + toggle), bottom action bars,
copy-ready grocery, surface bases, PWA (installable, offline, durable storage), Export backup.
**Iteration 2 (planning):** in-app planner enhancements + import-from-Claude bridge.
**Iteration 3:** re-test (logic + UI + install/persistence), then deploy handoff to Rutger.

## Out of scope (still deferred)
Live two-way file sync between the markdown library and the app.
