# Progress Board

One row per module. **Each agent edits only its own row** (AGENTS.md §4). All work happens on branch `dev`. Status values: `not started` · `planning` · `in progress` · `blocked` · `review` · `done`.

| Module | Owner (agent) | Status | Plan | Note (one line, latest first) | Updated |
|---|---|---|---|---|---|
| M00 Foundation | Claude Code | done | [plan](superpowers/plans/2026-09-27-m00-foundation.md) | done; report docs/reports/m00-foundation.md. Human: install pnpm 12 globally (corepack on Node 22.15 fails) | 2026-09-27 |
| M01 Memory | Claude Code | planning | [plan](superpowers/plans/2026-09-27-m01-memory.md) | checkpoint → see docs/handoffs/m01-2026-09-27-1159.md; spec+plan approved, next: Task 1 (native execution) | 2026-09-27 |
| M02 LLM core | Codex | in progress | [plan](superpowers/plans/2026-09-27-m02-llm-core.md) | M00 contracts and installed AI SDK 7.0.116 verified; settings implementation underway. | 2026-09-27 |
| M02b LLM sign-in | — | not started | — | — | — |
| M03 Ingest | OpenCode | review | [plan](superpowers/plans/2026-09-27-m03-ingest.md) | pipeline+4 parsers done, 20 tests green, seed 33/33 no errors; [report](reports/m03-ingest.md); other-module note: foundation public-index test fails at createLLM stub assertion (M02 mid-work, theirs) | 2026-09-27 |
| M04 Synthetic data | OpenCode | review | [plan](superpowers/plans/2026-09-27-m04-synthetic-data.md) | 33 Acme + 6 Nova interactions done, verified; [report](reports/m04-synthetic-data.md); needs human data review | 2026-09-27 |
| M05 Agent core | — | not started | — | — | — |
| M06 Web app | — | not started | — | — | — |
| M07 MCP server | — | not started | — | — | — |
| M08a Slack connector | — | not started | — | — | — |
| M08b Gmail connector | — | not started | — | — | — |
| M08c HubSpot connector | — | not started | — | — | — |
| M09 Live capture | — | not started | — | — | — |
| M10 Integration & docs | — | not started | — | — | — |
