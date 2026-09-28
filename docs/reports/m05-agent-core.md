# M05 agent core — worker report (card 005, live eval)

**Date:** 2026-09-27 · **Worker:** OpenCode · **Status: partial** — eval harness
done and honest; Waada-vs-baseline comparison blocked by provider limits.

## What was built

- `packages/core/test/agent.eval.live.test.ts` (new): ingests `seed/acme`
  (33 files) into an isolated bank (`waada-acme-eval`, deleted afterwards),
  then scores every check in `tasks/M05-agent-core.md` "Evaluation" for Waada
  **and** both baselines. Waada checks are asserted; baselines are scored and
  printed (EVAL-5 scorecard) for `docs/decisions/llm/evals.md`.
- `docs/decisions/llm/evals.md` (new): scorecard + verdict + honest run log.
- One fix round (per the card): `packages/core/src/agent/evidence.ts` (new,
  `buildEvidence()`, 12,000-char cap with per-query share) + wiring in
  `agent/ledger.ts`, `agent/landmines.ts`; `test/agent-evidence.test.ts` (3 tests).

## What the eval proved

1. **Ingest is solid:** 33/33 parsed and retained (`{added: 33}`) in two runs.
2. **`ask` works live:** "What changed since July?" → Q3→Q4 move (run 2 green).
3. **`brief` does not fit the Groq free tier (8000 TPM).** Uncapped, the
   ledger/landmines extracts request 10–12.8k tokens → HTTP 413. Capped at
   12k chars they still request ~6.7k tokens each, and `brief` fires both in
   parallel — 2 × ~6.7k never fits 8000 TPM → 429s that survive SDK retries.
   EVAL-1..3 and the EVAL-5 scorecard therefore have **no clean run**.
4. **The configured fallback makes it worse.** On primary TPM-exhaustion,
   `chat` falls back to `qwen/qwen3-32b`, which 404s on Groq (wrong id for
   that provider), turning a retryable 429 into a hard throw. The id is
   human-approved in AGENTS.md §5, so this needs a human/M02 decision.

## scorecard

Waada EVAL-4: 1 pass (run 2). Everything else: fail/blocked, no clean run.
Summary-vs-Waada comparison: **not measurable yet** — stated plainly in
`evals.md` as the brief requires.

## Blocked / proposed (for the master, no code changed)

- P-A: brief's parallel extract + chat volume vs 8000 TPM (tighter cap with
  relevance risk, serializing ledger/landmines, smaller recall budgets, or a
  paid/dev-tier key).
- P-B: fallback model id invalid on Groq (M02-owned `llm/` + §5 decision).
- P-C (not mine, flagged): `test/e2e.live.test.ts` calls `parseFiles` without
  `{ llm }` — the 2 headerless transcripts will always warn/fail its
  `errors == []` assertion.

## Verification

- `pnpm check` → passes (Biome + typechecks).
- `pnpm --filter @waada/core test` → 19 files, 119 tests, all pass (unit, no network).
- `test:live` (this file): ingest 33/33 + EVAL-4 green in run 2; full runs
  fail on provider TPM as documented above (runs 1–4 logged in `evals.md`).

## Card 008 follow-up — ledger judgement (offline)

- Updated the ledger prompt to v2 with general commitment boundaries and
  late-but-completed delivery guidance; `v1-ledger.md` remains for review.
- Brief chat input now contains only open ledger items, preserving ledger order.
- Recent-change evidence is ordered newest-first and capped from that end, so a
  latest timeline change is retained rather than displaced by older recall text.
- Tightened EVAL-2 to locate the delivered pricing proposal itself before
  asserting, rather than selecting the first delivered ledger entry.
- No live evaluation was run in the offline sandbox; the master must append the
  resulting per-column scorecard to `docs/decisions/llm/evals.md`.

## Card 010 follow-up — ledger ordering and prompt v3 (offline)

- Open commitments now sort newest promise first, with undated open items last;
  unclear and delivered items retain their existing groups after open items.
- The one-pass ledger prompt is versioned as v3. It excludes ongoing service
  levels, merges same-deliverable promises, treats later sent/shared/attached/
  returned/received discussion as delivery, and requires explicit delivery or
  absence evidence.
- Ledger extraction uses temperature 0 to reduce run-to-run variance. No live
  run was performed in this sandbox; the master must run the eval.

## Card 012 follow-up — prompt budget and eval visibility (offline)

- Ask evidence is capped inside the shared prompt budget while retaining
  relevance-ranked excerpts first.
- Failed structured extraction logs compact, safe per-attempt validation reasons.
- The live eval writes its scorecard and a redacted ledger view to
  `.waada/eval/last-run.json` (or the configured data directory).
