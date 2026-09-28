# Progress Board

**Maintained by the master (Claude Code) only** (AGENTS.md §4a). Workers report; they don't edit this file. All work happens on branch `dev`. Plain-language history: [orchestration/LOG.md](orchestration/LOG.md). Status values: `not started` · `planning` · `in progress` · `blocked` · `review` · `done`.

| Module | Worker | Status | Plan | Note (one line, latest first) | Updated |
|---|---|---|---|---|---|
| M00 Foundation | Claude Code | done | [plan](superpowers/plans/2026-09-27-m00-foundation.md) | done; report docs/reports/m00-foundation.md. Human: install pnpm 12 globally (corepack on Node 22.15 fails) | 2026-09-27 |
| M01 Memory | Claude Code | review | [plan](superpowers/plans/2026-09-27-m01-memory.md) | Memory over Hindsight 0.10.1 done; 19 unit + 2 live tests (Hindsight Cloud) pass; [report](reports/m01-memory.md) | 2026-09-27 |
| M02 LLM core | Codex | review | [plan](superpowers/plans/2026-09-27-m02-llm-core.md) | cards 006/011/013: fallback gpt-oss-20b; extract repairs invalid-JSON 400s + falls back; plain daily-limit message; budget 2.5 chars/token (7b1cdbf) | 2026-09-28 |
| M02b LLM sign-in | Claude Code | not started | — | paused: should-have tier (§1a), opens after M10 MVP checks; ChatGPT deferred (ADR 0001); approved design in [handoff](handoffs/m02b-2026-09-27-1700.md) | 2026-09-27 |
| M03 Ingest | OpenCode | review | [plan](superpowers/plans/2026-09-27-m03-ingest.md) | card 009 + master fix: saves imported interactions and crm.json; Slack channel names; transcript metadata works live (required-nullable schema, year inferred) | 2026-09-28 |
| M04 Synthetic data | OpenCode | review | [plan](superpowers/plans/2026-09-27-m04-synthetic-data.md) | 33 Acme + 6 Nova interactions done, verified; [report](reports/m04-synthetic-data.md); needs human data review | 2026-09-27 |
| M05 Agent core | OpenCode | in progress | [plan](superpowers/plans/2026-09-27-m05-agent-core.md) | cards 008/010/012/013: ledger v3, newest open first, ask capped, eval writes .waada/eval/last-run.json; live eval 3/6 under degraded conditions (daily cap); summary baseline scored higher in run D (evals.md) | 2026-09-28 |
| M06 Web app | Codex | in progress | [plan](superpowers/plans/2026-09-27-m06-web-app.md) | master browser run: Test OK, import 33/33, Brief, Ask work on real data; Compare baselines fixed in code (card 009), not yet re-checked in browser | 2026-09-28 |
| M07 MCP server | — | not started | — | — | — |
| M08a Slack connector | — | not started | — | — | — |
| M08b Gmail connector | — | not started | — | — | — |
| M08c HubSpot connector | — | not started | — | — | — |
| M09 Live capture | — | not started | — | — | — |
| M10 Integration & docs | Claude Code (master) | in progress | — | step 1 only: e2e.live.test.ts committed (03f7500); not yet run: needs a Groq key | 2026-09-27 |
