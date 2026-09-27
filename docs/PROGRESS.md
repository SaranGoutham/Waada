# Progress Board

One row per module. **Each agent edits only its own row** (AGENTS.md §4). All work happens on branch `dev`. Status values: `not started` · `planning` · `in progress` · `blocked` · `review` · `done`.

| Module | Owner (agent) | Status | Plan | Note (one line, latest first) | Updated |
|---|---|---|---|---|---|
| M00 Foundation | Claude Code | done | [plan](superpowers/plans/2026-09-27-m00-foundation.md) | done; report docs/reports/m00-foundation.md. Human: install pnpm 12 globally (corepack on Node 22.15 fails) | 2026-09-27 |
| M01 Memory | Claude Code | review | [plan](superpowers/plans/2026-09-27-m01-memory.md) | Memory over Hindsight 0.10.1 done; 19 unit + 2 live tests (Hindsight Cloud) pass; [report](reports/m01-memory.md) | 2026-09-27 |
| M02 LLM core | Codex | review | [plan](superpowers/plans/2026-09-27-m02-llm-core.md) | 21 focused tests + `pnpm check` pass; full suite 87 pass, 1 fail = M00 stale createLLM stub assertion (theirs); live skips, no Groq key; [report](reports/m02-llm-core.md) | 2026-09-27 |
| M02b LLM sign-in | Claude Code | planning | — | ChatGPT login researched; P-004 awaits human; spec+plan next, no code until wave 2 opens (needs M02 done, M06 web app) | 2026-09-27 |
| M03 Ingest | OpenCode | review | [plan](superpowers/plans/2026-09-27-m03-ingest.md) | pipeline+4 parsers done, 20 tests green, seed 33/33 no errors; [report](reports/m03-ingest.md); other-module note: foundation public-index test fails at createLLM stub assertion (M02 mid-work, theirs) | 2026-09-27 |
| M04 Synthetic data | OpenCode | review | [plan](superpowers/plans/2026-09-27-m04-synthetic-data.md) | 33 Acme + 6 Nova interactions done, verified; [report](reports/m04-synthetic-data.md); needs human data review | 2026-09-27 |
| M05 Agent core | OpenCode (next) | not started | — | reserved 2026-09-27 after M03 review | 2026-09-27 |
| M06 Web app | — | not started | — | — | — |
| M07 MCP server | — | not started | — | — | — |
| M08a Slack connector | — | not started | — | — | — |
| M08b Gmail connector | — | not started | — | — | — |
| M08c HubSpot connector | — | not started | — | — | — |
| M09 Live capture | — | not started | — | — | — |
| M10 Integration & docs | — | not started | — | — | — |
