# Proposals & Open Questions (awaiting the human)

Agents **append** here when they need a stack addition (AGENTS.md rule 3), a contract change (rule 2), or any decision their brief doesn't settle. The human answers inline and sets the status. After approval, the proposing agent records the outcome as an ADR in `docs/decisions/NNNN-short-title.md` and, for stack items, the human updates AGENTS.md §5.

**Template**

```
## P-NNN — <short title>
- Raised by: <module> (<agent>) · <date>
- Type: stack | contract | design
- Question / proposal:
- Why it's needed:
- Options considered (with trade-offs):
- Recommendation:
- Blocks: <what can't proceed>
- **Status:** open | approved: <choice> | rejected
- Human answer:
```

---

## P-001 — Library for parsing `.eml` email files
- Raised by: planning (Claude Code) · 2026-09-27
- Type: stack
- Question / proposal: M03 must parse `.eml` files (headers, MIME multipart, quoted-printable/base64 bodies, attachments names). Hand-rolling MIME parsing is error-prone.
- Options considered:
  - `postal-mime`: small, no dependencies, works in Node and browser, parses to headers + text/html + attachments.
  - `mailparser` (Nodemailer project): mature and widely used, Node-only, heavier.
  - Hand-rolled with Node built-ins: no dependency, but high risk of bugs on real exports.
- Recommendation: `postal-mime` (smaller, no dependencies), but either library is fine.
- Blocks: M03 `.eml` parser only (Slack export, transcripts and audio can proceed).
- **Status:** approved: `postal-mime`
- Human answer: postal-mime (2026-09-27)

## P-002 — Ollama provider package for the AI SDK
- Raised by: planning (Claude Code) · 2026-09-27
- Type: stack
- Question / proposal: S3 approves Ollama as a provider, but the AI SDK has no first-party Ollama provider; it is listed under community providers. Which package?
- Options considered: M02 checks the AI SDK community-providers page for the currently maintained Ollama provider and lists the candidates here, including maintenance status (last release, downloads). Alternative: Ollama's OpenAI-compatible endpoint via the AI SDK's OpenAI-compatible provider, with no extra community package.
- Recommendation: pending M02's research. The OpenAI-compatible route avoids a community dependency.
- Blocks: the Ollama option in M02 only
- **Status:** approved: Ollama via its OpenAI-compatible endpoint (`http://localhost:11434/v1`) using `@ai-sdk/openai-compatible`
- Human answer: use the OpenAI-compatible route; package `@ai-sdk/openai-compatible` (2026-09-27)

## P-003 — Library for reading Slack-export `.zip` files
- Raised by: M03 (OpenCode) · 2026-09-27
- Type: stack
- Question / proposal: `parseFiles` currently rejects `.zip` with "extract first" guidance. Should M03 read zips directly?
- Why it's needed: Slack exports ship as `.zip`; direct support would let the web UI accept the download as-is.
- Options considered (with trade-offs):
  - `unzipper`: streaming unzip, maintained, pulls in `fstream`-era deps.
  - `yauzl` (+ `yazl` for writing, not needed): minimal, low-level, needs wrapper code.
  - `adm-zip`: simple sync API, heavier memory use on large archives.
  - Node built-ins only: Node 22 has no unzip; would mean shelling out to a system `unzip` (not portable, breaks the Windows dev setup).
- Recommendation: `yauzl` (smallest surface for read-only extraction) — but only if the human wants direct `.zip` upload in the MVP; otherwise keep the extract-first error.
- Blocks: nothing (MVP works with extracted channel-day `.json`).
- **Status:** deferred (post-MVP)
- Human answer: Slack `.zip` upload is in the "later" tier of the MVP scope (AGENTS.md §1a, decided 2026-09-27). Keep the extract-first message for now.

## P-004 — Experimental "Sign in with ChatGPT" (M02b Part 2)
- Raised by: M02b (Claude Code) · 2026-09-27
- Type: design (no new package)
- Question / proposal: should Waada build the experimental ChatGPT-subscription login from S3? Research with sources: [docs/decisions/llm/chatgpt-login.md](llm/chatgpt-login.md).
- Exact mechanism: reuse the Codex CLI's public OAuth client (`app_EMoamEEZ73f0CkXaXp7hrann`) with PKCE against `https://auth.openai.com/oauth/authorize` and `/oauth/token`. The redirect URI is allow-listed by OpenAI to `http://127.0.0.1:1455/auth/callback` (fallback 1457), so Waada must open a temporary `node:http` listener on 1455 during sign-in, not use a web-app route. Store `{ accessToken, refreshToken, idToken, accountId, expiresAt }` in `credentials.chatgpt`. Call the private `https://chatgpt.com/backend-api/codex` Responses backend through the approved `@ai-sdk/openai` provider (custom `baseURL`, headers, and a `fetch` that refreshes tokens). Everything lives in `packages/core/src/llm/auth/chatgpt.ts` plus its routes, plus one `case "chatgpt"` line in M02's `providers.ts` (needs M02's agreement).
- Why it's needed: S3 lists it as an optional provider. OpenRouter sign-in (Part 1) already gives users a way to connect without pasting a key.
- Risks:
  - **Terms of service:** OpenAI's Terms of Use forbid "programmatically extract data or Output" and circumventing restrictions; no OpenAI program allows third-party use of a subscription.
  - **Account risk:** the user's own ChatGPT account could be rate-limited or suspended.
  - **Breakage:** the client ID, redirect allow-list, headers and backend are internal to Codex and change without notice. Request rules (`stream`, `store: false`, `instructions`) are undocumented (`// VERIFY:`).
  - **Port clash:** port 1455 is also used by `codex login`.
  - **Missing features:** no transcription; structured output unverified (degrades to JSON parsing).
- New packages: none (`node:crypto`, `node:http`, `@ai-sdk/openai` already approved).
- Options considered (with trade-offs):
  - A. **Defer past the MVP.** Build nothing now; keep M02's "not configured" error and hide the button. Zero risk, zero effort; OpenRouter sign-in covers the "no key" story.
  - B. **Build it as described**, behind `experimental: true`, with a warning screen that names the risks before sign-in. About 1–1.5 days including a manual test with a real ChatGPT account; fragile.
  - C. **Import the existing Codex CLI login** (read `~/.codex/auth.json` after the user runs `codex login`). No port 1455 listener, but it reads another app's credential file and shares its single-use refresh tokens, so Waada and Codex would log each other out.
- Recommendation: **A (defer).** The MVP goal is a simple working prototype, and this feature carries terms-of-service and account risk for the user with no demo value that OpenRouter doesn't already give. If you want it anyway, B, not C.
- Blocks: M02b Part 2 only. Part 1 (OpenRouter) goes ahead regardless.
- **Status:** approved: A (defer past the MVP)
- Human answer: defer; build nothing for ChatGPT login in the MVP (2026-09-27). ADR: [0001](0001-defer-chatgpt-login.md)

## P-005 — Replace the Groq fallback model (`qwen/qwen3-32b` is gone)
- Raised by: master (Claude Code), from card 005's live eval · 2026-09-27
- Type: stack (S3 names the fallback model)
- Question / proposal: Groq's `/openai/v1/models` for our key no longer lists `qwen/qwen3-32b` (calls 404). `openai/gpt-oss-120b` is still there. Available replacements: `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, or no fallback.
- New packages: none.
- Blocks: the fallback path in M02 (today every fallback call fails).
- **Status:** approved: `openai/gpt-oss-20b`
- Human answer: use `openai/gpt-oss-20b` as the Groq fallback (2026-09-27). AGENTS.md §5 S3 updated by the master with the human's permission. Code change: card 006.

## P-006 — Compare baselines read imported data, not `seed/`
- Raised by: master (Claude Code), from the browser run of today's target · 2026-09-27
- Type: contract note (§6.8) + design; no new package (S13 JSON files)
- Problem: an account created in the UI as "Acme Corp" gets slug `acme-corp`; both baselines read `seed/<slug>/` and find nothing, so Compare fills only the Waada column.
- Options: A. baselines read imported data saved in `.waada/`; B. keep `seed/`, demo names the account "Acme"; C. heuristic slug → seed folder lookup.
- **Status:** approved: A
- Human answer: use imported data (2026-09-27). AGENTS.md §6.8 note updated by the master. Code change: card 009.

## P-007 — Ledger accuracy approach and open-commitment order
- Raised by: master (Claude Code), from the card 008 live eval · 2026-09-27
- Type: design (no new package)
- Problem: with the free-tier evidence cap the ledger marks items "open" whose delivery proof it can't see (e.g. DPA redlines sent Sep 3), counts ongoing habits ("log everything", "same-day SSO response") as commitments, and results vary run to run. Open items sort oldest first, so any older false positive pushes the Sep 2 SOC 2 item down.
- Options: A. verification pass per open item (targeted recall + small check call); B. keep one pass, tighten the prompt. Order: newest promise first vs oldest first.
- **Status:** approved: B (one pass, tighter prompt); **newest open promise first**
- Human answer: 2026-09-27. `tasks/M05-agent-core.md` sort rule updated. Code change: card 010.

## P-008 — Extra Groq keys: dev/eval only
- Raised by: human, 2026-09-28 (five extra free Groq keys, each from a different organization; checked with Groq)
- **Status:** approved: use them **only for the master's dev/eval runs** (set `GROQ_API_KEY` in the process environment per run; `config.ts` prefers the environment over `.env`). No in-app key rotation; the app stays one-key (MVP criterion 4).

## P-009 — Overdue-first commitments (new `dueDate`) and a chunked ledger pass
- Raised by: master, from eval run E · 2026-09-28
- Findings: newest-first put a legitimate new promise (due Sep 28) above the overdue SOC 2 report (due Sep 4); the SOC 2 promise, mentioned once, was lost to recall + the evidence cap.
- **Status:** approved: (1) `Commitment` gains `dueDate: string | null` (§6.1 updated; required-but-nullable for Groq strict output); open commitments sort **overdue first** (most overdue on top), then upcoming by due date, then undated. Supersedes P-007's newest-first. (2) **Chunked ledger pass**: split recalled evidence into budget-sized chunks, extract from each, merge and dedupe. Code: card 014.

## P-010 — Simple MVP core + showcase UI with integrations and pipeline
- Raised by: human · 2026-09-28
- **Status:** approved: keep the core simple; build a neat UI/UX that includes an **Integrations** page (Gmail, Slack, HubSpot, Google Meet capture, MCP, Hindsight, Groq) and a **Pipeline** page, presented as product screens with no "coming soon / planned / later" wording. Connector back-ends stay post-MVP. Master's guardrail: briefs and answers only ever use real imported data; the UI never claims data was synced from a source that wasn't. AGENTS.md §1a tier table updated. Code: card 015.
