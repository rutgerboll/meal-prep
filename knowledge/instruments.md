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

As of 2026-08-04 it holds **two** errors, interleaved, and the pair *is* the diagnosis:

- `[Errno 1] Operation not permitted` opening `meal-server.py` — Full Disk Access. Errno **1**
  is EPERM; **2** would mean a wrong path.
- `[Errno 48] Address already in use` — the grant is fine and something else holds 8765, almost
  always `deploy.sh`'s manual fallback from an earlier run.

Both appear because `deploy.sh` runs `launchctl kickstart` from a shell that *has* the grant and
those spawns can inherit it; autonomous `KeepAlive` respawns cannot. Same job, two failure
modes, alternating by who triggered the spawn. That interleaving is what made this look
intermittent and cost two wrong diagnoses.

**The grant is on the wrong binary, not missing.** `/usr/bin/python3` is an Xcode tool shim
(`com.apple.dt.xcode_select.tool-shim-public`); it re-execs
`/Library/Developer/CommandLineTools/usr/bin/python3` (`com.apple.python3`, team `59GAB85EFG`),
and TCC keys on the signature. `SYNC-SETUP.md` used to say to grant the shim, so that is what
was granted. **General rule: when a service cannot read its own script, check which binary is
executing, not which path you typed** —

```
codesign -dv /usr/bin/python3            # com.apple.dt.xcode_select.tool-shim-public
python3 -c 'import sys; print(sys.executable)'
```

Fix: add `/Library/Developer/CommandLineTools/usr/bin/python3` to Full Disk Access (user action,
System Settings). Until then the server runs only via `deploy.sh`'s manual fallback and **dies
on reboot**. `deploy.sh`'s last line is the status indicator — **"via launchd"** vs **"manual
background process"**.

To test the agent honestly, free the port first: with something already listening you get
"address already in use" and learn nothing about the grant.

## Measuring computed styles — no timers, ever

The browser pane throttles **timers** when it is hidden, not style reads. An `await sleep(400)`
between navigations stretches to seconds and blows the 30 s tool budget; T0.7 concluded the
instrument was unusable on that basis and was wrong. The app renders **synchronously**, so drop
the timers and the full 5-screen × 2-theme battery runs in **2 ms**:

```js
const run = (theme, route) => {
  document.documentElement.dataset.theme = theme;
  navigate('#/more');   // fixed predecessor: the plan screen's DOM depends on where you
  navigate(route);      // came from, which otherwise makes hashes non-reproducible
  return measure();     // one element per distinct tag.className, hashed over ~16 longhands
};
```

Routes are `#/plan`, `#/recipes`, **`#/list`** (not `#/grocery` — a wrong route silently
renders the plan screen and gives you a duplicate hash), `#/cook`, `#/more`.

**Wait for `document.fonts.status === 'loaded'` before measuring anything text-dependent.**
`font-display:swap` guarantees a window where headings render in the fallback, so `height` and
anything derived from it measures the wrong thing — and the zero-timer pattern above makes you
*more* likely to land in that window, because it does not wait. T0.7 and T0.8 both baselined in
the unloaded state without noticing; T0.12 caught it only because its change looked like a
10-of-10 regression that turned out to be the font finishing loading. The loaded-state baseline
for the current build is `dark #/plan 39:77b78797 · #/recipes 60:f66e8fb3 · #/list 29:783f68e6 ·
#/cook 45:18638ff7 · #/more 23:0e737f23`, and light `39:82666055 · 60:fa7f4eb8 · 29:73b0df10 ·
45:57f44cad · 23:82bb9a43`.

**Confirm you are measuring fresh assets before trusting any result.** The service worker is
cache-first, so it keeps serving edited CSS from cache and a `CACHE` bump alone may not clear it
within a session. Compare a sheet's `cssRules.length` against the file on disk; T0.8 got two
false "no change" results this way. Unregistering the worker and clearing caches is what works:

```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
```

For a change that claims not to alter styling at all, the cheaper first check is the **CSSOM
hash** — every rule's `cssText` in document order, hashed. Wrap `sheet.cssRules` in try/catch:
a cross-origin sheet throws, and swallowing that silently drops it from the comparison.

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
