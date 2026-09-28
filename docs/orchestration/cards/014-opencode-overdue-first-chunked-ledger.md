# Card 014 — OpenCode — M00/M05/M01: `dueDate`, overdue-first ledger, chunked ledger pass, Hindsight retries

**Worker:** OpenCode · **Modules:** M00 (`models.ts` field), M05 (ledger), M01 (memory retries) · **Issued by:** master, 2026-09-28

## Goal
Human decision **P-009** (read it in `docs/decisions/PROPOSALS.md`) plus one robustness fix from eval run E. Target: MVP criterion 1: on `seed/acme` the brief's first open commitment is the overdue Sep 2 SOC 2 item.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a, §6.1 `Commitment` now has `dueDate`), `docs/decisions/llm/evals.md` (runs D and E), `seed/acme/EXPECTED.md`, `packages/core/src/models.ts`, `packages/core/src/agent/{ledger,evidence,prompts,brief}.ts`, `packages/core/src/memory/`, `packages/core/test/fakes.ts`.

## Facts (run E)
- The SOC 2 promise is mentioned **once** (Sep 2 call). The call was stored in Hindsight, but the ledger missed it: recall + the 12,500-char evidence cap cut it.
- Newest-first put "contact Priya on Sep 28" (not yet due) above the SOC 2 report (due Sep 4, overdue).
- Hindsight Cloud was flaky: 6 of 33 `remember` calls failed with "Couldn't reach Hindsight"; ingest took 43 minutes.

## Files you may change
`packages/core/src/models.ts` (only `Commitment.dueDate`), `packages/core/src/agent/{ledger,evidence,prompts,brief}.ts`, `packages/core/src/memory/**`, `packages/core/test/fakes.ts` (only if sample commitments need `dueDate`), `packages/core/test/{foundation,agent-ledger,agent-brief,agent-evidence,memory*}.test.ts`, `docs/decisions/llm/prompts/v4-ledger.md` (new), `docs/decisions/llm/task-routing.md`, `docs/reports/m05-agent-core.md`, `docs/reports/m01-memory.md`.
**Don't touch:** `apps/**` (Codex is rebuilding the UI at the same time, card 015), `llm/`, `ingest/`, `baselines.ts`, `AGENTS.md`, `docs/PROGRESS.md`, `.env`, `package.json`, `pnpm-lock.yaml`.

## Steps (TDD, fakes only; no network in unit tests)
1. **`dueDate`** in `Commitment`: `z.string().datetime().nullable()`, **required** (not optional: Groq strict output rejects optional keys). Fix every place that builds a `Commitment` (fakes, tests).
2. **Ledger prompt v4:** ask for `dueDate` (the deadline stated in the promise, e.g. "by September 4"; `null` if none). Keep v3's rules. Version it (`v4-ledger.md`, `PROMPT_VERSION`).
3. **Overdue-first sort** (deterministic, unit-tested; "now" injectable): open items with `dueDate` before now (most overdue first) → open items with a future `dueDate` (soonest first) → open undated (newest `date` first) → unclear → delivered.
4. **Chunked ledger pass:** instead of truncating the recalled evidence to one budget, split it into chunks that each fit the budget (`llm/budget.ts`), extract commitments from each chunk **one after another**, then merge: dedupe the same deliverable (normalised text + madeTo), and if any chunk shows it delivered, it's delivered. Cap the number of chunks (e.g. 4) and log if hits were dropped. Unit tests: a single-mention promise in the last chunk survives; merge rules.
5. **Hindsight retries (M01):** `remember` (and `search`) retry transient failures (network errors, 5xx, 429) up to 2 times with a short backoff (injectable sleep in tests); never retry 4xx other than 429. Log each retry (no content).
6. No live run needed; the master runs the eval with a spare key.

## Acceptance
- `npx pnpm@12.6.0 --filter @waada/core test` → green
- `npx pnpm@12.6.0 check` → passes (if it fails only in `apps/web` because card 015 is mid-work, say so and don't touch `apps/`)

## Rules
Commits start with `m05:` / `m01:` / `m00:` by file area, **no** AI attribution. Stage explicit paths only. **Don't push.** If your model provider rate-limits you, commit what is finished and green first, then report. End with the WORKER REPORT block from AGENTS.md §4a.
