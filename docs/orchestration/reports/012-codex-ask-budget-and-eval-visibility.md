WORKER REPORT: card 012, M05 + M02
Status: done
Commits: none
Files changed: docs/reports/m05-agent-core.md
packages/core/src/agent/ask.ts
packages/core/src/llm/extract.ts
packages/core/test/agent-ask.test.ts
packages/core/test/agent.eval.live.test.ts
packages/core/test/llm.extract.test.ts
Checks: packages/core/node_modules/.bin/vitest.cmd run test/agent-ask.test.ts test/llm.extract.test.ts → 13 passed
packages/core/node_modules/.bin/vitest.cmd run → 154 passed; 1 unrelated sandbox EPERM writing `.waada/crm/acme.json`
node node_modules/@biomejs/biome/bin/biome check <changed files> → clean
npx tsc --noEmit in packages/core → clean
Dependencies: M02/M05 core modules → available
pnpm 12.6.0 → missing locally; `npx pnpm@12.6.0` could not run offline because it attempted registry access
Blocked: none
Unverified: Live eval and `.waada/eval/last-run.json` output were not run, per no-network instruction.
Notes for master: Ask now keeps relevance-ranked evidence within `MAX_PROMPT_CHARS`; extract warning includes capped, safe per-attempt reasons; live eval persists scorecard plus a 200-character-per-item ledger view to the original configured data directory.

---
**Master verification (2026-09-28):** extract logging holds only field paths/codes, never content or keys. `pnpm check` passes; `pnpm test` all green.
