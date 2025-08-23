# AI Dev Agent (Lean & Repo-Agnostic)

A tiny CLI + GitHub Action that runs four jobs against a **target repo**:
- **J1**: Ingest Vercel logs → `/roadmap/bugs.md`
- **J2**: Quick repo review → `/roadmap/bugs.md` & `/roadmap/new.md`
- **J3**: Sync & prioritize → `/roadmap/tasks.md` (and clean entries from `bugs.md`/`new.md`)
- **J4**: Implement top task → code + 1 test; append to `/roadmap/done.md`

The **target repo** owns the schedule and secrets. This repo stays **100% agnostic**.

## Usage (local)
```bash
npm i
OPENAI_API_KEY=... GITHUB_TOKEN=... node cli.js run --job J2 --dir ../featuremachine
Environment (supplied by the caller)
OPENAI_API_KEY (required for J2–J4; optional for J1)
GITHUB_TOKEN (PRs)
VERCEL_TOKEN, VERCEL_PROJECT_ID (optional; J1 logs ingest)
Optional: TARGET_BRANCH (default main)
Guardrails (hard limits)
≤ 5 files changed per PR
≤ 300 LoC delta per PR
Always PR (no direct pushes)
Abort if verify fails
See agents.md for principles and loop.
