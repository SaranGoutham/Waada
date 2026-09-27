# M02b — LLM sign-in (OpenRouter OAuth + experimental ChatGPT login)

**Goal:** let a user connect an LLM **without pasting a key**: (1) **Sign in with OpenRouter** (official OAuth PKCE), (2) **Sign in with ChatGPT** (⚠️ experimental and unofficial; see S3).

## Files you own

```
packages/core/src/llm/auth/openrouter-pkce.ts
packages/core/src/llm/auth/chatgpt.ts            (experimental adapter)
apps/web/src/routes/api/auth/openrouter/*        start + callback server routes
apps/web/src/routes/api/auth/chatgpt/*           (only after P-approval, see below)
packages/core/test/auth*.test.ts
```
Coordinate with M06: M06 renders the "Sign in" buttons on the LLM settings page and links to your routes. You write the credentials into `LlmSettings.credentials` via M02's `saveLlmSettings()`.

## Part 1: OpenRouter (official, build it)

1. Start route: generate a PKCE code verifier and S256 challenge (`node:crypto`), store the verifier in `.waada/oauth/openrouter.json` (short-lived), redirect to OpenRouter's auth URL with `callback_url` = `http://localhost:<port>/api/auth/openrouter/callback`.
2. Callback route: read `code`, exchange it with the verifier at OpenRouter's key-exchange endpoint, receive the user-controlled API key, save it as `credentials.openrouter = { apiKey, via: "oauth" }`, set `provider: "openrouter"`, redirect to the settings page with a success flag. The code is single-use and expires in about 10 minutes (per OpenRouter docs). Handle both failure cases with a friendly message.
3. Tests: verifier/challenge generation (RFC 7636 test vector), callback success and failure with `fetch` mocked.

## Part 2: ChatGPT login (experimental, research first, then ask)

There is **no official OpenAI program** for third-party apps to use a ChatGPT subscription. Known approaches reuse the OAuth flow of OpenAI's own Codex CLI.

1. **Research only first.** Find out how the approach works: client ID, endpoints, token refresh, what the API accepts, and what OpenAI's terms say. Write the findings, with sources, into `docs/decisions/llm/providers.md` under "ChatGPT login (experimental)".
2. Append a proposal to `docs/decisions/PROPOSALS.md`: the exact mechanism, the risks (terms of service, breakage, account risk to the user), and whether any new package is needed. **Stop and wait for the human's approval.**
3. Only after approval: implement it behind `experimental: true`. The UI must show a clear warning before sign-in. The adapter lives entirely in `chatgpt.ts` plus its routes. If it's removed, nothing else breaks. Tokens go in `credentials.chatgpt`.

## Acceptance

- [ ] OpenRouter: manual end-to-end run in the browser. Sign in → returns to Settings → `testConnection("openrouter")` ok. Describe the steps and result in your report.
- [ ] Unit tests green; no tokens logged
- [ ] ChatGPT: the research doc and the proposal exist; implementation only if approved

## References

OpenRouter OAuth PKCE: https://openrouter.ai/docs/guides/overview/auth/oauth · RFC 7636 (PKCE): https://www.rfc-editor.org/rfc/rfc7636 · TanStack Start server routes: https://tanstack.com/start/latest
