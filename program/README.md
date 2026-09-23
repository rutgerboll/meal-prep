# Meal Planner app — task guide

The app and its task history belong to this project. Kit's task service was
retired on 2026-09-23. Use the files here directly; no task command, generated
board, central inbox, or scheduled Kit routine is required.

## Start a task

1. Read `../CLAUDE.md`, `CONTRACT.md`, and `TASKS.md`.
2. Read `tasks/<ID>.md`, its cited findings, and relevant `knowledge/` notes.
   Briefs written before 2026-09-23 contain old Kit workflow instructions and
   dated measurements. Follow this guide for workflow and verify the facts.
3. Check `git status`, current app behavior, and relevant library data. This
   repo is the Mac mini's live serving directory; isolate app code experiments
   in a worktree or on a spare server port.
4. Work one task at a time when it touches the seed, server, or shared library.
   Coordinate before editing a file another active worktree may own.

## Finish a task

Write the result in `findings/<ID>.md` using `CONTRACT.md`'s evidence standard.
Update the row in `TASKS.md` to `done`, `deferred`, or `blocked`, with a short
result and a findings link. Add durable app lessons to `knowledge/` or
`GOTCHAS.md`. Review the diff and verify the relevant app state before making
any claim about the phone. The archived `LOG.md` and `INBOX.md` are history; do
not append to them.

For a new task, add a brief in `tasks/` and a row in `TASKS.md`. Use a unique ID,
state the outcome, files in scope, dependencies, and a concrete way to check it.
Captured feedback in `feedback-inbox-*.jsonl` is **app data** and is processed
by `app/apply-feedback.py`; it is unrelated to the retired task inbox.

## History

`archive/kit-control-plane-2026-09-23/` preserves the last generated board,
task inbox, log, original contract, kickoff prompts, and proposed management
loops. Task briefs, findings, `STATE.md`, and app knowledge remain readable in
place. The archive records past claims; current status comes from the files and
running app checked today.
