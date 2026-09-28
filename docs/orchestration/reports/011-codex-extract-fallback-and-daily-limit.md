WORKER REPORT: card 011, M02
Status: done
Commits: none
Files changed: docs/decisions/llm/providers.md; docs/reports/m02-llm-core.md; packages/core/src/llm/extract.ts; packages/core/src/llm/index.ts; packages/core/src/llm/retry.ts; packages/core/test/llm.extract.test.ts; packages/core/test/llm.retry.test.ts; packages/core/test/llm.runtime.test.ts
Checks: targeted Vitest → 29 passed; Biome check → clean; `tsc --noEmit` → clean; full core suite → 153 passed, 1 sandbox-only EPERM writing `.waada/crm/acme.json.*.tmp`
Dependencies: AI SDK / Groq provider types → available; network/live services → intentionally not used
Blocked: none
Unverified: `// VERIFY:` Groq’s public adapter schema does not yet declare `json_validate_failed`; code handles SDK data/body code plus exact message fallback.
Notes for master: No commit made as instructed. Long 429s now skip sleeping and allow model fallback; chat and extraction show the safe Groq daily-limit message after final failure.

---
**Master verification (2026-09-28):** Codex lost its own connection to OpenAI for ~10 minutes mid-card, then finished. Outside the sandbox: `pnpm check` passes; `pnpm test` all green. Committed as the m02 commit above.
