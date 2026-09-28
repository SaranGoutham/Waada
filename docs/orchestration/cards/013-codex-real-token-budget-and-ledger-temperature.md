# Card 013 — Codex — M02 + M05: realistic token budget; ledger back to default temperature; log which model answered

**Worker:** Codex · **Modules:** M02 (`budget.ts`, logging), M05 (`ledger.ts`) · **Issued by:** master, 2026-09-28

## Goal
Fix the two causes the master measured in eval run D (`docs/decisions/llm/evals.md`), and make the next run show which model answered.

## Facts (run D)
- `ask` on `openai/gpt-oss-20b`: **413** `Requested 8517 > Limit 8000 TPM` although card 012 capped its prompt to `MAX_PROMPT_CHARS` (20,000 chars, "≈ 5,000 tokens" by chars/4). The chars/4 estimate undercounts what Groq counts for these models.
- Ledger `extract`: `json_validate_failed` on both structured attempts, then invalid plain JSON. It last worked in run A, **before** card 010 set `temperature: 0`. Since then the primary model's daily tokens also ran out, so calls may be answered by `gpt-oss-20b`. Nothing logs which model answered.

## Files you may change
`packages/core/src/llm/{budget,extract,index}.ts`, `packages/core/src/agent/ledger.ts`, `packages/core/test/llm*.test.ts`, `packages/core/test/agent-ledger.test.ts`, `docs/decisions/llm/task-routing.md`, `docs/reports/m02-llm-core.md`, `docs/reports/m05-agent-core.md`.
**Don't touch:** `prompts.ts`, `ingest/`, `apps/`, `AGENTS.md`, `docs/PROGRESS.md`, `.env`, `package.json`, `pnpm-lock.yaml`.

## Steps (TDD, fakes only)
1. **Budget:** lower the per-request input budget so the worst case measured (20,000 chars → 8,517 requested tokens, i.e. about **2.35 chars per requested token**) lands well under 8,000: e.g. `CHARS_PER_TOKEN = 2.5` and `MAX_INPUT_TOKENS = 5,000` (→ 12,500 chars), or equivalent. Document the measurement in `budget.ts` and `task-routing.md`. Everything that already uses the budget (ledger, landmines, brief, summary baseline, ask) follows automatically; update tests that assert the old numbers.
2. **Ledger temperature:** remove `temperature: 0` from the ledger extract (back to the provider default, as in run A). Note in `task-routing.md` why.
3. **Which model answered:** `chat` and `extract` log at `info` the model id that produced the final result, and at `warn` when they fall back to the second model (model ids only; no content, no keys).

## Acceptance
- `npx pnpm@12.6.0 --filter @waada/core test` → green (sandbox-only EPERM on `.waada/` is OK; say so)
- `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root → clean
- `tsc --noEmit` in `packages/core` → clean

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
