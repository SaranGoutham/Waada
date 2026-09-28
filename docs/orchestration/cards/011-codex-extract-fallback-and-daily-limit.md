# Card 011 — Codex — M02: extract falls back to the second model; handle Groq's daily limit and invalid-JSON 400s

**Worker:** Codex · **Module:** M02 · **Issued by:** master, 2026-09-27

## Goal
Make `extract` as robust as `chat` on the free Groq tier, and keep the §6.5 contract ("never throws on malformed model output").

## Read first
`AGENTS.md` (§2, §3, §4a, §6.5), `packages/core/src/llm/{index,extract,retry,budget}.ts`, their tests.

## What the master saw in the live eval (card 010 run)
1. **Daily limit:** `Rate limit reached for model openai/gpt-oss-120b … tokens per day (TPD): Limit 200000, Used 198502, Requested 5599. Please try again in 29m31s.` (HTTP 429). `withRateLimitRetry` caps waits at 60 s, so it waits 60 s twice for a limit that lasts 29 minutes, then fails.
2. **Invalid JSON from the model surfaces as HTTP 400:** `Generated JSON does not match the expected schema … jsonschema: '/commitments/6' … expected object, but got string` (Groq error code `json_validate_failed`, `isRetryable: false`). `extract` treats every non-`NoObjectGeneratedError` as an external failure and throws, skipping its own repair and plain-JSON steps.
3. `chat` tries `settings.model` then `settings.fallbackModel`; **`extract` never uses the fallback model.** On Groq, `openai/gpt-oss-20b` has its own separate limits.

## Files you may change
`packages/core/src/llm/{extract,index,retry}.ts`, `packages/core/test/llm*.test.ts`, `docs/decisions/llm/providers.md`, `docs/reports/m02-llm-core.md`.
**Don't touch:** `agent/`, `ingest/`, `apps/`, `AGENTS.md`, `docs/PROGRESS.md`, `.env`, `package.json`, `pnpm-lock.yaml`.

## Steps (TDD, fakes only, injected sleep: no real waiting, no network)
1. **Long retry-after = don't wait.** In `retry.ts`, if a 429's retry-after is longer than the 60 s cap, rethrow immediately (no sleep) so the caller can switch models. Keep the ≤ 60 s behaviour as is.
2. **Invalid JSON 400 = malformed output.** In `extract`, treat a provider 400 whose body/code says the generated JSON didn't match the schema (Groq `json_validate_failed`) like `NoObjectGeneratedError`: continue to the repair step, then the plain-JSON step. Match on the error code/structure you can verify in the AI SDK / Groq provider types; leave `// VERIFY:` if you have to match on message text.
3. **Model fallback for extract.** Run the extract sequence with `settings.model`; if it ends in a provider failure (not `ConfigError`, not "returned null"), run it once more with `settings.fallbackModel` (if set and different), mirroring `chat`.
4. **Friendly daily-limit message.** When the final failure is a 429 with a long retry-after, the `ExternalServiceError` message says so in plain words, e.g. "Groq's free daily limit is used up. Try again in about 30 minutes, or add a paid key in Settings." (minutes from retry-after; never include the key). Same wording for `chat`.
5. Tests for each of 1–4, plus: 413 is still never retried; `ConfigError` still stops immediately.

## Acceptance
- `npx pnpm@12.6.0 --filter @waada/core test` → green (a failure that is only your sandbox's EPERM on `.waada/` is OK; say so)
- `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root → clean
- `tsc --noEmit` in `packages/core` → clean

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
