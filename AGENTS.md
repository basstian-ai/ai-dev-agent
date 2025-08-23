# Principles & Loop

**North Star**: Always deployable, roadmap-driven progress, minimal diffs, repo-agnostic. (Matches product vision.)  
**One patch per run.** Keep code lean; no bloat; test where possible.  
**No scheduling here** — the target repo controls cadence via workflows.

## Loop (per job)
1) Read signals (files under `--dir`, optional CI/logs via adapters).
2) Plan a tiny, safe change (≤5 files, ≤300 LoC).
3) Apply in a temp branch, run verify (lightweight).
4) Open a PR with a clear summary (files/LoC/tests).
5) If nothing to do → no-op.

## Jobs
- **J1**: Logs→Bugs (unprioritized; dedupe)
- **J2**: Review→Bugs & New (no duplicates across `bugs/new/done/tasks`)
- **J3**: Sync→Tasks (create tasks from bugs/new; delete moved items; prioritize 1..N ≤100)
- **J4**: Implement Top Task (write code + ≥1 test; update `done.md`)

## Adapters
- `github`: branch/commit/PR
- `vercel`: build/runtime logs (no-op if tokens missing)
