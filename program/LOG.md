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
*(supersedes log #4)*
CORRECTION TO ENTRY #4 — THE SERVER IS FIXED, AND MY DIAGNOSIS WAS WRONG. Entry #4 said the
launchd server's 404/500 was caused by /usr/bin/python3 lacking Full Disk Access. That is
refuted. While cleaning up my own test server I ran an over-broad pkill -f "meal-server.py"
that also killed the launchd process (pid 89492, up since 25 Jul); launchd restarted it at
14:08:33, and the fresh process serves everything correctly: 200 on /index.html, /sw.js,
/js/pwa.js, /manifest.webmanifest, /icon-192.png, and 1,087,727 bytes on /sync.json —
including through tailscale on the phone's own HTTPS URL. Same LaunchAgent, same plist, same
interpreter. So Full Disk Access is granted and always was; a missing grant cannot be the
cause. The kill was unintended (I meant to stop only my own instance on 8766) and I am
reporting it as such, not as a repair I planned.

What survives from #4, all still measured: the old process served 404 on every static path
and 500 on /sync.json for days WHILE HOLDING THE PORT; a listening port is therefore not
evidence of a working server, and deploy.sh's lsof-LISTEN health check would have printed
its success tick over it (T0.2 fixes that). Last known-good sync before the outage was
2026-08-01 08:52.

What is now unknown: why a long-running process lost the ability to read under ~/Documents
while a fresh one has no trouble. Candidates nobody has tested — a TCC grant re-evaluated
against an already-running process, an OS update (host is Darwin 25.3.0) invalidating the
running process's authorization, or a firmlink/volume change under the path. Do not repeat
the FDA story as the cause. If the outage recurs, capture evidence BEFORE restarting: the
restart is the thing that destroys the only specimen.

Practical rule, unchanged in effect: curl a real path before trusting any server, and if the
launchd one is answering 404s, `launchctl kickstart -k gui/$(id -u)/com.mealplanner.server`
is now a known-working remedy.

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
