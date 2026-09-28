WORKER REPORT: card 014, M00/M05/M01
Status: done
Commits:
  dd6bcb7 m05: overdue-first ledger with dueDate, chunked extract pass, v4 prompt
  0973c0e m01: retry transient Hindsight failures twice with injectable sleep
Files changed:
  packages/core/src/models.ts (Commitment.dueDate only)
  packages/core/src/agent/ledger.ts (overdue-first sort + injectable now, chunked pass, mergeCommitments)
  packages/core/src/agent/evidence.ts (chunkEvidence, MAX_LEDGER_CHUNKS)
  packages/core/src/agent/prompts.ts (PROMPT_VERSION v4, dueDate rule, brief due-date display)
  packages/core/test/foundation.test.ts, agent-ledger.test.ts, agent-evidence.test.ts, agent-brief.test.ts, memory.test.ts
  docs/decisions/llm/prompts/v4-ledger.md (new), docs/decisions/llm/task-routing.md
  docs/reports/m05-agent-core.md, docs/reports/m01-memory.md
Checks:
  npx pnpm@12.6.0 --filter @waada/core test → 21 files, 172 tests, all pass
  npx pnpm@12.6.0 check → passes (Biome + every package typecheck; apps/web has no typecheck script so it was not typechecked)
Dependencies: none missing (fakes only, no network; no live run per card step 6)
Blocked: none
Unverified: none (no // VERIFY: added; Groq strict-output acceptance of required-but-nullable dueDate is for the master's live eval to confirm)
Notes for master:
  - commitmentLedger gained an optional 3rd param `now` (additive; brief.ts and all old callers unchanged). Overdue = dueDate < now; due == now counts as upcoming.
  - FakeLLM per-name extract queues made chunk tests deterministic; a real-model caveat for the eval: chunk extracts each return structured lists, merged by normalised text + madeTo with delivered-wins.
  - apps/web/src/lib/fake-agent.ts builds a Commitment literal WITHOUT dueDate (Codex's uncommitted card-015 work also touches that file). It will fail tsc/build when card 015 typechecks — suggest Codex add `dueDate: "2026-09-12T00:00:00.000Z"` (matches its "by Friday, Sep 12" text) and optionally render it via commitmentRow. I did not touch apps/.
  - Did not push; Codex's apps/ changes are still uncommitted in the shared tree.

---
**Master verification (2026-09-28):** commits dd6bcb7, 0973c0e; root check passes; 172 core + 4 web green. Live eval pending (master, spare key).
