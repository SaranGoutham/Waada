# Card 007 — OpenCode — M05 + M02: make Brief, Ask and Compare fit the Groq free tier

**Worker:** OpenCode (run after card 006 is done and pushed) · **Modules:** M05 (agent), M02 (llm retry) · **Issued by:** master, 2026-09-27

## Goal
The human decided: **Waada must work with a free Groq key** (8,000 tokens per minute on `openai/gpt-oss-120b`). Run the big requests one after another, keep each request well under the limit, and wait-and-retry when Groq answers 429 with a retry time. Then rerun the card 005 eval and record the result honestly.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a), `docs/orchestration/reports/005-opencode-m05-live-eval.md`, `docs/decisions/llm/evals.md`, `docs/reports/m05-agent-core.md`, `packages/core/src/agent/{brief,ledger,landmines,baselines,evidence}.ts`, `packages/core/src/llm/`.

## Facts from card 005 (checked by master)
- Ledger and landmines extracts are about 6,700 tokens each even with the 12,000-char evidence cap; `brief` runs them in parallel → 429/413.
- A single request over the per-minute limit gets **413** (never succeeds, don't retry). Over the remaining budget gets **429** with `retry-after`.
- `baselineSummary` sends up to 60,000 chars; acme is about 30,000 chars ≈ 8,000 tokens → too large for one request on the free tier.
- `compare` runs three legs in parallel.

## Files you may change
`packages/core/src/agent/**`, `packages/core/src/llm/**`, `packages/core/test/agent*.test.ts`, `packages/core/test/llm*.test.ts`, `packages/core/test/agent.eval.live.test.ts`, `docs/decisions/llm/evals.md`, `docs/decisions/llm/task-routing.md`, `docs/decisions/llm/prompts/*`, `docs/reports/m05-agent-core.md`.
**Don't touch:** `apps/**`, `package.json`, `pnpm-lock.yaml` (no new packages), `docs/PROGRESS.md`, `AGENTS.md`, `.env`.

## Steps (TDD)
1. **Per-request budget.** One documented constant for the largest prompt we send (system + user + expected output) that stays safely under 8,000 tokens (e.g. ≤ 5,000 input tokens; estimate tokens as chars/4 and say so). Apply it to ledger, landmines and `baselineSummary` (summary keeps the most recent text, as today). Note in `evals.md` that the summary baseline is also capped, so the comparison stays fair.
2. **Run sequentially.** `brief`: ledger, then landmines, then the markdown chat. `compare`: legs one after another. Keep "one failing leg shows its error" behaviour.
3. **429 retry in `llm/`.** On 429, wait for `retry-after` (seconds header, capped at 60 s) and retry, at most 2 times; then fall back / throw the existing friendly error. Never retry 413. Check the AI SDK docs for how it already handles retries (`maxRetries`) and don't double-retry; leave `// VERIFY:` where unsure. Unit-test with a fake that returns 429 then success (no network, no real waiting: inject the sleep).
4. **Rerun the eval**: `agent.eval.live.test.ts` once cleanly. Fill the scorecard in `evals.md` for Waada and both baselines, with run time. **If the summary baseline scores as well as Waada, say so plainly.**
5. Report how long `brief` took in the live run (MVP goal says "within a minute": state the real number).

## Acceptance (paste real output)
- `npx pnpm@12.6.0 --filter @waada/core test` → green
- `npx pnpm@12.6.0 check` → passes
- Live eval output pasted, with the scorecard

## Rules
Commits start with `m05:` or `m02:` (by file area), with **no** AI attribution. Stage explicit paths only. **Don't push.** Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
