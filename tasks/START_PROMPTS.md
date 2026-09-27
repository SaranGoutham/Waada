# Start-off Prompts (one per new agent chat)

**How to start an agent:** open a **fresh** chat (Claude Code, Codex or OpenCode) in `C:\Code-Files\Waada` (on branch `dev`) and paste the module's prompt. Replace `<AGENT>` with the tool's name (e.g. `Codex`). It goes in the Owner column of `docs/PROGRESS.md`. Several agents can run at the same time in this same folder.

**Order:** Wave 0 → M00 + M04 · Wave 1 (after M00 is done on `dev`) → M01, M02, M03, M05 · Wave 2 → M06, M07, M08a, M08b, M02b · Wave 3 → M08c, M09, M10.
Milestone merges (`dev` → `main`) are done by you; see TASKS.md "Branch & milestone merges".

**Context checkpoints:** when an agent's context gets full (or you type `checkpoint`), it saves a handoff file in `docs/handoffs/` and gives you a ready-to-paste prompt for a new chat (AGENTS.md §4, "Context checkpoints"). Paste that prompt into a fresh chat; don't reuse these start prompts for a module that's already begun.

---

## M00 — Foundation (Wave 0, start first)

```
You are <AGENT>, building module M00 (Foundation) of Waada.

1. Read AGENTS.md completely, then tasks/M00-foundation.md. They override every other doc.
2. Use the Superpowers workflow from AGENTS.md §4: brainstorming only for what the brief leaves open → writing-plans (save to docs/superpowers/plans/) → test-driven-development → verification-before-completion → finishing-a-development-branch.
3. You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`).
4. Set your row in docs/PROGRESS.md (Owner = <AGENT>) and keep it current.
5. Use only stack Approved in AGENTS.md §5. Anything else → docs/decisions/PROPOSALS.md and wait for me.
6. Commits: "m00: <change>". NO Co-Authored-By, no "Generated with", no mention of any AI tool. Push `dev` per AGENTS.md §3.
7. You're done when the brief's acceptance checks pass with real output in docs/reports/m00-foundation.md. Never touch `main`; tell me it's ready.

Other modules are waiting on your contracts. Match AGENTS.md §6 names and signatures exactly.
```

## M04 — Synthetic data (Wave 0, parallel with M00)

```
You are <AGENT>, building module M04 (Synthetic data) of Waada.

1. Read AGENTS.md completely, then tasks/M04-synthetic-data.md. They override every other doc (DATA_PLAN.md is outdated).
2. Superpowers workflow (AGENTS.md §4). In brainstorming, first propose the full Acme timeline (dates, file names, which file holds each required story element) and get my OK before writing files.
3. You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md (Owner = <AGENT>).
4. No code. Follow the file formats in the brief exactly; they're a contract with M03.
5. The data must be long and messy enough that a plain summary could miss the Sep 2 commitment. Don't make it easy.
6. Fully fictional: example.com domains, no real people or companies.
7. Commits "m04: <change>", NO AI attribution of any kind. Push `dev` per AGENTS.md §3.
8. Finish with seed/acme/EXPECTED.md complete and a report in docs/reports/m04-synthetic-data.md. Ask me to review the data; I'll quote it on stage.
```

## M01 — Memory (Wave 1)

```
You are <AGENT>, building module M01 (Memory, the Hindsight wrapper) of Waada.

1. Read AGENTS.md completely, then tasks/M01-memory.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Verify every Hindsight TypeScript client call against the official docs linked in the brief. Don't guess parameter names. Mark anything unverifiable with // VERIFY:.
4. Only your module may import @vectorize-io/hindsight-client.
5. Live test needs HINDSIGHT_BASE_URL (+ HINDSIGHT_API_KEY for Cloud) in .env. If they're missing, finish everything else, set status blocked, and tell me.
6. Report what Hindsight does when retain() gets the same document_id twice.
7. Commits "m01: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m01-memory.md.
```

## M02 — LLM core (Wave 1)

```
You are <AGENT>, building module M02 (LLM core: multi-provider via the Vercel AI SDK) of Waada.

1. Read AGENTS.md completely, then tasks/M02-llm-core.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Providers: Groq (default), OpenAI, Anthropic, Google, OpenRouter (API key), Ollama via @ai-sdk/openai-compatible (S21). Sign-in flows are M02b, not you. Just leave the settings slots.
4. extract() must never throw on malformed model output: structured → repair retry → plain JSON → null.
5. Verify AI SDK APIs (structured output, transcription, test/mock models) and Groq/OpenAI Whisper model IDs against current official docs.
6. Never log or return an unmasked API key.
7. Write docs/decisions/llm/providers.md. Live test needs a Groq key in .waada/llm.json. If missing, set blocked and tell me.
8. Commits "m02: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m02-llm-core.md.
```

## M03 — Ingest (Wave 1)

```
You are <AGENT>, building module M03 (Ingest: files → Interactions → memory) of Waada.

1. Read AGENTS.md completely, then tasks/M03-ingest.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Parsers: .eml with postal-mime (S20), Slack export JSON, transcripts (front-matter header, else llm.extract), audio via llm.transcribe. Test with FakeMemory/FakeLLM and your own small fixtures.
4. The transcript header format in the brief is a contract with M04. Don't change it.
5. Export the helpers M08a (Slack) and M08b (Gmail) will reuse: Slack day-grouping and email-to-Interaction mapping.
6. If a Slack .zip needs a library, propose it in docs/decisions/PROPOSALS.md; don't add one.
7. When seed/acme exists (M04), run parseFiles on it and compare the count with EXPECTED.md.
8. Commits "m03: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m03-ingest.md.
```

## M05 — Agent core (Wave 1)

```
You are <AGENT>, building module M05 (Agent core: commitment ledger, landmines, brief, ask, report, baselines) of Waada.

1. Read AGENTS.md completely, then tasks/M05-agent-core.md, then seed/acme/EXPECTED.md once M04 has it.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Build and unit-test everything against FakeMemory/FakeLLM first. Real runs need M01–M04 done on `dev`.
4. Version every prompt in docs/decisions/llm/prompts/ and record model and task choices in docs/decisions/llm/task-routing.md.
5. The evaluation is mandatory: Waada vs the summary baseline, pass/fail per check, in docs/decisions/llm/evals.md. If the summary baseline does as well as Waada, say so plainly. Don't tune the test to hide it.
6. Commits "m05: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m05-agent-core.md.
```

## M06 — Web app (Wave 2)

```
You are <AGENT>, building module M06 (Web app: TanStack Start + Tailwind + shadcn/ui) of Waada.

1. Read AGENTS.md completely, then tasks/M06-web-app.md.
2. Superpowers workflow (AGENTS.md §4). In brainstorming, show me a text wireframe of the Brief and Import pages before building. You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Scaffold with TanStack Start's official setup and shadcn/ui's TanStack Start guide. Any extra package (markdown renderer, icons, drag-and-drop, testing-library) → docs/decisions/PROPOSALS.md first, then wait.
4. Server functions call only @waada/core. Bind to 127.0.0.1. Leave the routes under api/auth, api/oauth/google and api/capture to M02b, M08b and M09.
5. Build the WAADA_FAKE_CORE=1 mode early, so UI work isn't blocked on the real core.
6. Commits "m06: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report with screenshots in docs/reports/m06-web-app.md, including the dev port.
```

## M07 — MCP server (Wave 2)

```
You are <AGENT>, building module M07 (MCP server, stdio) of Waada.

1. Read AGENTS.md completely, then tasks/M07-mcp-server.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Official MCP TypeScript SDK, stdio only (S8). Nothing but protocol on stdout; logs to stderr.
4. Write tool descriptions for an AI reader. Test each tool with fakes, then with the MCP Inspector.
5. docs/mcp.md: setup for Claude Code, Claude Desktop, Codex and OpenCode, each verified against that client's current docs (with links).
6. Commits "m07: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m07-mcp-server.md.
```

## M08a — Slack connector (Wave 2)

```
You are <AGENT>, building module M08a (Slack connector) of Waada.

1. Read AGENTS.md completely, then tasks/M08a-slack-connector.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Use @slack/web-api (S12). Group messages exactly like M03 (reuse its exported helper; propose an export if it's missing, don't copy code).
4. Raise the "same day grows after sync" dedupe issue as a proposal in docs/decisions/PROPOSALS.md with your recommended fix, and wait for my answer before implementing it.
5. Verify the minimal bot scopes in Slack's docs. Write docs/connectors/slack.md for me.
6. Live test needs SLACK_BOT_TOKEN and a #deal-acme channel. If missing, set blocked and tell me.
7. Commits "m08a: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m08a-slack-connector.md.
```

## M08b — Gmail connector (Wave 2)

```
You are <AGENT>, building module M08b (Gmail connector) of Waada.

1. Read AGENTS.md completely, then tasks/M08b-gmail-connector.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. googleapis (S11), read-only scope, tokens in .waada/connectors/gmail.json, never logged.
4. sourceId = RFC Message-ID so Gmail and .eml imports dedupe against each other. Reuse M03's email mapping.
5. Write docs/connectors/gmail.md (Google Cloud project, testing-mode consent, OAuth client), each step verified against Google's docs.
6. The live run needs my Google OAuth client JSON. If missing, set blocked and tell me.
7. Commits "m08b: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m08b-gmail-connector.md.
```

## M02b — LLM sign-in (Wave 2)

```
You are <AGENT>, building module M02b (LLM sign-in: OpenRouter OAuth PKCE + experimental ChatGPT login) of Waada.

1. Read AGENTS.md completely, then tasks/M02b-llm-signin.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Part 1, OpenRouter PKCE: build it, following OpenRouter's official OAuth docs exactly.
4. Part 2, ChatGPT login: RESEARCH ONLY. Write findings with sources in docs/decisions/llm/providers.md, add a proposal to docs/decisions/PROPOSALS.md (mechanism, terms-of-service and breakage risks), then STOP and wait for my decision. Do not implement it without my approval.
5. Never log tokens or keys.
6. Commits "m02b: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m02b-llm-signin.md.
```

## M08c — HubSpot connector (Wave 3)

```
You are <AGENT>, building module M08c (HubSpot connector) of Waada.

1. Read AGENTS.md completely, then tasks/M08c-hubspot-connector.md.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. @hubspot/api-client (S19), read-only scopes, verified against HubSpot's docs. Provide crmFields() and fetchInteractions() only; M05 already consumes crmFields.
4. Write docs/connectors/hubspot.md, including creating a sample deal from seed/acme/crm.json.
5. Live test needs HUBSPOT_TOKEN. If missing, set blocked and tell me.
6. Commits "m08c: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m08c-hubspot-connector.md.
```

## M09 — Live capture (Wave 3)

```
You are <AGENT>, building module M09 (Live capture: Google Meet WXT extension + capture routes) of Waada.

1. Read AGENTS.md completely, then tasks/M09-live-capture.md.
2. Superpowers workflow (AGENTS.md §4). In brainstorming, confirm with me how caption revisions are de-duplicated before building. You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. WXT (S9) only; no other packages without a proposal. Keep all Meet DOM selectors in one selectors.ts file.
4. Consent is a requirement: a visible capturing indicator, and a popup reminder to announce transcription.
5. Accept requests only from the extension's origin. The app stays on localhost.
6. Document limitations honestly in docs/capture.md.
7. Commits "m09: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m09-live-capture.md.
```

## M10 — Integration, docs & demo (Wave 3, last)

```
You are <AGENT>, building module M10 (Integration, docs & demo) of Waada.

1. Read AGENTS.md completely, then tasks/M10-integration-docs.md, then docs/PROGRESS.md and every file in docs/reports/.
2. Superpowers workflow (AGENTS.md §4). You work in C:\Code-Files\Waada on the shared branch `dev`, in parallel with other agents in the same folder. Never switch branches or run checkout/stash/reset/restore/clean. Stage only your own files with explicit paths (never `git add -A` or `git add .`). Update your row in docs/PROGRESS.md.
3. Run the end-to-end live test and the robustness checklist, and report real results, including failures.
4. Rewrite the outdated Python-era docs to match what was actually built. Every command in the docs must have been run once.
5. Replace "7 → 0" with the measured result from docs/decisions/llm/evals.md, or label it clearly as a target. Remove unverified competitor claims.
6. Code fixes in other modules: note them in docs/PROGRESS.md for their owner, or propose a small fix for my approval. Don't silently edit their files.
7. Commits "m10: <change>", NO AI attribution. Push `dev` per AGENTS.md §3. Report in docs/reports/m10-integration.md, including the timed fresh-clone setup.
```
