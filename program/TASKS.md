# Meal Planner app — task snapshot

This is a human maintained snapshot based on the last Kit board (2026-08-31).
The status of unstarted work needs rechecking before execution. Task briefs
contain historical estimates and may include retired Kit commands; use
`README.md` for the current process.

| ID | Status | Work | Result or next check |
| --- | --- | --- | --- |
| T0.1 | done | Verify app build contract | [Finding](findings/T0.1.md) |
| T0.2 | done | Guard cached JS and check server health by request | [Finding](findings/T0.2.md) |
| T0.3 | open | Refresh inline bootstrap seed | Recheck drift against today's library first. |
| T0.4 | open | Add a useful app smoke suite | Retain tests; retired Kit orchestration setup is out of scope. |
| T0.5 | open | Audit current UI conventions | Recheck the current app and current guidance. |
| T0.6 | open | Assess JS, parser, sync, and migration structure | Use existing [proposal](../knowledge/structure-proposal.md) as historical evidence. |
| T0.7 | done | Extract CSS | [Finding](findings/T0.7.md) |
| T0.8 | done | Remove duplicate tokens | [Finding](findings/T0.8.md) |
| T0.9 | done | Settle design system document | [Finding](findings/T0.9.md) |
| T0.10 | done | Untrack generated seed artifacts | [Finding](findings/T0.10.md) |
| T0.11 | deferred | Directory move | [No-go finding](findings/T0.11.md) |
| T0.12 | done | Host heading font locally | [Finding](findings/T0.12.md) |
| T0.13 | open | Rename CSS files | Last board row has no task brief; write one before starting. |
| T0.14 | open | Separate development and served directories | Reassess current launchd and Git setup; [brief](tasks/T0.14.md) has stale gate text. |
| T1.1 | open | Update recipe-capture schema support | Check current skill version and recipe schema. |
| T1.2 | open | Prompt for uncaptured cookbook photos | Depends on T1.1. |
| T2.1 | open | Extend planner beyond two weeks | Recheck plan behavior and brief. |
| T3.1 | open | Assess iOS PWA reminders | Gate on real need and current platform support. |

Open work is a backlog, not a commitment or an order to deploy. Historical
Kit-generated statuses and claims are in
`archive/kit-control-plane-2026-09-23/BOARD.md`.
