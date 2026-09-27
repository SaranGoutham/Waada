# AGENTS.md — Rules for every coding agent working on Waada

Waada is built **in parallel by several agents** (Claude Code, Codex, OpenCode). Each agent owns one module. This file is the shared contract. Read it fully before doing anything, then read **your module brief in [`tasks/`](tasks/)**.

**Source of truth, in order:** this file → your `tasks/Mxx-*.md` brief → [ARCHITECTURE.md](ARCHITECTURE.md). Other docs (README, SETUP, WORKFLOW, PIPELINE, DATA_PLAN, DEMO_SCRIPT, SOLUTION_DESIGN) still describe an earlier **Python** plan and are rewritten by module M10. Where they conflict with this file, this file wins.

## 1. What Waada is (30 seconds)

A deal-continuity agent. Sales interactions (emails, Slack, call and meeting transcripts) are stored in a **per-account Hindsight memory bank**. When a sales rep leaves, the new owner gets a briefing that leads with **open commitments** (the promise ledger) and **landmines** (resolved objections not to re-open). Background: [README.md](README.md), [MARKET_ANALYSIS.md](MARKET_ANALYSIS.md).

## 1a. MVP goals (decided by the human, 2026-09-27). Read before choosing any work

**The MVP is a simple working prototype. Improve later.** Build the must-have tier first, and nothing outside it until it works.

> **Goal:** A new sales rep opens the Waada web app, imports a departed rep's exported emails, Slack and call transcripts for one account, and within a minute sees a brief that leads with **open commitments** and **landmines**, stored in and recalled from Hindsight.

**Success criteria (all must pass):**
1. On `seed/acme`, the brief's **first item is the open Sep 2 commitment**, and the **pricing landmine** is present.
2. `ask("acme", "What changed since July?")` returns the Q3 → Q4 move.
3. The Compare page shows Waada vs the CRM-only and summary-only baselines; the evaluation result (`docs/decisions/llm/evals.md`) is recorded honestly, even if unflattering.
4. Fresh clone → working brief in **under 30 minutes** with **one** LLM key (Groq).
5. The demo runs start to finish with no crash and no stack trace.

| Tier | Modules / scope | Rule |
|---|---|---|
| **Must-have (the MVP)** | M00–M05 · **M06** limited to Import, Brief, Commitments, Ask, Compare, Settings→LLM (API key) · **M10** limited to MVP docs, e2e test and demo | Work on these first |
| **Should-have** | **M07** MCP server · **M02b** OpenRouter sign-in · M05 `report()` with `reflect()` · M06 Report page | Only after every must-have module is `done` |
| **Later (post-MVP)** | **M08a/b/c** connectors · **M09** Meet capture · M06 Connectors page · Slack `.zip` (P-003) · ChatGPT login (deferred, ADR 0001) | Don't start. Don't reserve. |

Anything not needed for the success criteria is out of MVP scope, even inside a must-have module. When unsure, build the simpler version and note the fuller one as a follow-up in your report.

## 2. Hard rules

1. **Stay in your lane.** Only create or edit files listed under "Files you own" in your brief (plus your own docs under §4 paths). Need something from another module that isn't built yet? Code against the **contract in §6** and test with the fakes in `packages/core/test/fakes.ts`.
2. **Never change a contract (§6) on your own.** Write a proposal in [`docs/decisions/PROPOSALS.md`](docs/decisions/PROPOSALS.md) and stop that part of the work. The human decides.
3. **The human decides the stack. Never choose it yourself.** Use only what is **Approved** in §5. Anything not listed (a new npm package, framework, database, API, cloud service, even a small utility library) → add a proposal to `docs/decisions/PROPOSALS.md` (what, why, alternatives) and **wait**. No placeholder choices. Node built-ins (`node:crypto`, `node:fs`, …) don't need approval.
4. **Only `packages/core/src/memory/` imports `@vectorize-io/hindsight-client`. Only `packages/core/src/llm/` imports `ai` / `@ai-sdk/*` / provider packages.** Everything else goes through those modules.
5. **No network in unit tests.** Use `FakeMemory` / `FakeLLM`. Tests hitting real services live in `*.live.test.ts` and run only with `pnpm test:live`.
6. **No secrets in code or git.** Hindsight settings come from `.env`; LLM keys and tokens live in `.waada/` (gitignored). Never log a key.
7. **No invented facts about external APIs.** Check official docs (links in your brief) for Hindsight, the AI SDK, OpenRouter, Gmail, Slack, HubSpot, MCP, WXT, and TanStack. If you can't verify something, leave a `// VERIFY:` comment and list it in your report.
8. **Friendly failures.** Web UI, MCP and API routes never show a stack trace. Core code throws `WaadaError` subclasses (safe messages); surfaces catch them and show the message.
9. **Say your dependencies up front.** At the start of every chat, before writing code, tell the human in one short list which other modules your work depends on, whether each is `done` (check `docs/PROGRESS.md`), and what you'll do meanwhile (fakes, spec/plan only, or wait). Repeat it whenever a dependency blocks you.
10. **End every finished chat with the next prompt.** When a chat's task is done (module finished, checkpoint, or waiting on the human), the last thing in your reply is exactly one ready-to-paste prompt for the next chat (§4).

## 3. Conventions

- **TypeScript**, `strict: true`, ESM. Node ≥ 22. Package manager **pnpm** (workspace).
- **Zod** schemas are the single definition of every cross-module type (`z.infer` for TS types).
- Format and lint: **Biome** (`pnpm check`). Tests: **Vitest** (`pnpm test`).
- Dates cross module boundaries as **ISO-8601 UTC strings** (serializable for server functions, MCP, and JSON files).
- No `console.log` in `packages/core`. Use the logger from `packages/core/src/log.ts`.
- **Git: one folder, one branch, many agents.** All agents work **in parallel** in `C:\Code-Files\Waada` on the shared branch **`dev`**. Never run `git checkout` / `git switch` / `git stash` / `git reset` / `git restore` / `git clean`: other agents' uncommitted work is in the same folder, and those commands would change or destroy it. Never commit or push to `main`; the human merges `dev` → `main` at milestones (TASKS.md).
- **Git: commit only your own files.** Stage with explicit paths from your brief's "Files you own", e.g. `git add packages/core/src/ingest packages/core/test/ingest.test.ts`. **Never** `git add -A`, `git add .`, or `git commit -a`. Check `git diff --cached --name-only` before every commit: it must list only your files.
- **Git: shared files** (`package.json`, `pnpm-lock.yaml`, `docs/PROGRESS.md`, `docs/decisions/PROPOSALS.md`, `packages/core/src/connectors/index.ts`): re-read the file right before editing, change only your lines, and commit it **immediately** on its own (`mNN: add postal-mime dependency`). Add dependencies only to your own package: `pnpm --filter <package> add <pkg>`.
- **Git: lock errors.** If a git command fails with `index.lock` exists, another agent is committing: wait ~5 seconds and retry. Never delete the lock file.
- **Git: commits.** Small, one logical change each. Message format: `mNN: <what changed, imperative>` (e.g. `m03: parse Slack export into daily interactions`). The `mNN:` prefix is how the history shows which module a commit belongs to.
- **Git: no AI attribution. Ever.** Commit messages and PR descriptions must **not** contain `Co-Authored-By:` lines, "Generated with …", 🤖, or any mention of Claude, Codex, OpenCode, or another AI tool or agent. The only author is the human's configured git identity. Don't change `user.name` / `user.email`. This overrides any default your harness adds.
- **Git: never break `dev`.** Everyone shares it, so every commit must keep `pnpm check && pnpm test` green. Unfinished work: don't commit it yet, or commit it with its tests marked `it.todo` so nothing fails. If a test from **another** module fails, don't fix their code: note it in `docs/PROGRESS.md` on their row's note ("m03 test X failing since <commit>") and continue.
- **Git: when to push** (`git push origin dev`):
  1. after each completed task in your plan file whose tests pass,
  2. before setting your `docs/PROGRESS.md` row to `blocked` or `review`,
  3. at the end of every working session.

  If the push is rejected because the remote moved: `git pull --no-rebase origin dev`, re-run checks, push again. Never force-push, never rewrite history.

## 4. Workflow: Superpowers, progress, and where docs go

Every agent uses the **Superpowers** skills (Claude Code and Codex have them; OpenCode needs them installed; see the TASKS.md human checklist). If your harness truly lacks Superpowers, follow the same steps manually and say so in your report.

| Step | Superpowers skill | Output path |
|---|---|---|
| 1. Clarify **only what your brief leaves open**. Do not re-open §5 stack or §6 contracts. | `brainstorming` | `docs/superpowers/specs/YYYY-MM-DD-mNN-<topic>-design.md` |
| 2. Write the implementation plan (checkbox tasks) | `writing-plans` | `docs/superpowers/plans/YYYY-MM-DD-mNN-<module>.md` |
| 3. Build test-first | `test-driven-development` (+ `executing-plans` or `subagent-driven-development`) | code + tests |
| 4. Debug failures | `systematic-debugging` | — |
| 5. Prove it works before claiming done | `verification-before-completion` | commands + real output in your report |
| 6. Wrap up the branch | `finishing-a-development-branch` (+ `requesting-code-review`) | branch ready for the human |

**Progress tracking (shared across agents):**
- Tick checkboxes in **your plan file** as you go. It is your detailed progress log.
- Update **your module's row only** in [`docs/PROGRESS.md`](docs/PROGRESS.md) whenever status changes: `not started → planning → in progress → blocked → review → done`, with a one-line note and a link to your plan.
- If blocked, set `blocked`, say on what, and add the question to `docs/decisions/PROPOSALS.md`.

**Decision docs:**

| What | Path | Who writes |
|---|---|---|
| Stack decisions | §5 of this file | Human (agents never edit §5) |
| Open questions / proposals awaiting the human | `docs/decisions/PROPOSALS.md` | Any agent appends; the human answers |
| Decided design choices (why X over Y) | `docs/decisions/NNNN-short-title.md` (ADR: Context · Decision · Consequences) | Agent, **after** the human approves the proposal |
| LLM prompt and model choices (prompt versions, which model does which task, eval notes) | `docs/decisions/llm/` | M02 and M05 |
| Module specs and plans | `docs/superpowers/specs/`, `docs/superpowers/plans/` | Owning agent |
| Final module report | `docs/reports/mNN-<module>.md` | Owning agent, at the end |
| Context-checkpoint handoffs | `docs/handoffs/mNN-YYYY-MM-DD-HHMM.md` | Owning agent, at each checkpoint (see below) |

**Final report must contain:** what was built, test commands with real output, anything unverified (`// VERIFY:` list), proposals raised, and follow-ups for other modules.

### Context checkpoints: hand off to a fresh chat

Long sessions degrade. Hand off to a new chat instead of pushing on with a full context.

**When:** any of these, whichever comes first:
- your harness warns that context is running low, or is about to compact or summarize the conversation;
- you've finished a plan phase and the conversation is already long (use your judgement; earlier is better than later);
- the human types **`checkpoint`**.

**What to do, in order:**
1. Finish or pause the current step at a clean point. Commit everything that passes `pnpm check && pnpm test` (explicit paths only), then `git push origin dev`. **Never delete, stash or reset** unfinished work; leave it in place and list it in the handoff.
2. Tick completed checkboxes in your plan file.
3. Update your row in `docs/PROGRESS.md` (note: `checkpoint → see docs/handoffs/<file>`).
4. Write the handoff file **`docs/handoffs/mNN-YYYY-MM-DD-HHMM.md`** containing:
   - **Module and goal** (one line) · **Plan file** path · **Spec file** path (if any)
   - **Done:** completed plan tasks, with commit hashes (`git log --oneline --grep "^mNN:"`)
   - **Next:** the exact next unchecked plan task, and the first concrete action to take
   - **Uncommitted work:** file paths left in the folder and their state ("half-written parser, tests not started")
   - **Decisions made this session** that aren't in the spec or plan, and why
   - **Open questions / waiting on the human:** with `PROPOSALS.md` IDs
   - **Gotchas learned:** anything the next session would otherwise rediscover the hard way (API quirks, failing tests that belong to other modules, env setup)
   - **How to verify the current state:** exact commands and the expected result
5. Commit the handoff file on its own (`mNN: checkpoint handoff`) and push.
6. **Reply to the human with a ready-to-paste prompt** in one code block, in this form:

```
You are <AGENT>, continuing module MNN (<name>) of Waada from a checkpoint. Read AGENTS.md fully, then tasks/MNN-<name>.md, then the handoff docs/handoffs/<file>.md, then the plan <plan path>. Resume at: <next task, in one line>. Work on branch dev with other agents in parallel: never switch branches, and stage only your own files. Update your row in docs/PROGRESS.md. Commits start with "mNN:" and have no AI attribution.
```

Then stop. Don't start new work in the old chat.

### Module finished: hand yourself the next module

When your module reaches `review` or `done` (report written, pushed), don't stop silently. Pick up the next piece of work:

1. Open `TASKS.md` (Module map, Hand-out waves) and `docs/PROGRESS.md`.
2. Choose the **first module in map order** whose Owner is `—`, whose wave is open, **and whose tier is allowed (§1a)**: must-have first; should-have only once all must-have modules are `done`; never a "later" module.
   - **Wave 0** is open from the start. **Wave 1** is open once M00 is `done`. **Wave 2** (M06) is open once M01, M02, M03 and M05 are `done`. **Wave 3** (M10) is open once M06 is `done`. **Should-have** (M07, M02b Part 1) opens once M10's MVP checks pass.
   - A module in the **next** wave (not yet open) may be taken for **brainstorming and planning only**: write the spec and plan, then set status `planning (waiting for wave)` and write no code until the wave opens.
3. **Reserve it:** set that row's Owner to `<your tool name> (next)`, then commit and push `docs/PROGRESS.md` alone right away. This stops two agents picking the same module. Re-read the file first; if someone else reserved it in the meantime, pick the next one.
4. Reply to the human with a ready-to-paste prompt in one code block, then stop:

```
You are <AGENT>, working on module MNN (<name>) of Waada. Read AGENTS.md fully, then tasks/MNN-<name>.md, and follow them. <Any stop-point from the brief, e.g. "Show me the Acme timeline before writing files.">. <If its wave isn't open: "Spec and plan only; write no code until <gate> is done.">. Work on branch dev with other agents in parallel: never switch branches, and stage only your own files. Update your row in docs/PROGRESS.md. Commits start with "mNN:" and have no AI attribution.
```

If no module is available, say so and suggest what the human could merge or unblock.

**Every reply that ends a chat** (checkpoint or module finished) ends with exactly one ready-to-paste prompt, so the human never has to write one.

### The new chat's first steps

Read in the order the prompt lists, run the handoff's "How to verify" commands, and confirm the state matches before writing any code. If it doesn't match (e.g. another agent's commit changed something), say so to the human before continuing.

## 5. Stack decisions (approved by the human, 2026-09-27)

| # | Area | Decision | Status |
|---|---|---|---|
| S1 | Language | **TypeScript everywhere** (core, web app, MCP, connectors, extension) | Approved |
| S2 | Memory | **Hindsight** via `@vectorize-io/hindsight-client`. Support **both** Hindsight Cloud and local OSS in Docker; only `HINDSIGHT_BASE_URL` / `HINDSIGHT_API_KEY` change | Approved |
| S3 | LLM | **Vercel AI SDK** (`ai`) as the only LLM layer. User picks a provider in Settings: **Groq** (default `openai/gpt-oss-120b`, fallback `qwen/qwen3-32b`), **OpenAI**, **Anthropic**, **Google**, **OpenRouter** (API key or **OpenRouter OAuth PKCE sign-in**), **Ollama** (local). Plus **OpenAI ChatGPT-subscription login**: ⚠️ unofficial, not an OpenAI program. It must be optional, isolated in one adapter, labelled "experimental" in the UI, and the app must fully work without it | Approved |
| S4 | Speech-to-text | Whisper through whichever configured provider supports it (Groq or OpenAI), via the AI SDK | Approved |
| S5 | CLI | **None.** Surfaces are the web app and MCP | Approved |
| S6 | Web app (UI + backend) | **TanStack Start** full stack (TanStack Router, server functions, server routes) | Approved |
| S7 | Capture endpoint | TanStack Start **server route** (`POST /api/capture/meet`) in the same app | Approved |
| S8 | MCP | Official MCP TypeScript SDK, **stdio only** in the MVP. Streamable HTTP is added later, together with auth | Approved |
| S9 | Browser extension | Chrome MV3, TypeScript + **WXT** | Approved |
| S10 | CRM connector | **HubSpot** (private app token) | Approved |
| S11 | Email connector | **Gmail only**, `googleapis` npm, Google OAuth | Approved |
| S12 | Slack connector | `@slack/web-api`, bot token, pull-based history | Approved |
| S13 | Local app data | **JSON files in `.waada/`** (dedupe manifest, connector sync state, LLM settings and keys, live-capture buffers) | Approved |
| S14 | Test / lint | **Vitest** + **Biome** | Approved |
| S15 | Auth | **None in the MVP** (added later). Web app binds to localhost; MCP is stdio | Approved |
| S16 | Package manager | **pnpm** workspace | Approved |
| S17 | UI styling | **Tailwind CSS + shadcn/ui** | Approved |
| S18 | Validation | **Zod** | Approved |
| S19 | HubSpot SDK | `@hubspot/api-client` | Approved |
| S20 | `.eml` parsing | `postal-mime` (P-001) | Approved |
| S21 | Ollama connection | Ollama's OpenAI-compatible endpoint (`http://localhost:11434/v1`) via `@ai-sdk/openai-compatible` (P-002). Ollama calls this compatibility experimental; transcription is not supported on this route | Approved |

No open stack questions right now. New ones go to `docs/decisions/PROPOSALS.md`.

## 6. Contracts (the interfaces every module codes against)

Created as real code by **M00 Foundation** in `packages/core/src/`. Until then, this section is the spec. All exported from `@waada/core`.

### 6.1 `models.ts` (Zod schemas; types via `z.infer`)

```ts
export const InteractionType = z.enum(["call", "email", "slack", "meeting", "note"]);
export const CommitmentStatus = z.enum(["open", "delivered", "unclear"]);

export const Interaction = z.object({
  account: z.string(),              // slug, e.g. "acme"
  sourceId: z.string(),             // stable id → Hindsight document_id: Message-ID | "slack:<channel>:<YYYY-MM-DD>" | "file:<sha256 first 16>" | "meet:<meetingId>" | "hubspot:<engagementId>"
  type: InteractionType,
  date: z.string().datetime(),      // real time of the interaction, UTC ISO
  title: z.string(),                // "Call #2 — pricing discussion"
  participants: z.array(z.string()),
  content: z.string(),
  source: z.enum(["eml", "slack_export", "transcript", "audio", "gmail", "slack_api", "hubspot", "meet"]),
});

export const MemoryHit = z.object({
  text: z.string(),
  date: z.string().datetime().nullable(),
  context: z.string().nullable(),   // "email — Security docs follow-up"
  documentId: z.string().nullable(),
});

export const Commitment = z.object({   // a promise our team made ("Promise" would clash with JS Promise)
  text: z.string(),                 // "Send SOC 2 Type II report"
  madeBy: z.string(),
  madeTo: z.string(),
  date: z.string().datetime().nullable(),
  status: CommitmentStatus,
  evidence: z.string(),             // why this status, citing the source
  source: z.string(),               // "Call #4 — Sep 2"
});

export const Landmine = z.object({
  topic: z.string(),                // "Monthly pricing"
  whatHappened: z.string(),
  resolution: z.string(),
  date: z.string().datetime().nullable(),
  guidance: z.string(),             // "Do NOT re-open; annual billing + 8% was accepted"
  source: z.string(),
});

export const Answer = z.object({ text: z.string(), citations: z.array(z.string()) });

export const Brief = z.object({
  account: z.string(),
  markdown: z.string(),
  commitments: z.array(Commitment),
  landmines: z.array(Landmine),
});

export const IngestReport = z.object({
  added: z.number().int(),
  skipped: z.number().int(),        // already ingested (dedupe)
  errors: z.array(z.string()),
});

export const FileInput = z.object({ name: z.string(), data: z.instanceof(Uint8Array) });
```

### 6.2 `errors.ts`

```ts
export class WaadaError extends Error {}            // message is safe to show users
export class ConfigError extends WaadaError {}
export class ExternalServiceError extends WaadaError {}
```

### 6.3 `config.ts` and `store.ts`

```ts
// config.ts. Reads .env (Hindsight + optional connector secrets). Never throws at import.
export function getEnv(): { hindsightBaseUrl?: string; hindsightApiKey?: string; slackBotToken?: string;
  hubspotToken?: string; googleCredentialsPath?: string; dataDir: string /* default ".waada" */ };
export function requireEnv(...names: string[]): void;   // throws ConfigError listing missing vars
export function bankIdFor(account: string): string;     // "Acme Corp" → "waada-acme-corp"

// store.ts. JSON files under dataDir (S13). Atomic write (temp file + rename).
export function readJson<T>(relPath: string, schema: z.ZodType<T>, fallback: T): Promise<T>;
export function writeJson<T>(relPath: string, value: T): Promise<void>;

// accounts.ts. Account registry in .waada/accounts.json.
export const Account = z.object({ slug: z.string(), name: z.string(), createdAt: z.string().datetime() });
export function listAccounts(): Promise<Account[]>;
export function upsertAccount(a: { name: string; slug?: string }): Promise<Account>;  // slug defaults to slugify(name)
```

### 6.4 `memory/` (M01)

```ts
export interface Memory {
  ensureBank(account: string): Promise<string>;
  remember(i: Interaction): Promise<void>;
  search(account: string, query: string, opts?: { budget?: "low" | "mid" | "high"; maxResults?: number }): Promise<MemoryHit[]>;
  reflect(account: string, query: string): Promise<string>;
  deleteBank(account: string): Promise<void>;
}
export function createMemory(): Memory;
```

### 6.5 `llm/` (M02)

```ts
export interface LLM {
  chat(a: { system: string; user: string; temperature?: number }): Promise<string>;
  extract<T>(a: { system: string; user: string; schema: z.ZodType<T>; name: string;
    description: string; temperature?: number }): Promise<T | null>;
    // Structured output. Validate with the schema → on failure retry once with a repair prompt
    // → fall back to plain JSON parsing → return null. Never throws on malformed model output.
  transcribe(audio: Uint8Array, filename: string): Promise<string>;
}
export function createLLM(): Promise<LLM>;    // reads the user's provider settings from .waada/llm.json
export const LlmSettings: z.ZodType<...>;     // provider, model, fallbackModel, per-provider credentials
```

### 6.6 `ingest/` (M03)

```ts
export function ingest(items: Interaction[], deps?: { memory?: Memory }): Promise<IngestReport>;   // dedupe via .waada/manifest.json
export function parseFiles(files: FileInput[], account: string, deps?: { llm?: LLM }): Promise<{ interactions: Interaction[]; errors: string[] }>;  // dispatch by extension
// each parser: parse(file: FileInput, account: string, deps?): Promise<Interaction[]>
```

### 6.7 `connectors/` (M08a/b/c)

```ts
export function fetchInteractions(account: string, opts: { since?: string } & Record<string, unknown>): Promise<Interaction[]>;
// hubspot additionally:
export function crmFields(account: string, opts: Record<string, unknown>): Promise<Record<string, string>>;
```

### 6.8 `agent/` (M05)

Every function takes an optional last argument `deps?: { memory?: Memory; llm?: LLM }`.

```ts
export function commitmentLedger(account: string, deps?): Promise<Commitment[]>;
export function landmines(account: string, deps?): Promise<Landmine[]>;
export function brief(account: string, deps?): Promise<Brief>;
export function ask(account: string, question: string, deps?): Promise<Answer>;
export function report(account: string, deps?): Promise<string>;            // markdown incl. reflect() "learned patterns"
export function baselineCrm(account: string, deps?): Promise<string>;       // CRM fields only
export function baselineSummary(account: string, deps?): Promise<string>;   // all raw text, no Hindsight
export function compare(account: string, deps?): Promise<{ crm: string; summary: string; waada: string }>;
```

CRM fields for the baseline come from `seed/<account>/crm.json` unless HubSpot is configured.

## 7. Repository layout

```
apps/web/            TanStack Start app: UI, server functions, /api/capture/meet, OAuth callbacks   (M06, M02b, M09)
apps/extension/      WXT Chrome extension: Google Meet live captions                                (M09)
packages/core/       @waada/core: models, config, store, memory, llm, ingest, connectors, agent     (M00–M05, M08)
packages/mcp/        MCP stdio server over @waada/core                                               (M07)
seed/<account>/      synthetic export files + crm.json                                               (M04)
docs/                PROGRESS.md, decisions/, superpowers/specs|plans/, reports/
tasks/               one brief per module: your instructions
```
