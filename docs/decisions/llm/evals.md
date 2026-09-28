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

## 2026-09-27 — card 007 run (free-tier budget + sequential + 429 retry)

Same harness, Groq `openai/gpt-oss-120b` on a **free** key (8,000 tokens/minute), fallback `openai/gpt-oss-20b` (P-005). Changes since run 4: every prompt capped at ~5,000 input tokens (chars/4), brief and compare run their LLM calls one after another, one retry layer that waits out Groq's `retry-after` on 429 (never retries 413). The summary baseline is capped the same way (kept 12,000 of 23,246 chars), so the comparison stays fair.

Result: **4 of 6 tests pass, no rate-limit failures.** Whole eval 384 s; the EVAL-1 test (ledger + landmines + brief) took **63.5 s**.

| Check | Waada | Notes |
|---|---|---|
| Ingest 33/33 | pass | |
| EVAL-1: Sep 2 SOC 2 open **and first** | **fail** | SOC 2 item is present and open, but **third**: the ledger also lists "same-day SSO response" (Aug 21) and "security & legal review session" (Aug 27) as open, and open items sort oldest first |
| EVAL-2: pricing proposal = delivered | **fail** | ledger marked it **unclear** ("deadline missed; proposal sent 15 Aug"); a different item matched the check's lookup |
| EVAL-3: pricing landmine + do-not-reopen | pass | "Monthly-billing objection … Do NOT propose or revisit monthly-billing options" |
| EVAL-4: ask "What changed since July?" → Q3→Q4 | pass | |
| EVAL-5: compare fills all three columns | pass | per-column scores for summary-only / CRM-only were **not captured** in the saved log; next run must record them |

Verdict: the free tier is no longer the blocker. The remaining misses are **ledger judgement** (what counts as an open commitment, and "late but sent" = delivered), not capacity. MVP criterion 1 is not met yet. Run by OpenCode (card 007); the worker hit its own model's rate limit before writing this, so the master recorded it from the run log.

## 2026-09-27 — card 008 changes awaiting live evaluation

No live run was performed in the offline worker sandbox. Ledger prompt v2 now
excludes non-specific ongoing service levels, treats later proof of a completed
action as delivered even when late, and treats meetings later shown to have
occurred as delivered. The EVAL-2 assertion now selects a delivered commitment
only when its own text or evidence identifies the pricing proposal, avoiding a
false match on another delivered item. The master must run the live harness and
append its resulting Waada, summary-only, and CRM-only scorecard here.

## 2026-09-27/28 — master's runs after cards 008, 010, 011 (free Groq key)

| Run | Code state | Result | What failed and why |
|---|---|---|---|
| A | card 008 (ledger v2) + transcript fix | 4/6 | EVAL-1: first open item was "log all account history" (a habit); ledger also listed "same-day SSO response" and already-sent DPA redlines as open; oldest-first sort put SOC 2 4th. EVAL-2: no delivered pricing proposal that run (a manual run minutes later did mark it delivered: run-to-run variance) |
| B | card 010 (ledger v3, newest open first, temperature 0) | 2/6, **not meaningful** | Groq **daily** cap hit: `tokens per day (TPD): Limit 200000, Used 198502`; plus one invalid-JSON 400 that `extract` didn't repair (fixed in card 011) |
| C | card 011 (extract repair + fallback model) | 3/6 | Ledger `extract` returned no valid object twice (all three attempts failed schema validation; reason not logged). EVAL-4 (ask) failed: primary model failed, fallback `gpt-oss-20b` got HTTP 413 (Ask prompt 9,252 tokens > 8,000 TPM; Ask's evidence isn't capped) |

Passing in C: ingest 33/33 (transcript dates now correct), EVAL-3 pricing landmine, EVAL-5 compare fills all three columns. Per-column baseline scores still not captured (live mode suppresses console output; next harness change should write the scorecard to a file).

Honest verdict so far: on a free Groq key, the ledger is the weak point (judgement and valid structured output), and each full eval uses ~40–50k of the 200k daily tokens, which limits how many prompt iterations fit in a day.

### Run D (2026-09-28 ~04:57 UTC) — after card 012, first run with the results file

| Check | Waada | Summary-only | CRM-only |
|---|---|---|---|
| SOC 2 open and first | fail | **pass** | fail |
| Delivered pricing proposal | fail | fail | fail |
| Pricing landmine + do-not-reopen | **pass** | fail | fail |
| Q3 → Q4 (Waada: `ask`; baselines: their text) | fail | **pass** | fail |

**On this run the summary-only baseline scored higher than Waada (2 checks vs 1).** Said plainly, as the M05 brief requires. Conditions were degraded, so this is not yet a verdict on the approach:
- Ledger `extract` returned `null` again: `structured attempt 1: provider code json_validate_failed; structured attempt 2: provider code json_validate_failed; plain JSON attempt: invalid JSON`. Run A (default temperature, primary model) produced a ledger; since then card 010 set temperature 0, and the primary model's daily tokens ran out so calls fall back to `gpt-oss-20b`. Either may be the cause.
- `ask` failed on the fallback model with 413 (`Requested 8517 > 8000 TPM`) even after card 012's cap: the chars/4 token estimate undercounts for these models.
