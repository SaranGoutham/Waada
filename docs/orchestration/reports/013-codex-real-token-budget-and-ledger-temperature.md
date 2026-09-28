WORKER REPORT: card 013, M02 + M05
Status: done
Commits: none
Files changed: docs/decisions/llm/task-routing.md; docs/reports/m02-llm-core.md; docs/reports/m05-agent-core.md; packages/core/src/agent/ledger.ts; packages/core/src/llm/budget.ts; packages/core/src/llm/extract.ts; packages/core/src/llm/index.ts; packages/core/test/agent-ledger.test.ts; packages/core/test/llm.budget.test.ts; packages/core/test/llm.extract.test.ts; packages/core/test/llm.runtime.test.ts
Checks: `pnpm --filter @waada/core test` → 21 files, 155 tests passed; `node node_modules/@biomejs/biome/bin/biome check <changed TS files>` → clean; `pnpm --filter @waada/core exec tsc --noEmit` → clean; `git diff --check` → clean
Dependencies: @waada/core test tooling → available; local pnpm 12.6.0 → available
Blocked: none
Unverified: none
Notes for master: No live/network calls made. `npx pnpm@12.6.0` stalled in the sandbox; the installed `pnpm --version` reported 12.6.0, and was used for verification.

---
**Master verification (2026-09-28):** `pnpm check` passes; `pnpm test` all green. Committed.
