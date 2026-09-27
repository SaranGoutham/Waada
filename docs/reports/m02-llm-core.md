# M02 — LLM core report

## Built

- `.waada/llm.json` settings with safe defaults, validation, atomic persistence,
  opaque M02b ChatGPT credentials, and recursive credential redaction.
- Provider registry for Groq, OpenAI, Anthropic, Google, OpenRouter, Ollama,
  and the experimental M02b ChatGPT placeholder.
- `createLLM()` chat generation with one configured fallback-model retry.
- Structured extraction with structured generation, one repair request (including
  validation detail and JSON schema), code-fenced plain-JSON recovery, and safe
  malformed-output `null` behavior. Provider failures map to
  `ExternalServiceError`.
- Groq/OpenAI transcription routing with a precise missing-configuration error.
- An opt-in Groq live test, skipped without `GROQ_API_KEY`.

## Verification

Commands and observed output:

```text
pnpm --filter @waada/core test -- llm.settings.test.ts llm.providers.test.ts llm.runtime.test.ts llm.extract.test.ts llm.ai-sdk.test.ts llm.live.test.ts
Test Files  5 passed (5)
Tests  21 passed (21)

pnpm check
Checked 44 files ... No fixes applied.
tsc --noEmit
```

`pnpm test` was re-run after the M01 memory work reached review (2026-09-27).
M02 tests (21) and the M01 memory tests (19) all passed; the shared suite
result was 87 passed / 1 failed across 13 files. The single failure is the
non-M02 `test/foundation.test.ts` public-index case, whose M00 assertion still
expects `createLLM()` to reject with its former "not implemented" stub — left
for the M00 owner per AGENTS.md §3 (don't fix another module's code).

`pnpm test:live` was also run: the M02 Groq live test skips without
`GROQ_API_KEY` (still unavailable here); M01's live Hindsight tests passed
(2 passed, 1 skipped).

## Unverified

- A real Groq live call has not run because `GROQ_API_KEY` is unavailable in
  this environment. Run `pnpm test:live` after providing it; no key is logged.
- The filename argument to `transcribe()` is accepted by the Waada contract but
  AI SDK 7's `transcribe()` accepts bytes/URL rather than a `File` object, so
  media-type inference operates on byte data.

## Follow-ups

- M00 owner: update the public-index assertion from the M02 stub behavior to
  the implemented `createLLM()` behavior.
- M02b: implement OpenRouter OAuth and the experimental ChatGPT adapter in the
  reserved settings slot.
