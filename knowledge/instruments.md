# Instruments — how to actually measure this app

Established by T0.1 (2026-08-04) by running each one. Cited from `program/CONTRACT.md` §3.
CONTRACT is the binding rule; this file is the operating detail behind it.

## The five states a change can be in

Ranked by how close to the user's phone they are. Naming the wrong one is the most common way
a claim here becomes false.

| # | state | where it lives | what moves it forward |
|---|---|---|---|
| 1 | committed | `HEAD` on `main` | `git commit` |
| 2 | working tree | the main checkout's files | saving a file — **this is what the mini serves** |
| 3 | library | markdown in the parent `Meal planning/` | the user editing it, or a Claude skill |
| 4a | installed **data** | the phone's IndexedDB | a Sync (and one automatic sync on app load) |
| 4b | installed **shell** | the phone's service-worker cache | **only** a changed `const CACHE` in `app/sw.js` |

The two halves of 4 are the point. Data is nearly live: `/sync.json` re-runs `build_seed.py`
on every request, so a plan edited in Claude reaches the phone on the next Sync with no
commit, no deploy, no repo action at all. The shell is the opposite: the service worker is
cache-first with no revalidation, so a phone keeps running the JS it cached until `CACHE`
changes — and for `app/js/*.js` nothing enforces that bump.

A sixth, narrower thing: the inline `const SEED` in `index.html`, refreshed by
`embed_seed.py`. It is what a **fresh install shows before its first sync**, and nothing
else. It only matters when the mini is unreachable.

## Serving the app

**A listening port is not a working server.** On 2026-08-04, `com.mealplanner.server` had been
holding port 8765 for three days while answering 404 on every static path and 500 on
`/sync.json`. Nothing noticed: the phone's sync just failed, and an installed app keeps working
offline. Certify before you measure:

```
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/index.html
```

**Non-200 → read `/tmp/mealplanner-server.err` before doing anything else.** That is the
launchd job's own stderr and it has held the answer every time. T0.1 checked it once, before a
restart, when it did not exist, then never went back — and spent two contract revisions guessing
as a result.

As of 2026-08-04 it says `Operation not permitted` opening `meal-server.py`. **Errno 1 is
EPERM; ENOENT would be 2** — so the path is fine and this is a permission denial on
`~/Documents` for a LaunchAgent-invoked binary, i.e. Full Disk Access, exactly as
`SYNC-SETUP.md` says. The grant is missing and only the user can add it (System Settings →
Privacy & Security → Full Disk Access → `/usr/bin/python3`).

**Until then the server runs only via `deploy.sh`'s manual fallback and dies on reboot.**
`cd app && ./deploy.sh` brings it back; it reports "via launchd" once the grant exists and
"manual background process" until then — that string is the status indicator.

Prefer your own instance whenever your work could disturb the phone's server:

```
cd app && MP_BASE_DIR="/Users/rutgerboll/Documents/Claude/Projects/Meal planning" MEAL_PORT=8766 python3 meal-server.py
```

Works from a worktree (the child `build_seed.py` inherits `MP_BASE_DIR`). Stop it **by PID**:

```
kill $(lsof -ti :8766 -sTCP:LISTEN)
```

Never `pkill -f meal-server.py` — it matches the launchd server the phone depends on, which is
exactly how T0.1 restarted production by accident.

## Reading the installed state from the page

`curl` bypasses the service worker; a `fetch()` from inside the page goes through it. The two
disagreeing **is** the staleness measurement, and it is the only honest way to make a
denominator-4b claim:

```js
await caches.keys()                                   // names the live cache, e.g. mealplanner-v27
const viaSW  = await (await fetch('./js/pwa.js')).text()   // what the app runs
const c      = await caches.open('mealplanner-v27')
const cached = await (await c.match(location.origin + '/js/pwa.js')).text()
```

For data, open IndexedDB `meal-planner` (v3) and read `meta` → `{seededAt, schemaVersion,
inventoryUpdatedAt}`. A `seededAt` from seconds ago means the app auto-synced on load, so you
are looking at state 3, not at the inline bootstrap.

**A fresh IndexedDB is not evidence about migrations** — CONTRACT §5. Loading the app in a
clean browser profile gives you a first-seed path, never an upgrade path.

## Console baseline

A clean load emits **zero** console messages. There is no chatty logging to filter out, so
any output at all is a finding.

## Seed builds

`build_seed.py` writes to the **invoking checkout's** `app/seed.json`, and `.thumb-cache.json`
is per-checkout and `.gitignore`d. So a worktree run with `MP_BASE_DIR` set reads shared data
and writes nothing shared — a worktree is a real isolation boundary for the seed pipeline.
The cost is that a fresh worktree always pays the cold-cache price: **7.4 s cold vs 0.10 s
warm** on the current library (35 recipes, 52 photos through `sips`).

Known-clean baseline output: 35 recipes / 304 ingredients / 5 plans / 98 plan entries / 71
purchase units / 20 pantry items / 52 cookbook photos, `aisle:pantry remaining: 0`, and four
`not in mapping table` WARNINGs on `lemon-ricotta-pancakes` (vanilla extract, sugar, baking
powder, maple syrup). A fifth warning is yours.

## `app/seed.json` is server-owned runtime output

`meal-server.py` rewrites it on every `/sync.json` request. **T0.10 untracked it** and added it
to `.gitignore` beside `app/.thumb-cache.json`, so the checkout stays clean under a live server
and `deploy.sh` stops refusing. Committing a wanted seed refresh now needs `git add -f`,
deliberately (`knowledge/prioritization.md` G5).

Nothing but the pipeline reads it — the app boots from the inline `SEED` in `index.html` and
syncs from `/sync.json`. A fresh clone therefore has no seed until `build_seed.py` runs, which
needs `MP_BASE_DIR` and the parent library; the app still works offline from its bootstrap,
only sync is dead.

To untrack a file a live daemon owns, park it around the merge — git will (correctly) refuse
otherwise, and forcing it deletes a file the server is serving from:

```
mv app/seed.json /tmp/seed.parked.json
git merge --no-ff <branch>
[ -f app/seed.json ] || mv /tmp/seed.parked.json app/seed.json   # server may have beaten you to it
```
