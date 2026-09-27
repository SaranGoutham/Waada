# LLM evals — M05 agent core on `seed/acme`

## 2026-09-27 — Groq `openai/gpt-oss-120b` (fallback `qwen/qwen3-32b`) — M05 live eval

Harness: `packages/core/test/agent.eval.live.test.ts` (`pnpm test:live`, bank
`waada-acme-eval`, deleted afterwards). Ground truth: `seed/acme/EXPECTED.md`.
Model settings written from `GROQ_API_KEY` (.env fallback, card 003).

### Scorecard (Waada vs baselines)

| Check | Waada | Summary-only | CRM-only |
|---|---|---|---|
| EVAL-1: Sep 2 SOC 2 commitment open + first in brief | **fail** (no clean run; see below) | not measured | not measured |
| EVAL-2: delivered pricing proposal = delivered | **fail** (no clean run) | not measured | not measured |
| EVAL-3: pricing landmine + do-not-reopen guidance | **fail** (no clean run) | not measured | not measured |
| EVAL-4: ask "What changed since July?" → Q3→Q4 | **pass** (run 2; run 4 failed on TPM cascade) | n/a (no ask leg) | n/a |

The summary-vs-Waada comparison the brief asks for could **not** be measured:
no run produced a Waada brief, so there is nothing to compare against. This is
reported plainly, not hidden: on the Groq free tier the eval does not pass.

### Verdict

- `ask` works against real Hindsight + Groq (run 2 green, Q4 mentioned).
- `brief` (ledger + landmines extracts, then chat) does **not** fit the Groq
  free-tier TPM cap (8000): see "What the eval proved" in
  `docs/reports/m05-agent-core.md`. This is a product finding for the
  master/human: the M05 recall volumes and the M02 fallback id need a decision
  before MVP criterion 3 can be measured, let alone pass.

### Run history (honest log)

- **Run 1 (~14:42 EDT):** test bug — `parseFiles` called without the LLM, so
  the 2 headerless transcripts fell back to filename/current-time and the
  `errors == []` assertion failed before ingest; bank stayed empty so
  EVAL-1..4 failed vacuously. Fixed in the test (pass `{ llm }`). Note: the
  same latent bug exists in M10's `packages/core/test/e2e.live.test.ts`, which
  also calls `parseFiles` without `{ llm }` — flagged, not fixed here.
- **Run 2 (~14:44):** ingest 33/33 green (`{ added: 33, skipped: 0 }`); `ask`
  (EVAL-4) green. `brief`'s two `extract` calls failed: 4+3 high-budget recalls
  concatenated to 10–12.8k tokens > 8000 TPM → HTTP 413 "Request too large".
  Fix (the card's one round): new `agent/evidence.ts` `buildEvidence()` caps
  extract input at 12,000 chars with a per-query share; used by `ledger.ts` and
  `landmines.ts`. Unit tests: new `test/agent-evidence.test.ts` (3 tests).
- **Run 3 (~14:50):** extracts stopped 413ing, but `chat` calls failed: the
  primary model was TPM-exhausted by the burst, and the configured fallback
  `qwen/qwen3-32b` 404s on Groq (that id does not exist there).
- **Run 4 (~15:04, after cooldown):** ingest 33/33 green again. EVAL-1 failed
  fast on a transient `json_validate_failed` (empty model generation).
  EVAL-2/3/5 failed on TPM 429s that survived SDK retries: landmines extract
  still requests ~6.7k tokens, ledger similar, and `brief` fires both in
  parallel — 2 × ~6.7k never fits 8000 TPM. EVAL-4 failed on the same
  exhaustion cascade (primary 429 → invalid-fallback 404 → throw). Full log
  kept outside the repo (worker temp file, not committed).
