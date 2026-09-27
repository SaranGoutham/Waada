# Card 008 — Codex — M05: commitment-ledger judgement (EVAL-1, EVAL-2)

**Worker:** Codex (after card 009; reassigned from OpenCode by the human, Muse free model rate-limited) · **Module:** M05 · **Issued by:** master, 2026-09-27

## Goal
MVP success criterion 1: on `seed/acme` the brief's **first** item is the open Sep 2 SOC 2 commitment. The free-tier capacity problem is solved (card 007); what's left is the ledger's **judgement**. Fix it with **general** rules, not rules that name Acme facts.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a), `seed/acme/EXPECTED.md` ("Commitments"), `docs/decisions/llm/evals.md` (card 007 section), `packages/core/src/agent/{ledger,prompts,evidence}.ts`, `packages/core/test/agent.eval.live.test.ts`.

## What went wrong in the card 007 live run
- The ledger listed as **open**: "Provide same-day response for SSO issues during the pilot" (Aug 21) and "Schedule a security and legal review session for the week of 31 August" (Aug 27), before the SOC 2 item (Sep 2). Open items sort oldest first, so SOC 2 came third. Per `EXPECTED.md` there is exactly **one** open commitment (SOC 2), one delivered (pricing proposal) and one unclear (onboarding lead).
- The Aug 13 pricing proposal was marked **unclear** ("deadline missed; proposal sent 15 Aug") instead of **delivered**.
- EVAL-2's lookup matched a different item ("Send written proposal documenting pil…"); check whether the test's lookup is too loose.

## Files you may change
`packages/core/src/agent/{ledger,landmines,brief,prompts,evidence}.ts`, `packages/core/test/agent-{ledger,landmines,brief,evidence}.test.ts`, `packages/core/test/agent.eval.live.test.ts`, `docs/decisions/llm/prompts/*` (new version, keep the old), `docs/decisions/llm/task-routing.md`, `docs/decisions/llm/evals.md`, `docs/reports/m05-agent-core.md`.
**Don't touch:** `packages/core/src/agent/baselines.ts` and `packages/core/src/ingest/**` (card 009 just changed them; build on its version), `packages/core/src/llm/**`, `apps/**`, `seed/**`, `package.json`, `pnpm-lock.yaml`, `docs/PROGRESS.md`, `AGENTS.md`, `.env`.

## Also seen in the master's browser run (same brief)
- The brief's "Recent changes" and "Deal story" **missed the Q3 → Q4 go-live move** (Sep 18 call, Sep 19 email "Revised rollout: Q4 go-live confirmed") and still said "go-live by Sept 30". `ask("What changed since July?")` finds it, so it's in memory; the brief's recent-changes recall or its 4,000-char cut drops it. Fix so the latest date/plan changes survive (e.g. recall sorted by date, newest first, before truncation).
- The brief markdown's "Open commitments" section listed items the ledger had marked delivered/late. The markdown must list only the ledger's **open** items, in the ledger's order.

## Steps
1. Ledger prompt v2 (versioned in `docs/decisions/llm/prompts/`), general rules such as:
   - A commitment is a **specific deliverable or action** our team promised (send a document, schedule/hold a meeting, make an intro). Ongoing service levels during a pilot ("we'll respond same day") are not ledger items unless a specific instance was promised and missed.
   - **Delivered** if any later interaction shows it was done, **even if late**. Lateness goes in `evidence`, not in the status.
   - A meeting that later interactions show took place = delivered.
   - Keep the existing open / unclear definitions.
2. Do **not** change the sort order to game the check, and don't mention Acme names or facts in prompts.
3. Unit tests (FakeLLM) for anything deterministic you add (e.g. dedupe, parsing); prompt wording itself is judged by the live eval.
4. If EVAL-2's lookup is too loose, tighten it to match the pricing proposal specifically, and explain in the report.
5. **No live run** (your sandbox has no network). Make the prompt changes and unit tests; the master runs `agent.eval.live.test.ts` afterwards and records `evals.md` (including the per-column summary-only / CRM-only scores card 007 did not capture).

## Acceptance (paste real output)
- `npx pnpm@12.6.0 --filter @waada/core test` → green
- `npx pnpm@12.6.0 check` → passes
- Biome: `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root

## Rules
**Don't commit** (your sandbox can't write `.git`): leave changes in the working tree and list every changed path; the master verifies, commits (`m05:`) and runs the live eval. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
