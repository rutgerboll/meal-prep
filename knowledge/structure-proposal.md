# Proposed file structure — a proposal, not a settled truth

Written by T0.1 (2026-08-04) in response to a direct user question, from measurements taken
while verifying the contract. **Nothing here has been implemented.** T0.6 owns the decision;
this exists so T0.6 does not re-derive the evidence. Cited from `program/tasks/T0.6.md`.

## The components, and where they actually live

There are eight, and only four of them are in this repo. That is the first thing a structure
has to respect: **half this system is not here, and two of those halves are not writable.**

| # | component | lives | writable by a session |
|---|---|---|---|
| A | PWA client — shell, CSS, 16 JS modules, service worker, icons | `app/` | yes |
| B | Seed pipeline — `build_seed.py`, `embed_seed.py` | `app/` | yes |
| C | Runtime — `meal-server.py`, `apply-feedback.py`, `deploy.sh`, launchd plist | `app/` + `~/Library/LaunchAgents` | yes / partly |
| D | Generated artifacts — `seed.json`, `.thumb-cache.json`, the inline `SEED` | `app/` | **server-owned** |
| E | Specs & docs — 7 root `*.md`, `spec/`, `design/`, `logs/` | repo root | yes |
| F | Program & knowledge | `program/`, `knowledge/` | yes (kit-owned format) |
| G | Recipe library — `recipes/`, `meal-plans/`, `pantry.md`, … | **parent dir, outside repo** | the user's, effectively read-only |
| H | Claude skills — 5 `SKILL.md` | **extracted plugin cache, outside repo** | **no** |

A, B, C and D are all flat inside `app/`. That single directory holds a browser client, a
build tool, a web server, a deploy script and ~2 MB of generated data. Everything below
follows from that.

## What's actually wrong — with receipts

### 1. CSS has no home, and ships two conflicting token sets

`app/index.html` is 154,642 bytes. Of that, 129,150 is the generated inline `const SEED`, and
of the remaining 25,492 bytes **23,531 — 92% — is CSS in three inline `<style>` blocks.** There
is no `.css` file anywhere in the repo.

The three blocks are not layers of one system. They are two systems and a patch:

- **Block 1** (lines 16–153): the old "Spiced Linen" terracotta tokens plus 125 selectors of
  base styles.
- **Block 2** (154–306): the "Sage" design system, which redefines `:root` from scratch.
- **Block 3** (307–315): five selectors of safe-area and typography fixes, on top of both.

Measured overlap: block 1 declares **31 `:root` tokens; 29 are dead**, overridden wholesale by
block 2. Only `--nh` and `--font` survive. All 29 of block 1's dark-theme tokens are dead.
`--pr` reads `#B05334` (terracotta) in the first place a reader looks and `#4C7C5A` (green)
in the place that actually wins.

This was not an accident — it is the documented shortcut. Block 2's own install comment says:
"replace the two `:root` / `html[data-theme="dark"]` token lines … **or just paste this whole
file into a `<style>` AFTER the existing one — the `!important` overrides will win**." The
shortcut was taken and never unwound. 20 `!important` declarations across the three blocks are
the load-bearing consequence.

Only 3 selectors are restyled in both blocks, so **block 1's base styles are live and cannot
simply be deleted** — it is specifically the token layer that is dead. Any cleanup has to
separate those two things.

### 2. Generated data lives inside a source file

The 129 KB inline `SEED` sits in `index.html`, so a data refresh and a CSS edit are the same
diff. It is also why `embed_seed.py` is easy to skip: nothing about editing markdown suggests
you have just invalidated a file in `app/`. That skip is currently live — the committed
bootstrap disagrees with the library on 20 plan entries (T0.3).

Meanwhile `app/seed.json` is tracked by git but rewritten by `meal-server.py` on every sync, so
the checkout is permanently dirty and `deploy.sh` refuses by construction (T0.2).

### 3. Two design-system documents, both claiming authority

- `DESIGN-SYSTEM.md` (root, 66 lines): "v3: Sage … Supersedes the earlier 'Spiced Linen'
  (terracotta) system. Build all new screens from these tokens." **Current.**
- `design/design-system.md` (383 lines, dated 2026-06-21): "**This document is the source of
  truth for the engineer.**" **Stale** — it is the superseded system, six times longer, and
  it says it is authoritative.

This is debt #1 restated in prose: the dead terracotta tokens in the CSS and the stale 383-line
doc are the same abandoned migration, recorded in two places.

### 4. Docs sprawl with no index

15 markdown documents: 7 at the root, 2 in `spec/`, 1 in `design/`, 5 in `logs/`. Five of the
seven root docs were last touched in June (`CONTEXT.md`, `COOK-UX-BRIEF.md`,
`ITERATION-PLAN.md`, `ROADMAP.md`, `DESIGN-SYSTEM.md`). Nothing says which are current, which
are historical record, and which are superseded. `CLAUDE.md` names five of them as background
without ranking them.

### 5. JS: 202 globals in one namespace, with a hand-maintained load order

16 files, 2,965 lines, no module system — plain `<script src>` in a fixed order, so every
top-level `const`/`function` is a global. Counted: **202 top-level declarations**, including a
global mutable object literally named `state` (`app/js/db.js:67`). The file list is maintained
by hand in **three** places — `index.html`'s script tags, `sw.js`'s `ASSETS` precache array,
and the directory itself. All three agree today (16/16/16); nothing enforces that, and a file
missing from `ASSETS` is invisible until an installed phone goes offline.

The *decomposition* is fine — `screen-*.js` per screen, `grocery-engine.js` for the pure logic,
`db.js` for persistence. It is the *namespace and the load contract* that are unmanaged.

### 6. `build_seed.py` is large but coherent — and that is a finding too

1,096 lines is the biggest file in the repo, but it is a parser suite with clear section
banners and single-purpose functions (`load_recipe`, `load_plan`, `load_grocery_list`,
`load_inventory`, a hand-rolled `parse_yaml_simple`, a `sips` thumbnail cache, a validation
pass). Splitting it would be tidying, not repair. **Do not reflexively recommend it.** If it is
ever split, split it along the seam that already exists — parsers / thumbnails / validate /
emit — and only when someone has a reason to change one without the others.

## The proposed layout

Named by role, so where a file goes is a question about what it does rather than about history:

```
app-build/
  client/                  # A — the thing the phone runs
    index.html             #     shell only: <head>, mount points, script tags
    styles/
      tokens.css           #     ONE token set (Sage), light + dark
      base.css             #     reset, layout primitives, type scale
      components.css       #     rows, chips, cards, nav
      screens.css          #     per-screen overrides
    js/                    #     unchanged — the decomposition is already right
    assets/                #     icons, manifest.webmanifest
    sw.js
  pipeline/                # B — markdown -> seed
    build_seed.py
    embed_seed.py
  server/                  # C — what runs on the mini
    meal-server.py
    apply-feedback.py
    deploy.sh
    com.mealplanner.server.plist   # currently only in ~/Library/LaunchAgents
  dist/                    # D — generated, .gitignore'd, server-owned
    seed.json
    .thumb-cache.json
  docs/                    # E
    README.md              #     the index that does not exist today
    spec/                  #     spec.md, inventory-sync-spec.md
    design-system.md       #     ONE of them
    archive/               #     CONTEXT, COOK-UX-BRIEF, ITERATION-PLAN, logs/, old design doc
  program/  knowledge/     # F — kit-owned, unchanged
  scripts/                 #     pre-commit and friends
```

Four divisions, one rule each:

1. **`client/` is what the phone runs.** Nothing that only ever executes on the mini belongs
   in it. Today `app/` fails this — `deploy.sh` and `build_seed.py` sit beside `sw.js`.
2. **`dist/` is generated and git-ignores itself.** This is the structural fix for the dirty
   checkout: `seed.json` stops being a tracked file the server mutates, and `deploy.sh`'s
   guard becomes usable instead of permanently tripped.
3. **`docs/archive/` is where superseded documents go to stay readable without claiming
   authority.** The 383-line design doc is the case in point.
4. **CSS becomes files, so it can be reviewed.** This is what makes debt #1 fixable at all: you
   cannot delete 29 dead tokens safely when they are interleaved with 125 live selectors in one
   blob, and you cannot diff a restyle that lives in the same file as 129 KB of generated JSON.

## What this costs, honestly

Moving files is not free here, and this is a live app the user cooks from tonight.

> **Corrected 2026-08-04 by T0.11, which measured what this section had only read.** Two of the
> claims below were wrong, and the move is *cheaper* than stated:
> **(a)** the service-worker scope does **not** change — `meal-server.py` serves with
> `directory=SCRIPT_DIR`, so the web root is wherever the app files sit and every URL stays
> identical; installed phones would see nothing. **(b)** the `../..` depth hazard is not real —
> `app/` and `server/` are both one level under the repo root, so the feedback path and
> `BASE_DIR` still resolve. What survives: the launchd plist's absolute path is genuinely
> fiddly (outside the repo, no test covers it, needs `bootout`/`bootstrap`). The move was
> nonetheless **deferred** — see `program/findings/T0.11.md` for the trigger.

Every path below is hardcoded somewhere and breaks on the move: `sw.js`'s `ASSETS` (relative,
survives) and its `CACHE` (**must be bumped or installed phones break**); `meal-server.py`'s
`SCRIPT_DIR` and its `SCRIPT_DIR/../..` feedback path; `build_seed.py`'s `BASE_DIR`,
`THUMB_CACHE_PATH` and output path; `embed_seed.py`'s two paths; `deploy.sh`'s
`SCRIPT_DIR/..`; the launchd plist's absolute path to `meal-server.py`; `scripts/pre-commit`'s
two `^app/` patterns; `CLAUDE.md`; and the docs mirror's cited paths.

**The riskiest part is not the move — it is that `deploy.sh` cannot currently run**, so there
is no rehearsed path back if a move breaks the mini. That argues for sequencing.

## Recommended sequence

Do the cheap, high-value halves first; treat the physical move as optional and last.

1. **T0.2 first** (already filed). Fix the guards before moving anything they guard. It also
   restores a working deploy, which is the rollback path everything else depends on.
2. **Extract CSS to `client/styles/`, delete the 29 dead tokens, retire `!important`** where it
   was only compensating for block order. Pure win, no path changes outside `index.html` and
   `sw.js`, and it is what makes the UI audit (T0.5) answerable at all.
3. **Delete or archive `design/design-system.md`.** One line of work, removes a document that
   actively misdirects.
4. **`dist/` + `.gitignore` for `seed.json`.** Small, and it unbreaks `deploy.sh` permanently.
5. **The directory move itself — only if 1–4 leave a reason.** It is the largest blast radius
   and the smallest payoff of the five. A structure nobody is fighting is not worth a migration.

The honest summary: **the layout is a symptom, and the debt is in the CSS.** One directory
holding four kinds of thing is untidy; 29 dead tokens and two contradictory design-system
documents are why nobody can answer "is this app's UI current?" — which is the question that
started this.
