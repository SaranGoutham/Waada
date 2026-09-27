WORKER REPORT: card 003, M02 (+ one field in M00's config.ts)
Status: done
Commits: 6655f23 m02: use GROQ_API_KEY from .env when Settings has no Groq key
Files changed: packages/core/src/config.ts, packages/core/src/llm/providers.ts, packages/core/src/llm/settings.ts, packages/core/test/llm.providers.test.ts, packages/core/test/foundation.test.ts, docs/decisions/llm/providers.md
Checks: `npx pnpm@12.6.0 --filter @waada/core test` → green (18 files, 116 tests passed); `npx pnpm@12.6.0 check` → passes (Biome 77 files clean, typecheck clean in all packages, no apps/web failure)
Dependencies: M00 config/store → available; M02 providers/settings/extract → available (owned by this card); apps/web server.ts → read-only reference (not touched, per card); GROQ_API_KEY live value → not needed (all new tests use fake keys, no network)
Blocked: none
Unverified: none
Notes for master: Core exposes `resolveGroqApiKey(settings)` (Settings wins, else `GROQ_API_KEY`, empty treated as unset) and `isGroqConfigured(settings)` from `@waada/core`; `createLanguageModel` (groq), `createTranscriptionModel` (groq), and `testConnection` all resolve through it. `redactedSettings()` now reports `credentials.groq` as `[redacted]` when only the env key exists, so the existing web `groqConfigured: Boolean(value.credentials.groq)` check already returns true with no key value exposed — card 004 needs no core change for that, but may use `isGroqConfigured` directly if preferred. No secrets printed, logged, or committed (tests use fake key strings only).

---
**Master verification (2026-09-27):** commit 6655f23 touches only card-listed files, no AI attribution. Root `pnpm check` passes; `pnpm test` 116 core + 2 web green. Run on model `opencode/muse-spark-1.3-contributor-free` (human choice); two earlier attempts failed (OpenCode service timeout, then ECONNRESET on longcat).
