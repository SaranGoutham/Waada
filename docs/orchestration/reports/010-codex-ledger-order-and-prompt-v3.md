WORKER REPORT: card 010, M05
Status: partial
Commits: none
Files changed: packages/core/src/agent/ledger.ts; packages/core/src/agent/prompts.ts; packages/core/test/agent-ledger.test.ts; docs/decisions/llm/prompts/v3-ledger.md; docs/decisions/llm/task-routing.md; docs/reports/m05-agent-core.md
Checks: packages/core/node_modules/.bin/vitest.cmd run packages/core/test/agent-ledger.test.ts → 6 passed; packages/core/node_modules/.bin/vitest.cmd run → 146 passed, 1 unrelated failure (`ingest-parse-files.test.ts`, sandbox EPERM writing `.waada/crm`); node node_modules/@biomejs/biome/bin/biome check <changed files> → clean; packages/core/node_modules/.bin/tsc.cmd --noEmit → clean; git diff --check → clean
Dependencies: M05 ledger/prompt implementation → available; local Vitest/TypeScript/Biome → available; `.waada` atomic-write filesystem access for unrelated ingest test → missing in sandbox
Blocked: Full core test acceptance is blocked by the sandbox denying the unrelated CRM fixture write; no code outside this card was changed.
Unverified: Live ledger/eval run intentionally not performed (no network).
Notes for master: Open commitments now sort newest-first with undated items last; ledger extraction remains one pass and uses temperature 0. Prompt v3 excludes ongoing service levels, merges duplicate deliverables, and requires explicit later-delivery or absence evidence.

---
**Master verification (2026-09-27):** the one failing test in Codex's run was its sandbox (EPERM writing `.waada/crm`). Outside the sandbox: `pnpm check` passes; `pnpm test` 147 core + 4 web green. Committed 300d20c. Live eval run by the master.
