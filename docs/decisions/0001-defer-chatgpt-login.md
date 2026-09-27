# 0001 — Defer the experimental ChatGPT login past the MVP

Date: 2026-09-27 · Module: M02b · Proposal: P-004

## Context

S3 lists an optional, experimental "Sign in with ChatGPT". OpenAI has no program
for third-party apps to use a ChatGPT subscription. The only known route reuses
the Codex CLI's OAuth client (redirect allow-listed to `127.0.0.1:1455`) and
calls a private, undocumented backend. That route conflicts with OpenAI's Terms
of Use and puts the user's account at risk. Research: [llm/chatgpt-login.md](llm/chatgpt-login.md).

## Decision

Build nothing for ChatGPT login in the MVP. M02b builds only the OpenRouter
OAuth PKCE sign-in. No `chatgpt.ts` adapter and no `/api/auth/chatgpt/*` routes.

## Consequences

- M02's `"chatgpt"` provider entry keeps throwing its "not configured"
  `ConfigError`. M06 should hide or disable the "Sign in with ChatGPT" slot.
- Users connect without pasting a key via OpenRouter sign-in.
- If this is revisited, the research doc describes the mechanism. Re-check it
  against the current Codex source first, because it changes without notice.
