WORKER REPORT: card 008, M05
Status: done
Commits: none
Files changed: docs/decisions/llm/evals.md; docs/decisions/llm/task-routing.md; docs/decisions/llm/prompts/v2-brief.md; docs/decisions/llm/prompts/v2-ledger.md; docs/reports/m05-agent-core.md; packages/core/src/agent/brief.ts; packages/core/src/agent/prompts.ts; packages/core/test/agent-brief.test.ts; packages/core/test/agent-ledger.test.ts; packages/core/test/agent.eval.live.test.ts
Checks: `npx pnpm@12.6.0 --filter @waada/core test` → passed; `npx pnpm@12.6.0 check` → passed; `node node_modules/@biomejs/biome/bin/biome check <changed files>` → passed
Dependencies: M01 Memory / M02 LLM contracts and FakeMemory/FakeLLM → available
Blocked: none
Unverified: none
Notes for master: Ledger prompt v2 adds general commitment boundaries and late-but-completed delivery rules. Brief now supplies only open commitments in ledger order and retains newest recent-change evidence. EVAL-2 now identifies the delivered pricing proposal specifically. No live run was performed; run the live eval and append the Waada/summary/CRM scorecard to `evals.md`.

---
**Master verification (2026-09-27):** prompts use general rules only (no Acme names/facts). Root `pnpm check` passes; `pnpm test` 144 core + 4 web green. Committed 9860d44. Live eval run by the master (Codex sandbox has no network); results in `docs/decisions/llm/evals.md`.
