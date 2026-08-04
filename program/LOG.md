# Meal Planner app — LOG

> **GENERATED from the control DB — do not hand-edit.** Append entries with `tm log <TAG> "message" [--task ID]`. Read every [READ-FIRST] entry in this file's main body before starting a task — a retired or auto-expired one has already left it for the `## Retired [READ-FIRST]` section at the foot (indexed, not mandatory); [BLOCKING] marks a live impediment on a specific task — see its status. Retire a dead one with `tm log retire <entry-ref> [--superseded-by <ref>] [--reason "…"]` (T14.18).

## 2026-08-02 08:32 · PROGRAM · [READ-FIRST] · rutgerboll@Rutgers-Mini
PROGRAM SETUP — Meal Planner app registered on the tm control plane. program/ scaffolded in the main checkout; CONTRACT.md drafted as a BUILD contract (repo-state vs installed-state denominators, running-app-as-instrument, >=2 comparators) and is NOT frozen — T0.1 verifies and freezes it. CLAUDE.md router created at the project root with the kit fence. Execution is sequential: seed.json, the running meal-server, and the shared markdown library are global mutable state.

## 2026-08-03 13:05 · PROGRAM · [SCOPE] · rutgerboll@Rutgers-Mini#loop-def
LOOP DEFINITION (propose-only, D-1). Authored knowledge/prioritization.md (V=3S+2K+2L over
pipeline-integrity / kitchen-impact / leverage, with H tracked outside V; gates G1 freeze-before-build,
G2 cooking-cycle, G3 human-instrument, G4 lane-is-the-instrument, G5 never-commit-seed.json,
G6 manual-CACHE-bump, G7 event-driven re-rank) and knowledge/loops.md (all three loop prompts).
Board state has not moved; no task claimed. Two findings a future session should not re-derive:
(1) the parallelism ceiling here is 1, and 2 at most after T0.1 — T1.1 and T2.1 may never run
concurrently because both need build_seed.py output AND the running app; (2) Wave 1's deliverable
shape is settled by precedent, not open — plugin-updates/README-INSTALL.md records that the
installed plugin is read-only in a session, so T1.1/T1.2 ship a SKILL.md patch spec plus a user
install step, which makes their end-to-end "Done when" human-gated.

## 2026-08-03 13:10 · PROGRAM · [SCOPE] · user
Decision D-1 answered by the user from the PWA: Start only the board-watch loop; leave the PM and inbox loops defined but unstarted. → Accept

## 2026-08-04 13:58 · T0.1 · [READ-FIRST] · rutgerboll@Rutgers-Mini#T0.1
*(superseded by log #7)*
~~PRODUCTION SYNC SERVER IS DOWN — and it is down in a way that looks up. The launchd job~~
~~com.mealplanner.server (pid 89492, running since 25 Jul) still HOLDS port 8765, but every~~
~~request fails: GET /index.html -> 404, GET /sw.js -> 404, GET /sync.json -> 500~~
~~("build_seed.py returned non-zero exit status 2"). The same meal-server.py started from a~~
~~shell session on port 8766 serves all three at 200, from the same files, so this is the~~
~~LaunchAgent's environment and not the code. SYNC-SETUP.md predicts exactly this cause:~~
~~/usr/bin/python3 needs Full Disk Access to read anything under ~/Documents, and a~~
~~LaunchAgent does not inherit Terminal's grant. The doc says the agent then "crash-loops~~
~~silently" — it does not. It stays up and serves errors, which is why nothing surfaced it.~~
~~Last successful sync was 2026-08-01 08:52 (mtime of app/seed.json and app/.thumb-cache.json,~~
~~both server-written). tailscale serve still proxies the phone's https URL to 127.0.0.1:8765,~~
~~so the phone's Sync has been failing since then; an installed phone still works offline off~~
~~its service-worker cache, but a FRESH install cannot load the app shell at all.~~

~~What this means for other tasks: CONTRACT §3's "the running app" instrument is NOT the~~
~~launchd server. Any task making a behavior claim must start its own instance~~
~~(MEAL_PORT=8766 MP_BASE_DIR=... python3 meal-server.py) and say so. Do not read a green~~
~~port as a green server: deploy.sh only checks that something LISTENS on 8765, so it would~~
~~print "Server is up" over this exact failure. Fixing the LaunchAgent is a user action~~
~~(System Settings -> Privacy & Security -> Full Disk Access -> add /usr/bin/python3); it is~~
~~not in T0.1's scope and has not been done.~~

## 2026-08-04 13:59 · T0.1 · [READ-FIRST] · rutgerboll@Rutgers-Mini#T0.1
THE CLAUDE-SIDE SKILLS ARE ON THIS FILESYSTEM AND READABLE — STATE.md's open question is
answered, and Wave 1 is unblocked. All five (recipe-capture, meal-planner, grocery-list,
inventory, cook-feedback) live as SKILL.md files in the desktop app's extracted read-only
plugin cache. Find the path rather than hardcoding it, because it contains session UUIDs:

  find ~/Library/Application\ Support/Claude -type d -name recipe-capture 2>/dev/null

Today that resolves to .../local-agent-mode-sessions/<session>/<sub>/rpm/
plugin_015FwuR4F4oA8McKxoM2JgGP/skills/. Plugin manifest: name "meal-planning", version
0.2.0, extracted 2026-07-03. A second identical copy sits under Claude-Account2 (verified
byte-identical with diff -rq).

Read-only is the operative word. The plugin's SOURCE of record is not on this filesystem
— only this extracted snapshot plus the hand-authored replacements the user keeps in
"Meal planning/plugin-updates/" (SKILL.md for meal-planner, grocery-list, inventory,
cook-feedback — but NOT recipe-capture, which has never been revised there). So Wave 1's
deliverable shape is confirmed, not merely predicted: T1.1/T1.2 ship a SKILL.md patch
spec plus a user install step (Settings -> Capabilities), per plugin-updates/
README-INSTALL.md. The 2026-08-03 loop-def LOG entry called this correctly.

One naming caveat for T1.1: the seed is at schemaVersion 3, not 2 (inventory-sync landed
after the Phase-2 note in ROADMAP.md). The three keys T1.1 targets are real and present in
the built seed today — recipe objects carry image, thawHoursAhead, prepAhead — so T1.1's
substance stands; only its "schemaVersion-2" label is historical. Do not go hunting for a
v2 seed to match.

## 2026-08-04 14:03 · T0.1 · [DONE] · rutgerboll@Rutgers-Mini#T0.1
CONTRACT.md is frozen at v1.0 (2026-08-04, T0.1). Six corrections, each with evidence in
findings/T0.1.md: §1's two denominators became four (code and data reach the phone by
different routes — the mini serves the WORKING TREE not HEAD, /sync.json rebuilds the seed
per request, and the service-worker cache is cache-first and never revalidates); §2 settles
that all five Claude-side skills are readable and none writable; §3 DECERTIFIES the launchd
server on 8765 and gives a certified own-instance command; §5's "~80x" became the measured
7.4s cold / 0.10s warm; §8 is now copy-pasteable and corrects "deploy runs on the Mac mini,
not here" — this machine IS the mini; §10 says what a worktree does and does not isolate.

Read CONTRACT §1 before writing any finding: "repo vs installed" is no longer the vocabulary,
and §6 now asks which of the four states you measured.

Also settled, so nobody re-derives it: app/seed.json's permanent dirtiness in the main
checkout is not neglect — meal-server.py re-runs build_seed.py and rewrites that tracked file
on every /sync.json request. A fresh build reproduces it byte-for-byte. Treat it as
server-owned runtime output (knowledge/prioritization.md G5), and note deploy.sh's
dirty-checkout guard therefore refuses permanently.

Two real defects found in passing, both out of T0.1's "do not change app/" scope and both
filed as tasks: scripts/pre-commit does not cover app/js/*.js (measured by probe commit, not
assumed), and deploy.sh calls a server healthy on an lsof LISTEN check that the currently
broken server passes.

New durable artifact: knowledge/instruments.md, cited from CONTRACT §3 so the docs mirror
publishes it. It carries the five-state table, the certified serve command, the
curl-vs-fetch() staleness measurement, and the known-clean build_seed.py baseline
(35 recipes / 304 ingredients / 5 plans / 98 entries / 71 units / 20 pantry / 52 photos, plus
four expected lemon-ricotta-pancakes WARNINGs — a fifth is yours).

## 2026-08-04 14:09 · T0.1 · [READ-FIRST] · rutgerboll@Rutgers-Mini#T0.1
*(superseded by log #11)*
~~CORRECTION TO ENTRY #4 — THE SERVER IS FIXED, AND MY DIAGNOSIS WAS WRONG. Entry #4 said the~~
~~launchd server's 404/500 was caused by /usr/bin/python3 lacking Full Disk Access. That is~~
~~refuted. While cleaning up my own test server I ran an over-broad pkill -f "meal-server.py"~~
~~that also killed the launchd process (pid 89492, up since 25 Jul); launchd restarted it at~~
~~14:08:33, and the fresh process serves everything correctly: 200 on /index.html, /sw.js,~~
~~/js/pwa.js, /manifest.webmanifest, /icon-192.png, and 1,087,727 bytes on /sync.json —~~
~~including through tailscale on the phone's own HTTPS URL. Same LaunchAgent, same plist, same~~
~~interpreter. So Full Disk Access is granted and always was; a missing grant cannot be the~~
~~cause. The kill was unintended (I meant to stop only my own instance on 8766) and I am~~
~~reporting it as such, not as a repair I planned.~~

~~What survives from #4, all still measured: the old process served 404 on every static path~~
~~and 500 on /sync.json for days WHILE HOLDING THE PORT; a listening port is therefore not~~
~~evidence of a working server, and deploy.sh's lsof-LISTEN health check would have printed~~
~~its success tick over it (T0.2 fixes that). Last known-good sync before the outage was~~
~~2026-08-01 08:52.~~

~~What is now unknown: why a long-running process lost the ability to read under ~/Documents~~
~~while a fresh one has no trouble. Candidates nobody has tested — a TCC grant re-evaluated~~
~~against an already-running process, an OS update (host is Darwin 25.3.0) invalidating the~~
~~running process's authorization, or a firmlink/volume change under the path. Do not repeat~~
~~the FDA story as the cause. If the outage recurs, capture evidence BEFORE restarting: the~~
~~restart is the thing that destroys the only specimen.~~

~~Practical rule, unchanged in effect: curl a real path before trusting any server, and if the~~
~~launchd one is answering 404s, `launchctl kickstart -k gui/$(id -u)/com.mealplanner.server`~~
~~is now a known-working remedy.~~

## 2026-08-04 14:41 · T0.1 · [SCOPE] · rutgerboll@Rutgers-Mini#T0.1
INBOX TRIAGED — all three open items promoted to tasks and closed (470 UI currency audit, 471
refactor assessment, 472 spawn-capability bootstrap). New wave 0c — codebase health: T0.4,
T0.5, T0.6, briefs written. T0.6 also absorbs a direct user question asked the same day about
the ideal file layout.

Do not start T0.5 or T0.6 without reading knowledge/structure-proposal.md — T0.1 measured the
answer to a large part of both while verifying the contract, and re-deriving it is wasted
money. Headline: app/index.html is 92% CSS by non-generated bytes (23,531 of 25,492) across
three inline <style> blocks, with NO .css file in the repo, and it ships two conflicting token
sets — 29 of block 1's 31 :root tokens are dead, overridden by the Sage block pasted after
them, which is the shortcut that block's own install comment offers. 20 !important
declarations hold it together. Block 1's 125 base selectors are still live, so the block
cannot simply be deleted; it is the token layer that is dead. Separately, two design-system
documents both claim authority and the stale 383-line one (design/design-system.md, June) is
the one that calls itself "the source of truth for the engineer".

Also recorded there and worth not re-litigating: build_seed.py is 1,096 lines but coherent
(a parser suite with real section seams), and the proposal argues AGAINST splitting it. The
202 top-level JS globals are a number, not yet a demonstrated defect. T0.6's brief says both
explicitly so the audit does not manufacture work.

T0.4 is the cheapest task on the board and probably the most valuable: there is no executable
test suite in this repo at all (logs/test-report-*.md are June prose), and a smoke-level suite
would have caught three of T0.1's findings unaided — the 404-behind-a-live-port server, the
20-entry bootstrap drift, and the app/js hook gap.

## 2026-08-04 14:53 · T0.1 · [SCOPE] · rutgerboll@Rutgers-Mini#T0.1
WAVE 0d WIRED FOR EXECUTION — the user approved the structure sequence on 2026-08-04 ("go
ahead and wire up the tasks to make these moves then we can execute"). Six tasks with briefs:
T0.7 extract the inline CSS to app/styles/*.css with ZERO visual change; T0.8 delete the 29
dead tokens and the ~15 !important declarations that only existed to fight them; T0.9 one
design-system doc; T0.10 dist/ so deploy.sh's guard works again; T0.12 self-host the heading
font; T0.11 the directory move, explicitly optional.

RUN ORDER IS NOT THE BOARD ORDER and the reason matters: T0.2 first (working guards before
shipping code to installed phones), then T0.10 (deploy.sh is the ROLLBACK PATH and is
currently dead — restore it before the risky work, not after), then T0.7 -> T0.8, with T0.9
runnable any time and T0.11 last if at all. KICKOFF carries the table. tm render still says
next: T1.1 because waves cannot be reordered (kit inbox 475); that is mechanical, not a
priority judgement, and KICKOFF says so out loud rather than silently contradicting the DB.

Two brief reconciliations, so nobody works from a stale copy:
- deploy.sh's dirty-checkout guard moved OUT of T0.2 and INTO T0.10, which also owns whether
  the generated artifacts move to dist/. T0.2 now fixes only the health check and must say in
  its finding that deploy is still blocked, so a green T0.2 is not read as a working deploy.
- T0.6 was re-scoped before anyone claimed it. Its layout-decision half is answered by the
  user; what remains is the ground wave 0d does NOT cover — JS coupling (not the global count),
  build_seed.py's parser correctness surface, the sync/feedback round trip, db.js migration
  handling, and offline/unreachable error paths. Retiring it is a legitimate outcome.

NEW DEFECT found while wiring, not previously logged: the heading font (Schibsted Grotesk) is
loaded from fonts.googleapis.com on every page load and appears in NO precache list --
grep -c fonts app/sw.js returns 0. So --font-head silently falls back to system-ui whenever
the phone is offline, which is the one condition this app exists to handle. It is also a
third-party request from an app whose keyless/private stance was paid for by REMOVING a
shipped API key. Nobody chose it; it arrived as line 3 of the Sage design system's install
instructions. T0.12, and its proof obligation is the offline case specifically:
document.fonts.check('600 30px "Schibsted Grotesk"') must be true with the network down.

## 2026-08-04 15:30 · T0.2 · [DONE] · rutgerboll@Rutgers-Mini#wave0d
T0.2 done. scripts/pre-commit now guards a PATTERN (app/index.html, app/js/*.js,
app/styles/*.css) instead of one filename, so T0.7's CSS files are covered before they exist.
Proven by 8 probe commits against the real hook, including two cases not in the brief: a
sw.js-only change still commits, and DELETING a precached file is now blocked too (ASSETS has
to change with it).

deploy.sh no longer calls a server healthy on an lsof LISTEN. It polls the app shell to wait
out startup, then asks /sync.json ONCE with a 300s ceiling. The two shapes are deliberate:
/sync.json re-runs build_seed.py per request, and my first attempt at a single uniform check
with a 45s ceiling produced a FALSE NEGATIVE on a cold .thumb-cache.json — polling a rebuild
would have multiplied that. Discriminates all four server states, including the nastiest one
(serves the shell fine, 404s on sync) which a shell-only check would pass and the phone would
still fail on.

Also removed `pkill -f "python3 .*meal-server.py"` from deploy.sh's fallback in favour of
killing by PORT. That pattern matches every meal-server on the machine including a session's
own test instance; it is how T0.1 restarted production by accident, and CONTRACT §3 now warns
against it by name.

READ THIS BEFORE ASSUMING DEPLOY WORKS: it does not. The dirty-checkout guard still refuses
every time, because app/seed.json is tracked and the server rewrites it. T0.10 owns that. A
green T0.2 is not a working deploy, and deploy.sh has still never been run end to end.

Trap for anyone testing shell functions by extracting them: `sed -n '/^f()/,/^}/p'` on a
ONE-LINE function body silently swallows the next function's header, producing a nested
definition that returns 0 for everything. My first run reported a dead port as healthy. Use a
line range and `sh -n` the result.

## 2026-08-04 15:36 · T0.10 · [READ-FIRST] · rutgerboll@Rutgers-Mini#wave0d
*(supersedes log #7)*
CORRECTION TO ENTRY #7 — FULL DISK ACCESS *IS* THE CAUSE, AND THE PHONE'S SERVER WILL NOT
SURVIVE A REBOOT. Entry #7 retracted the FDA diagnosis on the strength of one healthy process
appearing after an accidental pkill. That retraction was wrong. Running deploy.sh end to end
for the first time (T0.10) made launchd try to start the server, and its own stderr says:

  /Library/Developer/CommandLineTools/usr/bin/python3: can't open file
  '.../app-build/app/meal-server.py': [Errno 1] Operation not permitted

Nine times, last exit code = 2, job in spawn-throttle. Errno 1 is EPERM, not ENOENT (2) — the
path is correct and the file reads fine from a session shell, so this is a permission denial
on ~/Documents for a LaunchAgent-invoked binary. That is exactly what SYNC-SETUP.md documents.
CONTRACT v1.0 was right, v1.1 was the error, v1.2 is the correction.

The log was there the whole time. I checked /tmp/mealplanner-server.err once, before the
restart, when it did not exist, and never went back. §3 now says to read it FIRST.

OPERATIONAL STATE, which someone needs to act on: production is being served by deploy.sh's
MANUAL FALLBACK (a nohup'd process, PPID 1, started 15:33), not by launchd. It is healthy, it
serves the tailnet, and it survives a session ending — but it does NOT survive a reboot or a
logout. If the phone stops syncing and nobody has touched anything, this is why.

The fix is a USER action and cannot be done from a session: System Settings -> Privacy &
Security -> Full Disk Access -> + -> Cmd-Shift-G -> /usr/bin/python3 -> enable. Then
`cd app && ./deploy.sh` and confirm it says "via launchd" rather than "manual background
process". Until that line changes, the launchd path is still broken.

Still unexplained and not worth a third guess: why the 14:08 process ran healthily with
launchd's own argv while launchd cannot exec that path now. It does not change the remedy.

## 2026-08-04 15:37 · T0.10 · [DONE] · rutgerboll@Rutgers-Mini#wave0d
T0.10 done. app/seed.json is untracked and .gitignore'd (with .claude/launch.json, which was
tripping the same guard as an untracked file). Proof: forced a live /sync.json, watched the
server rewrite seed.json, and git status --porcelain stayed EMPTY. deploy.sh then ran end to
end for the first time in this program's history and exited 0 — which also closes T0.2's
declared weakest link, that its health functions were proven in isolation but never integrated.

I did NOT move the artifacts to dist/, though the proposal leaned that way. Untracking is what
fixes deploy; the move is cosmetic, costs four path edits (build_seed.py output +
THUMB_CACHE_PATH, embed_seed.py SEED_PATH, meal-server.py read), and T0.11 would redo them.
Folded into T0.11's decision — and if T0.11 says "not worth doing", the .gitignore entry now
states plainly what a dist/ directory would only have implied.

TWO THINGS FOR THE NEXT SESSION:
1. Committing a wanted seed refresh now needs `git add -f`. T0.3, that means you.
2. A fresh clone has no seed.json until build_seed.py runs (needs MP_BASE_DIR + the parent
   library). The app still boots offline from the inline SEED; only sync is dead. CLAUDE.md
   does not say this yet.

See LOG #11 for the incidental finding, which matters more than this task: the launchd job
cannot start the server (EPERM / Full Disk Access), production is on deploy.sh's manual
fallback, and it will not survive a reboot.

## 2026-08-04 15:56 · T0.7 · [DONE] · rutgerboll@Rutgers-Mini#wave0d
T0.7 done. All 23,526 bytes of CSS are out of index.html (154,642 -> 131,784 bytes) and into
app/styles/, precached, CACHE bumped v27 -> v28. The move is PROVEN a no-op two ways: the
extracted bytes are character-for-character identical to HEAD's three <style> blocks, and the
live CSSOM is the same 213 rules in the same order with the same hash (cd36463a) before and
after.

I DID NOT USE THE FILE NAMES THE BRIEF ASKED FOR, and T0.8 needs to know why. tokens/base/
components/screens presumes ONE token set — which is precisely what does not exist yet — and
building it requires hoisting Sage's tokens above block 1's base styles. That reordering would
have destroyed the only thing making this task safe. So the split follows existing contiguous
boundaries with names that describe reality: 01-tokens-legacy.css (29 of 31 tokens dead),
02-base.css (125 LIVE selectors), 03-sage.css (Sage tokens + its !important overrides),
04-patches.css. Numeric prefixes because load order IS correctness and there is no build step.
T0.8 should reshape these into the intended four AFTER deleting the dead set — at that point
the rename is safe.

CONFIRMED LIVE, for T0.8: --nh and --font resolve correctly in both themes. They are the two
legacy tokens that survive; deleting them with their neighbours is the most likely way to
break T0.8.

TWO TRAPS PAID FOR:
1. Running embed_seed.py as a round-trip test REWRITES the inline bootstrap with fresh plan
   data — i.e. it silently performs T0.3. I spliced HEAD's const SEED back so T0.7 carries no
   data change. Testing the embed step mutates the file it tests.
2. The computed-style instrument is unusable while the browser pane is hidden: the renderer
   throttles to ~0.8ms per property read, so one route of 462 elements took 29 SECONDS and the
   battery timed out repeatedly. I substituted stronger comparators (byte + CSSOM identity),
   which is valid for a pure MOVE — but T0.8 is a DELETION and cannot lean on that
   substitution. Get the sampler working first. Its before-baselines are in findings/T0.7.md
   and are still valid, since T0.7 changed no CSS. Also: the sampler is only deterministic if
   every measurement is preceded by the SAME route (a 39-vs-45 element discrepancy until I
   pinned a fixed predecessor).

## 2026-08-04 16:12 · T0.8 · [DONE] · rutgerboll@Rutgers-Mini#wave0d
T0.8 done. Every design token is declared exactly ONCE (58 duplicate declarations gone), and
!important is down from 20 to 4 — the four .hidden display utilities, which were never the
problem. All ten screen x theme computed-style hashes are unchanged, verified after each of the
three edit stages separately rather than only at the end.

THE KEY MOVE, for anyone doing similar work here: Sage's !important rules existed to neutralise
glassmorphism still sitting in the base layer. Deleting the !important alone would have brought
the frosted glass BACK. For each of five rules I rewrote the base declaration to the value Sage
was forcing, then deleted Sage's override entirely. Collapse, don't strip.

THE INSTRUMENT NOW WORKS AND T0.7 SAID IT COULDN'T. The blocker was never the number of
properties — it was TIMERS. A hidden browser pane throttles setTimeout, so `await sleep(400)`
between navigations stretches to seconds and blows every 30s budget. The app renders
synchronously, so navigate(route) followed immediately by a measurement in the same call works:
the full 10-combination battery runs in 2 MILLISECONDS. Pattern is in knowledge/instruments.md.

TRAP THAT COST ME TWO FALSE RESULTS: the service worker is cache-first, so it keeps serving
edited CSS from cache and a CACHE bump alone did not clear it within a session. Twice I measured
what I believed was new CSS and was actually reading the old files — caught only because a
sheet's cssRules.length did not match the file on disk. ALWAYS check that before trusting a
measurement. Unregistering the SW and clearing caches is what finally worked.

DEFERRED, and filed as T0.13: the brief's final rename to tokens/base/components/screens. That
is not a rename — sorting rules into "components" and "screens" interleaves 02-base.css and
03-sage.css, reordering rules across the boundary where same-specificity conflicts are currently
resolved by source order. The payoff is naming; the risk is a silent cascade change. T0.11 may
make it moot.
