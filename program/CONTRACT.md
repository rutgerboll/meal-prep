# Meal Planner app — working agreement

**Current workflow since 2026-09-23.** The previous frozen contract is preserved
at `archive/kit-control-plane-2026-09-23/CONTRACT.md` for task citations and
historical evidence. This shorter agreement carries forward the app specific
verification rules without Kit commands. Check dated claims against reality.

## 1. What a task delivers

A code change, a committed change, a running server, and an installed phone are
different states. Name the state you checked. The Mac mini currently serves the
`app-build/app` working tree. `/sync.json` rebuilds from the parent markdown
library, while the installed PWA's app shell changes only after the service
worker cache version changes and the client updates. The inline `const SEED` is
the bootstrap before the first successful sync.

## 2. Scope and data

The app code is in `app/`; the user's recipe and plan library is in the parent
directory. `app/seed.json` and `.thumb-cache.json` are generated. Rebuild the
seed from current library files before judging data drift. The separate Claude
skills may need their own update when a schema changes; see
`../../plugin-updates/README-INSTALL.md`.

## 3. Verify with the right instrument

- Check a real app path and `/sync.json`, not only whether port 8765 is open.
- For app behavior, use a running app and inspect errors, IndexedDB, and service
  worker cache state as the change requires. A source diff alone is a hypothesis.
- For data, compare a fresh seed with the markdown source and the app's result.
- Prefer a separate test server on another port for experiments. Stop only that
  process; never use a broad `pkill` against `meal-server.py`.
- The current production service was observed running under launchd on
  2026-09-23, with HTTP 200 for `/index.html` and `/sync.json`. Recheck before
  relying on that observation. The August Full Disk Access diagnosis is history.

## 4. Evidence and claims

Use two independent comparisons for a confident behavior verdict when feasible,
such as source plus running behavior, or before and after across different inputs.
Name the input, environment, observed result, and remaining limit. Claim phone
behavior only after checking the installed phone. For a migration, test an
existing database; a fresh install is not enough.

## 5. Findings

For substantive tasks, write `findings/<ID>.md` with: scope; what changed;
evidence; state checked (source, working tree, library, running app, or installed
phone); what could break; and next action. Keep product decisions and measured
results explicit. Update `TASKS.md` manually.

## 6. Release care

The live app uses cached assets. Bump `const CACHE` in `app/sw.js` when changing
cached code or styles, review the pre-commit guard, and verify the new version
loads. `app/deploy.sh` pulls and restarts the server, but because the working
tree is currently served directly, even an uncommitted edit can become live.
Task `T0.14` records the proposed separation of development and deployment.
