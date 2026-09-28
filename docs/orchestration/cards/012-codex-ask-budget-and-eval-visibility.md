# Card 012 — Codex — M05 + M02: cap Ask's prompt; log why extract fails; eval writes its results to a file

**Worker:** Codex · **Modules:** M05 (`ask`, eval harness), M02 (`extract` logging) · **Issued by:** master, 2026-09-28

## Goal
Three small fixes from the master's live eval run C (`docs/decisions/llm/evals.md`, "runs A–C"), so the next live run is both more robust and readable.

## Read first
`AGENTS.md` (§2, §3, §4a), `docs/decisions/llm/evals.md` (runs A–C), `packages/core/src/agent/ask.ts`, `packages/core/src/llm/{budget,extract}.ts`, `packages/core/test/agent.eval.live.test.ts`.

## Facts from run C
- `ask`: primary model failed, then fallback `openai/gpt-oss-20b` returned **413**: "Requested 9252 > Limit 8000 tokens per minute". Ask's recall evidence is not capped to `MAX_PROMPT_CHARS` (card 007 capped ledger, landmines, brief and the summary baseline, not ask).
- The ledger `extract` returned `null` twice ("LLM structured extraction returned no valid object"): all three attempts failed validation, and **nothing says why**.
- Live mode suppresses console output, so the eval's scorecard and the ledger it judged are invisible.

## Files you may change
`packages/core/src/agent/ask.ts`, `packages/core/src/llm/extract.ts`, `packages/core/test/agent-ask.test.ts` (or the existing ask test file), `packages/core/test/llm.extract.test.ts`, `packages/core/test/agent.eval.live.test.ts`, `docs/reports/m05-agent-core.md`.
**Don't touch:** `ledger.ts`, `prompts.ts`, `ingest/`, `apps/`, `AGENTS.md`, `docs/PROGRESS.md`, `.env`, `package.json`, `pnpm-lock.yaml`.

## Steps (TDD, fakes only)
1. **Ask budget:** cap the evidence `ask` sends so system + user stays within `MAX_PROMPT_CHARS` (reuse `llm/budget.ts`; keep the most relevant hits first as today). Unit test with a large fake recall.
2. **Why extract failed:** when `extract` gives up, the `log.warn` includes, per attempt, a short **validation reason** (Zod issue paths and codes, or the provider error code), capped at ~300 characters. **Never** the prompt, the model's output text or any key.
3. **Eval output file:** `agent.eval.live.test.ts` writes a JSON file with the per-check results for Waada, summary-only and CRM-only, plus the ledger it judged (status, date, text; evidence cut to 200 chars) to `<WAADA_DATA_DIR or .waada>/eval/last-run.json` (gitignored). Use `writeJson` from `store.ts`.

## Acceptance
- `npx pnpm@12.6.0 --filter @waada/core test` → green (sandbox-only EPERM on `.waada/` is OK; say so)
- `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root → clean
- `tsc --noEmit` in `packages/core` → clean

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
