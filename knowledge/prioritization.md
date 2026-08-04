# Prioritization framework — Meal Planner app

> **v0.1 — PROPOSED 2026-08-03 by the loop-definition session, not yet accepted.** Nothing here
> has moved the board. Scores are a view, recomputed at triage events; they are never `tm`
> columns (a persisted priority field rots — the kit's T5.6 warning applies unchanged). The
> board moves only through normal `tm` verbs after the user accepts.
>
> Companion: [loops.md](loops.md) — the three standing-loop definitions this framework's duties
> are derived from.

## 0. Why this is not the kit's framework

The kit's `knowledge/prioritization-framework.md` was read once, as a worked example of the
*form*: anchored 0–3 dimensions, a stated formula, non-scalar gates, one fact per score. The
form is adopted. Three of its four dimensions are not, and the reasons are facts about this
project rather than taste:

- **Reach is meaningless here.** The kit scores R over "all 6 registered projects plus every
  future one". This app has one user, one phone, one Mac mini. There is no reach to bank, so a
  reach dimension would score 0 or 3 on every row and do no ranking work. Dropped.
- **Urgency, as the kit defines it, double-counts.** The kit's U mixes "integrity exposure" with
  "biting during daily use". On this board those are genuinely different axes with different
  populations — silent pipeline drift (invisible, compounding) versus felt kitchen friction
  (visible, not compounding). Split into **S** and **K** below rather than summed into one.
- **Lanes are not file surfaces.** The kit's G4 lanes on contended files (`bin/tm.py`, `web/`).
  Here two sessions editing entirely disjoint files still collide, because both must rebuild
  `app/seed.json` and serve the app to verify anything. The lane is the *instrument*, not the
  file. See §4.

What is adopted essentially unchanged: **L** (graph leverage), because this board has a real
dependency graph; the "effort never buys rank" rule; and the event-driven re-rank discipline
(§3 G7). Where the kit is right, it is cited as right.

## 1. What is actually scarce

1. **The user's cooking cycle.** Meal plans in the parent library are dated 2026-06-22,
   2026-07-12, 2026-07-26 — one planning cycle per ~2 weeks, and the app is used *inside* a
   cycle (shop from the List tab, cook from the Cook tab, log the result). This project has an
   external clock that the kit board does not have, and it constrains *when* a change may ship
   as much as what is worth building.
2. **Verification legs only the user can walk.** Three of them, all documented:
   - the **installed PWA on the phone** — CONTRACT §1's "installed state" denominator and §5's
     "you may not claim it works on the phone unless you deployed and opened it there";
   - the **plugin install step** — `plugin-updates/README-INSTALL.md` (2026-07-11) records the
     precedent verbatim: *"Your installed plugin is read-only in this session, so I couldn't
     hot-edit it in place … copy each `SKILL.md` over the matching file … then update the
     plugin (Settings → Capabilities)."* Every Wave 1 task inherits this;
   - **the user's own judgment** — T3.1's brief says to ask whether the in-app "Heads up" card
     has actually fallen short; T1.1's out-of-scope says assigning images to the 52 backlog
     photos is "the user's curation call, not a code change".
3. **Shared mutable state that is the user's food data.** `app/seed.json` (1.1 MB, generated),
   `app/.thumb-cache.json` (950 KB), and the markdown library in the parent directory. README
   §Execution model names these as the reason sessions are sequential. This is live right now:
   the main checkout carries an **uncommitted** 21-line `seed.json` change including
   `servings: 8 → 4` on the active 2026-07-26 plan.
4. **Not scarce: agent capacity.** Five open tasks, four of which name `findings/T0.1.md` in
   `reads:`. There is no lane contention to schedule around because there is no concurrency to
   schedule. See §4 for the ceiling.

## 2. The score

Three value dimensions, each anchored 0–3. Every score cites a fact; a score that cannot cite
one is wrong.

### S — Pipeline integrity (silence exposure)

*Does this touch a path where the markdown → `seed.json` → app → phone chain can be wrong
without saying so?* This is the project's signature failure mode, which is why it carries the
heaviest weight.

- **3 · Wrong or stale data/code reaches the phone with nothing shown to say so.**
  Three paid-for instances: `app/sw.js` precaches every `app/js/*.js` under one `const CACHE`
  but `scripts/pre-commit` only fires on `app/index.html`, so a JS-only change "commits clean
  and ships silently stale" (GOTCHAS 2026-08-02); commit `04aabec` "Fix: offline sync falsely
  reports success against stale cache"; and CONTRACT §5's rule that a fresh IndexedDB is not
  evidence about a migration.
- **2 · Two halves of the system have diverged and nothing detects it.** Nothing on screen is
  wrong; a capability is simply dark. `app/build_seed.py` has parsed `thaw_hours_ahead`,
  `prep_ahead` and `image` since 2026-06-25, while `recipe-capture` never learned to write
  them — a divergence live for five weeks that has produced zero errors (T1.1's brief: "the
  pipeline is live and dark").
- **1 · The failure is loud and immediate.** `deploy.sh` refuses on a dirty checkout by design;
  `build_seed.py` fails outright when `MP_BASE_DIR` is unset in a worktree (GOTCHAS
  2026-08-02). Costs a session minutes, once, and is written down.
- **0 · No integrity surface.**

### K — Kitchen impact

*Does the user feel this while shopping or cooking?*

- **3 · Something is wrong on a screen used inside a live plan cycle, or the user works around a
  missing capability by hand.** ROADMAP #7 / T2.1: the grocery engine already splits 3–4 week
  plans per week, but the in-app suggester and builder cap at two, so a longer plan exists only
  if the user leaves the app and asks Claude for it.
- **2 · A screen used every cycle gets visibly better; nothing is currently wrong.** Commit
  `6285d79` "Add quick Log action for repeat cooks"; `b55ae88` fluid plan with lunch + dinner
  slots.
- **1 · An occasional surface, or the library-authoring half rather than the cooking half.**
  T1.2's backlog nudge: 52 photos in `recipe pics/` drain slowly either way, and the backlog
  screen already works.
- **0 · Invisible to the cook.** Contract prose, program plumbing, feasibility probes.

### L — Leverage (graph unblock)

Adopted from the kit; this board has a real graph.

- **3 · Unblocks ≥3 tasks, or freezes something ≥2 tasks are bound by.** T0.1: four of five open
  tasks name `findings/T0.1.md` in `reads:`, and CONTRACT.md is binding on all of them.
- **2 · Hard-unblocks 1–2 tasks, or settles one design a later task consumes.** T1.1 → T1.2
  (`reads: findings/T0.1.md, findings/T1.1.md`).
- **1 · Makes a family cheaper or safer without unblocking anything.** T2.1's deliverable
  explicitly includes writing the week-2-mirroring decision down "so the next session doesn't
  relitigate it".
- **0 · Leaf.**

### V = 3S + 2K + 2L  (max 21)

The weights are the policy, stated:

- **S at 3×** because every entry in README §"Anti-patterns already paid for" and both entries
  in GOTCHAS.md are silent-failure classes, and because CONTRACT §1's whole repo-state /
  installed-state split exists for no other reason than to stop a session claiming something
  the phone does not have. Silence is what makes this project pay twice.
- **K at 2×** because there is exactly one user and no second constituency — a change they never
  feel has nothing else to be worth. It is weighted below S deliberately: a felt papercut costs
  one annoyance, a silent staleness costs every future session's trust in the board.
- **L at 2×, equal to K,** because the graph is real but shallow — one hub (T0.1) and one chain
  (T1.1 → T1.2). Weighting L at 3× would let the hub swamp the ranking and dress a gate up as
  arithmetic. T0.1 goes first because of **G1**, not because it scores highest. It does not.

### Attributes that never buy rank

- **E — agent effort** (already a board field: low/medium/high). Used only to judge whether a
  session fits a sitting; never ordering.
- **H — human dependency**, scored 0–3 but deliberately **outside V**, because a task needing
  the user is not less valuable, it is differently *schedulable*:
  - **0** · an agent closes it alone on surfaces it can reach (repo-state claims only);
  - **1** · needs one bounded answer — a yes/no or a taste call;
  - **2** · needs the user to perform an install or a deploy before the claim can be made
    (`plugin-updates/README-INSTALL.md` for Wave 1; the phone for CONTRACT §1's installed state);
  - **3** · the deliverable *is* a user decision and the agent can only prepare it — T3.1,
    whose Starting Points say "**Ask the user first**: has the in-app Heads up actually fallen
    short? The gate depends on their answer."

## 3. Gates — non-scalar rules that override the ranking

**G1 · Freeze before build.** No Wave 1/2/3 task starts before CONTRACT.md is frozen at v1.0 by
T0.1. This is not a preference: BOARD.md's Wave 0 gate note states it, every open brief names
`findings/T0.1.md` in `reads:`, and a task that runs first is bound by a contract that can change
underneath it. *(Same shape as the kit's G2, different content: here the thing being decided is
the measurement contract itself.)*

**G2 · The cooking cycle is a scheduling constraint.** Plan cycles run ~2 weeks
(2026-06-22 → 07-12 → 07-26). A deploy-bearing change to the Plan, List or Cook screens ships
**between** cycles, never into the middle of one — the user shops and cooks from the installed
PWA, and a mid-cycle service-worker swap changes the tool in their hand while they are using it.
Any loop or session proposing a deploy must state where in the cycle it believes we are, from
the newest file in `meal-plans/`. **This gate has no analogue in the kit** — the kit board has no
external clock.

**G3 · Human-instrument gate.** A task with **H ≥ 2** is not kicked off until the user has agreed
to supply that leg. Otherwise the session runs to the wall of its own "Done when" and files an
INCONCLUSIVE finding — full cost, no verdict. Concretely: T1.1's Done-when requires the app to
render a thumbnail from a skill-captured recipe, which requires the plugin install step, which is
the user's hands and the Capabilities settings pane.

**G4 · The lane is the instrument, not the file.** Sequential by default (README §Execution
model, restated as binding in CONTRACT §10). Two sessions on disjoint files still collide if both
rebuild `seed.json` or serve the app. See §4 for the ceiling and the one legal pair.

**G5 · `app/seed.json` and `app/.thumb-cache.json` are never committed as a side effect.**
Generated, ~2 MB combined, and carrying the user's actual plan data. A `git add -A` — by a
session, a sweeper, or a merge — bundles the user's food data into an unrelated commit. Commit
`seed.json` only when regenerating it *is* the change, and say so in the message. Live evidence:
main currently carries 21 uncommitted lines of it.

**G6 · The stale-code guard is manual and must be treated as a gate.** Any change under
`app/js/` requires a hand-bumped `const CACHE` in `app/sw.js` (currently `mealplanner-v27`).
`scripts/pre-commit` only fires on `app/index.html`. This is a gate rather than a checklist item
because the failure is silent *and permanent* for an installed phone — nothing later recovers it.

**G7 · Re-rank on events, never on a timer.** Adopted from the kit's G5 verbatim in intent, and
it applies here for a stronger reason: with five tasks and one hub, nearly any re-rank is noise.
Re-rank when a task closes, an inbox item arrives, or the user answers a gate question — and
hold position otherwise. No ΔV threshold is specified because at this board size the ordering
below is stable under any plausible re-score; introduce one only if the board passes ~10 tasks.

**Waves stay honest.** Scoring runs across all open tasks; the output is an order, not a board
mutation. Wave membership is thematic and is never falsified to express urgency (the kit's T5.0
lesson, adopted). §5's cross-wave pull is expressed by which kickoff the user launches.

## 4. Lanes, surfaces, and the real parallelism ceiling

The contended resources, in the order they bind:

| surface | why it serializes | who holds it |
|---|---|---|
| `app/seed.json` + `.thumb-cache.json` | regenerated wholesale by `build_seed.py`; two rebuilds produce a file neither session measured | any task that verifies against real data |
| the running app (`meal-server.py` / browser pane) | CONTRACT §3's only instrument that proves user-visible behavior; one port, one launchd job | any task making a behavior claim |
| the parent markdown library | shared with the Claude-side skills and edited by the user between sessions | any task touching recipes/plans/inventory |
| the phone + Mac mini deploy | CONTRACT §1's installed state; `deploy.sh` refuses on a dirty checkout | one session at a time, human-mediated |

**Ceiling today: 1.** Four of five tasks are blocked behind T0.1, and T0.1 itself exercises every
surface in the table.

**Ceiling after T0.1: 2, and only for one specific pair.** T3.1 is a probe — it reads `sw.js`,
`pwa.js`, `manifest.webmanifest` and `SYNC-SETUP.md`, and never rebuilds the seed. It can run
alongside exactly one of T1.1 / T2.1. **T1.1 and T2.1 may never run concurrently**: both need
`build_seed.py` output *and* the running app, which is the whole of the contended set. T1.2 is
sequenced behind T1.1 by `reads:` regardless.

So: **file-lanes would report three free lanes here and be wrong.** That is the concrete reason
this framework does not inherit the kit's G4.

## 5. Worked scoring — every open task, 2026-08-03

Effort from the board rows. One load-bearing fact per row; H is scored but excluded from V (§2).

| Task | S | K | L | **V** | E | H | The fact the score rests on |
|---|---|---|---|---|---|---|---|
| **T2.1** extend suggester/builder past 2 weeks | 3 | 3 | 1 | **17** | high | 2 | Every file it touches is precached and `pre-commit` will not catch it (**G6**, S=3); a longer plan must not corrupt a 2-week plan already in IndexedDB (CONTRACT §5, S=3); user leaves the app today to get a 3-week plan although the grocery engine already splits them (ROADMAP #7, K=3); its mirroring decision is written down for later sessions (L=1) |
| **T0.1** verify + freeze the contract | 3 | 0 | 3 | **15** | high | 2 | Four tasks read it and CONTRACT is binding on all of them (L=3); §8's incantations are unverified and will be copy-pasted, and §1's denominator split is, in its own brief's words, plausible and unchecked — a session could ship a repo-state claim as an installed-state one and nothing would catch it (S=3); invisible to the cook (K=0) |
| **T1.1** teach `recipe-capture` the v2 keys | 2 | 1 | 2 | **12** | medium | 2 | `build_seed.py` has parsed the three keys since 2026-06-25 while capture never learned to write them — five weeks of silent divergence, no error (S=2); unblocks T1.2 (L=2); the cook sees a thumbnail and a thaw reminder on newly captured recipes only (K=1) |
| **T1.2** backlog nudge in `meal-planner` | 0 | 1 | 0 | **2** | medium | 2 | Purely additive — nothing drifts and nothing is wrong (S=0); leaf, nothing reads it (L=0); drains 52 photos the backlog screen already displays well (K=1) |
| **T3.1** iOS push feasibility probe | 0 | 0 | 1 | **2** | medium | **3** | Its deliverable is a recommendation, not a change (S=0, K=0); a "close" verdict retires ROADMAP #9 for good (L=1); its wave gate and its Starting Points both make the user's answer the precondition (H=3) |

### What the scores say that the board's order does not

**The wave order and the value order disagree, and the disagreement is real.** BOARD.md runs
Wave 1 (T1.1, T1.2) before Wave 2 (T2.1); scoring puts **T2.1 second overall and T1.2 last**.
The pull is expressed here and by which kickoff is launched — **not** by moving a row between
waves (§3, waves stay honest).

**Proposed order, after gates:**

1. **T0.1** — G1 makes it first regardless of V. It is also the `reads:` dependency of every
   other row, so the ordering question below it does not arise until it lands.
2. **T2.1** — highest V, and the only row where something the user does today is worse than it
   needs to be. H=2 (needs a deploy + a phone check to claim installed state).
3. **T1.1** — G3 applies: confirm the user will do the `plugin-updates/` install before kicking
   it off, or scope its "Done when" down to a patch spec plus a repo-state claim, in the brief,
   before the session starts.
4. **T1.2** — genuinely last. V=2, leaf, purely additive. Reasonable to defer indefinitely.
5. **T3.1** — do not open at all until the user answers its gate question. If the in-app "Heads
   up" card has not fallen short in real use, the correct outcome is to close ROADMAP #9 without
   spending a session, which the brief already blesses as a complete result.

**Cheapest honest next step:** T0.1's kickoff prompt is already written and current in
KICKOFF.md. Nothing in this framework changes it.

## 6. Re-derivation

Every number above traces to one of: BOARD.md's rows, a brief in `tasks/`, GOTCHAS.md, a git
commit named by hash, a file mtime in the parent library, or `plugin-updates/README-INSTALL.md`.
No score rests on a judgment that is not written down somewhere a later session can check. When
T0.1's findings land, re-score S for T2.1 and T1.1 first — the contract freeze is the event most
likely to move them.
