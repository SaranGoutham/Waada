# Card 006 — OpenCode — M02: Groq fallback becomes `openai/gpt-oss-20b`; fix e2e parseFiles

**Worker:** OpenCode (run after card 005 is done and pushed) · **Module:** M02 (+ one line in M10's e2e test) · **Issued by:** master, 2026-09-27

## Goal
Groq no longer offers `qwen/qwen3-32b` (404). The human decided (P-005) that the Groq fallback is **`openai/gpt-oss-20b`**. Change the default and every code/test reference. Also fix the e2e test bug card 005 found.

## Files you may change
`packages/core/src/llm/settings.ts`, `packages/core/src/llm/providers.ts`, `packages/core/test/foundation.test.ts`, `packages/core/test/llm*.test.ts`, `packages/core/test/e2e.live.test.ts`, `packages/core/test/agent.eval.live.test.ts` (fallback id only), `docs/decisions/llm/task-routing.md`, `docs/decisions/llm/providers.md`, `docs/superpowers/specs/2026-09-27-m02-llm-core-design.md` (fallback row only), `tasks/M02-llm-core.md` (defaults line only).
**Don't touch:** `AGENTS.md` (the human updates §5), `apps/**`, `package.json`, `pnpm-lock.yaml`, `docs/PROGRESS.md`, `.env`, old Python-era docs (README, SETUP, WORKFLOW, SOLUTION_DESIGN, ARCHITECTURE: M10 rewrites them).

## Steps
1. Default `fallbackModel` → `openai/gpt-oss-20b`; `suggestedModels` for Groq → `["openai/gpt-oss-120b", "openai/gpt-oss-20b"]`. Update the tests that assert the old id (test first).
2. Replace `qwen/qwen3-32b` in the two live tests and the listed docs.
3. `e2e.live.test.ts`: `parseFiles` is called without `{ llm }`, so the two headerless transcripts fall back to filename/current time. Pass the LLM the same way `agent.eval.live.test.ts` does.
4. Existing `.waada/llm.json` files that still say `qwen/qwen3-32b` keep that value (user data); don't migrate. Note this in your report.

## Acceptance (paste real output)
- `npx pnpm@12.6.0 --filter @waada/core test` → green
- `npx pnpm@12.6.0 check` → passes
- `git grep -n "qwen3-32b" -- packages docs/decisions tasks/M02-llm-core.md docs/superpowers/specs` → only `docs/decisions/llm/evals.md` history (and PROPOSALS) remain

## Rules
Commits start with `m02:`, with **no** AI attribution. Stage explicit paths only. **Don't push.** Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
