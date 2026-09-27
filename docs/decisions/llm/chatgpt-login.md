# ChatGPT login (experimental): research

Owner: M02b · Researched 2026-09-27 · Status: **research only, awaiting P-004**

This belongs under "ChatGPT login (experimental)" in [providers.md](providers.md).
That file has uncommitted edits from M02 right now, so M02b keeps its findings
here and M02 or M02b adds a link from providers.md once M02 commits it.

## Summary

OpenAI has **no official program** that lets a third-party app use someone's
ChatGPT subscription. Every "Sign in with ChatGPT" in a third-party tool reuses
the OAuth client of OpenAI's own **Codex CLI** and then calls a **private
ChatGPT backend** that has no public documentation. It works today, but OpenAI
can break it at any time, and it probably conflicts with OpenAI's Terms of Use
(see Risks).

## How it works (from the Codex CLI source)

Source: `openai/codex` at commit `18344a97` (main, 2026-09-27).

| Item | Value | Source |
|---|---|---|
| OAuth issuer | `https://auth.openai.com` | `codex-rs/login/src/server.rs` (`DEFAULT_ISSUER`) |
| Authorize endpoint | `https://auth.openai.com/oauth/authorize` | `server.rs` (`build_authorize_url`) |
| Token endpoint (code exchange and refresh) | `https://auth.openai.com/oauth/token` | `codex-rs/login/src/auth/manager.rs` (`REFRESH_TOKEN_URL`) |
| Revoke endpoint | `https://auth.openai.com/oauth/revoke` | `manager.rs` (`REVOKE_TOKEN_URL`) |
| Client ID | `app_EMoamEEZ73f0CkXaXp7hrann` (Codex CLI's own public client) | `manager.rs` (`CLIENT_ID`) |
| Redirect URI | `http://127.0.0.1:1455/auth/callback`, fallback port `1457`. Comment in the source: "Keep in sync with the Codex CLI Hydra redirect URI allow-list" | `server.rs` (`DEFAULT_PORT`, `FALLBACK_PORT`) |
| PKCE | yes, plus a `state` value | `server.rs` |
| Scopes | `openid profile email offline_access api.connectors.read api.connectors.invoke` | `server.rs` |
| Extra authorize params | `id_token_add_organizations=true`, `codex_cli_simplified_flow=true`, `originator=codex_cli_rs` | `server.rs`; `codex-rs/login/src/auth/default_client.rs` (`DEFAULT_ORIGINATOR`) |
| Tokens returned | `id_token`, `access_token`, `refresh_token`; the ChatGPT account ID is a claim in the JWT | `manager.rs` (`TokenData`, `parse_chatgpt_jwt_claims`) |
| Refresh | refresh-token grant against the token endpoint (JSON body) with the same client ID; Codex refreshes when the access token is within 5 minutes of expiry | `manager.rs` (`request_chatgpt_token_refresh`, `CHATGPT_ACCESS_TOKEN_REFRESH_WINDOW_MINUTES`) |
| Refresh failures | refresh token expired, **already used** (single-use rotation), or revoked, all meaning "sign in again" | `manager.rs` (`REFRESH_TOKEN_*_MESSAGE`) |
| Model API base URL | `https://chatgpt.com/backend-api/codex` (Responses-API shaped) | `codex-rs/model-provider-info/src/lib.rs` (`CHATGPT_CODEX_BASE_URL`) |
| Request headers | `Authorization: Bearer <access_token>`, `chatgpt-account-id: <id>`, `originator` | `manager.rs` (`get_account_id`), `default_client.rs` |

Official docs confirm that Codex supports signing in with a ChatGPT plan, that
usage counts against the plan's Codex limits, and that the callback listens on
`localhost:1455`: https://developers.openai.com/codex/auth ·
https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan

## What this means for Waada

1. **The callback cannot be a Waada web route.** The redirect URI is
   allow-listed on OpenAI's side to `127.0.0.1:1455` / `:1457` `/auth/callback`.
   Waada would have to start a temporary `node:http` listener on port 1455 during
   sign-in. It clashes with a running `codex login`, and it breaks if either port
   is taken.
2. **The chat call** could probably reuse the approved `@ai-sdk/openai`
   provider's Responses model with `baseURL` set to the backend above, custom
   headers, and a custom `fetch` that refreshes tokens. No new package needed.
   `// VERIFY:` third-party projects report that the backend requires
   `stream: true`, `store: false` and a non-empty `instructions` field, and
   accepts only Codex-supported model IDs. This is not documented by OpenAI and
   is not confirmed here.
3. **Structured output** (`extract`) is unverified on this backend. Waada's
   `extract` already falls back to plain JSON parsing, so it would degrade, not
   break.
4. **Transcription is not available** through this route.
5. **Wiring:** M02's `createLanguageModel` currently throws `ConfigError` for
   `"chatgpt"` (`packages/core/src/llm/providers.ts`). It would need one
   `case "chatgpt": return createChatgptModel(...)` line calling M02b's adapter.
   That is a one-line change in M02's file, so it needs M02's agreement.

## Risks

- **Terms of Service.** OpenAI's Terms of Use (effective 2026-01-01,
  https://openai.com/policies/row-terms-of-use/) say users may not
  "Automatically or programmatically extract data or Output" or "circumvent any
  rate limits or restrictions or bypass any protective measures". Calling the
  private backend with another app's client ID while presenting as
  `codex_cli_rs` fits those clauses poorly. I found no statement from OpenAI
  that allows third-party use.
- **Account risk to the user.** The account that signs in is what OpenAI
  would act on (rate-limit, flag or suspend). It's the user's account, not
  Waada's.
- **Breakage.** The client ID, redirect allow-list, extra parameters, headers
  and backend are all internal to Codex and change with its releases. Nothing is
  versioned or announced.
- **Security.** The refresh token gives long-lived access to the user's ChatGPT
  account. It would live in `.waada/llm.json` (gitignored, plaintext) and must
  never be logged. `redactedSettings()` already masks `*token*` keys.
