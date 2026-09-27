# Card 003 — OpenCode — M02 LLM core: `GROQ_API_KEY` from `.env` as a fallback

**Worker:** OpenCode (run after card 002) · **Module:** M02 (+ one field in M00's `config.ts`) · **Issued by:** master, 2026-09-27

## Goal
The human decided (AGENTS.md §2 rule 6 exception) that a Groq key in `.env` (`GROQ_API_KEY`) must work. Today the LLM layer reads keys only from `.waada/llm.json`. Add the fallback: **a Groq key saved in Settings wins; otherwise use `GROQ_API_KEY` from `.env`.**

## Files you may change
`packages/core/src/config.ts` (add an optional `groqApiKey` to `getEnv()`'s result), `packages/core/src/llm/**`, `packages/core/test/llm*.test.ts`, `packages/core/test/foundation.test.ts` (only if the `getEnv` shape assertion needs the new field), `docs/decisions/llm/providers.md` (one line documenting the fallback).
**Don't touch:** `apps/**`, `.env`, `.env.example` (the master already updated it), `docs/PROGRESS.md`.

## Steps (TDD)
1. `getEnv()` returns `groqApiKey?: string` from `process.env.GROQ_API_KEY`, with empty strings treated as unset.
2. Where M02 resolves the Groq credential (for chat, extract, transcribe and `testConnection`): use `settings.credentials.groq.apiKey` if set, else `getEnv().groqApiKey`, else the existing friendly `ConfigError`.
3. Whatever the web app reads to show "Groq configured" (e.g. `groqConfigured` / `redactedSettings`) must be true when only the env key exists. Never expose the key value itself.
4. Tests: settings key wins over env; env used when settings are empty; neither set → `ConfigError`; the key never appears in redacted output or logs.

## Acceptance (paste real output)
- `npx pnpm@12.6.0 --filter @waada/core test` → green
- `npx pnpm@12.6.0 check` → passes (if it fails only because of `apps/web`, report it and don't touch `apps/`)

## Rules
Commits start with `m02:`, with **no** AI attribution. Stage explicit paths only. **Don't push.** End with the WORKER REPORT block from AGENTS.md §4a.
