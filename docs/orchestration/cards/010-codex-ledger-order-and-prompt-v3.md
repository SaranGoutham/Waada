# Card 010 — Codex — M05: newest-first open commitments; ledger prompt v3

**Worker:** Codex · **Module:** M05 · **Issued by:** master, 2026-09-27

## Goal
Human decisions **P-007**: (1) open commitments are sorted **newest promise first**; (2) keep **one** ledger pass (no extra LLM calls) and tighten the prompt. Target: MVP criterion 1 (Sep 2 SOC 2 item first) and EVAL-2 (pricing proposal delivered).

## Read first
`AGENTS.md` (§1a, §2, §3, §4a), `docs/decisions/PROPOSALS.md` P-007, `tasks/M05-agent-core.md` (sort rule, updated), `seed/acme/EXPECTED.md` "Commitments", `packages/core/src/agent/{ledger,prompts,brief}.ts`, `docs/decisions/llm/prompts/v2-ledger.md`.

## What the live ledger returned after card 008 (account from the master's browser run)
| status | date | text | evidence given by the model |
|---|---|---|---|
| open | Jul 15 | Log all account history, calls, and promises to ensure continuity | "No subsequent interaction shows the logging was completed." |
| open | Aug 21 | Provide same-day response for SSO issues during the pilot | "No later interaction confirms…" |
| open | Aug 28 | Prepare DPA redlines | "No subsequent evidence…" (they were sent: Sep 3 email "DPA redlines returned + next steps") |
| open | Sep 2 | Provide the SOC 2 Type II report and security questionnaire | correct |
| delivered | Aug 14 | Deliver the annual pricing proposal (sent Aug 15, one day late) | correct |
| delivered | Aug 13 | Send the quote by August 15 | duplicate of the pricing proposal |
In the eval run minutes earlier, no "delivered" pricing proposal came out at all (run-to-run variance).

## Files you may change
`packages/core/src/agent/{ledger,prompts}.ts`, `packages/core/test/agent-ledger.test.ts`, `packages/core/test/agent-brief.test.ts`, `docs/decisions/llm/prompts/v3-ledger.md` (new; keep v1/v2), `docs/decisions/llm/task-routing.md`, `docs/reports/m05-agent-core.md`.
**Don't touch:** everything else (`llm/`, `ingest/`, `baselines.ts`, `apps/`, `AGENTS.md`, `tasks/`, `docs/PROGRESS.md`, `.env`).

## Steps (TDD for the deterministic parts)
1. **Sort:** open (newest `date` first; undated last) → unclear → delivered. Update the unit tests that assert order. The brief already lists open items in ledger order.
2. **Prompt v3** (general rules, no Acme names or facts):
   - Only **one-off deliverables or actions** for the customer count. Ongoing habits, processes or service levels ("we'll log everything", "we'll respond same day", "we'll keep you posted") are **not** commitments.
   - Merge promises for the **same deliverable** (e.g. "send the quote" and "send the pricing proposal") into one item.
   - Treat any later mention that the item was **sent, shared, attached, returned or discussed as received** as evidence of delivery.
   - Say explicitly in `evidence` which later interaction shows delivery, or "no later interaction mentions it".
   - Consider using `temperature: 0` for the extract if it isn't already (reduces run-to-run variance); note it in `task-routing.md`.
3. Version the prompt (`PROMPT_VERSION` v3, `v3-ledger.md`).
4. **No live run** (no network in your sandbox); the master runs the eval.

## Acceptance
- `npx pnpm@12.6.0 --filter @waada/core test` → green
- `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root → clean
- `npx pnpm@12.6.0 --filter @waada/core typecheck` (or `tsc --noEmit` in `packages/core`) → clean

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
