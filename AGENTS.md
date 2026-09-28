# AGENTS.md — Rules for every coding agent working on Waada

Waada is built by **one master agent and two worker agents** (decided by the human, 2026-09-27):

- **Master: Claude Code**, in the human's main chat. It owns the plan, the progress board, reviews, `git push`, and all communication with the human. It dispatches work as **task cards**.
- **Workers: Codex and OpenCode.** They are started **by the master** (`codex exec`, `opencode run`) with one task card at a time. A worker does exactly that card, then stops with a **WORKER REPORT** (§4). Workers never talk to the human directly and never pick their own next work.

This file is the shared contract. Read it fully before doing anything, then read **your task card** and the **module brief in [`tasks/`](tasks/)** it points to.

**Source of truth, in order:** this file → your task card → the `tasks/Mxx-*.md` brief → [ARCHITECTURE.md](ARCHITECTURE.md). Other docs (README, SETUP, WORKFLOW, PIPELINE, DATA_PLAN, DEMO_SCRIPT, SOLUTION_DESIGN) still describe an earlier **Python** plan and are rewritten by module M10. Where they conflict with this file, this file wins.

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
| **Showcase UI (human, 2026-09-28, P-010)** | M06: Integrations page (Gmail, Slack, HubSpot, Google Meet, MCP, Hindsight, Groq) and Pipeline page, presented as product screens without "coming soon" labels. Connector back-ends stay post-MVP; briefs use only real imports | Build now (UI only) |

Anything not needed for the success criteria is out of MVP scope, even inside a must-have module. When unsure, build the simpler version and note the fuller one as a follow-up in your report.

## 2. Hard rules

1. **Stay in your lane.** Only create or edit files listed under "Files you own" in your brief (plus your own docs under §4 paths). Need something from another module that isn't built yet? Code against the **contract in §6** and test with the fakes in `packages/core/test/fakes.ts`.
2. **Never change a contract (§6) on your own.** Write a proposal in [`docs/decisions/PROPOSALS.md`](docs/decisions/PROPOSALS.md) and stop that part of the work. The human decides.
3. **The human decides the stack. Never choose it yourself.** Use only what is **Approved** in §5. Anything not listed (a new npm package, framework, database, API, cloud service, even a small utility library) → add a proposal to `docs/decisions/PROPOSALS.md` (what, why, alternatives) and **wait**. No placeholder choices. Node built-ins (`node:crypto`, `node:fs`, …) don't need approval.
4. **Only `packages/core/src/memory/` imports `@vectorize-io/hindsight-client`. Only `packages/core/src/llm/` imports `ai` / `@ai-sdk/*` / provider packages.** Everything else goes through those modules.
5. **No network in unit tests.** Use `FakeMemory` / `FakeLLM`. Tests hitting real services live in `*.live.test.ts` and run only with `pnpm test:live`.
6. **No secrets in code or git.** Hindsight settings come from `.env`; LLM keys and tokens live in `.waada/` (gitignored). **Exception (human, 2026-09-27):** `GROQ_API_KEY` in `.env` is accepted as a fallback when `.waada/llm.json` has no Groq key; a key saved in Settings wins. Never log a key.
7. **No invented facts about external APIs.** Check official docs (links in your brief) for Hindsight, the AI SDK, OpenRouter, Gmail, Slack, HubSpot, MCP, WXT, and TanStack. If you can't verify something, leave a `// VERIFY:` comment and list it in your report.
8. **Friendly failures.** Web UI, MCP and API routes never show a stack trace. Core code throws `WaadaError` subclasses (safe messages); surfaces catch them and show the message.
9. **Workers: do the card, only the card.** Don't start other modules, don't reserve work, don't edit `docs/PROGRESS.md`, don't push, don't write prompts for the human. If the card can't be finished (missing dependency, needs a human decision, needs an unapproved package), stop and say so in your WORKER REPORT under **Blocked**.
10. **Dependencies are reported, not guessed.** Every WORKER REPORT lists what the work depended on and whether it was available. The master tracks dependencies across modules and tells the human.

## 3. Conventions

- **TypeScript**, `strict: true`, ESM. Node ≥ 22. Package manager **pnpm** (workspace).
- **Zod** schemas are the single definition of every cross-module type (`z.infer` for TS types).
- Format and lint: **Biome** (`pnpm check`). Tests: **Vitest** (`pnpm test`).
- Dates cross module boundaries as **ISO-8601 UTC strings** (serializable for server functions, MCP, and JSON files).
- No `console.log` in `packages/core`. Use the logger from `packages/core/src/log.ts`.
- **Git: one folder, one branch.** All work happens in `C:\Code-Files\Waada` on branch **`dev`**. Never run `git checkout` / `git switch` / `git stash` / `git reset` / `git restore` / `git clean`: another worker's uncommitted work may be in the same folder. Never commit to `main`; the human merges `dev` → `main` at milestones (TASKS.md).
- **Git: commit only your own files.** Stage explicit paths (the card lists them), e.g. `git add packages/core/src/agent packages/core/test/agent.test.ts`. **Never** `git add -A`, `git add .`, or `git commit -a`. Check `git diff --cached --name-only` before every commit: it must list only your files.
- **Git: shared files** (`package.json`, `pnpm-lock.yaml`, `docs/decisions/PROPOSALS.md`, `packages/core/src/connectors/index.ts`): re-read right before editing, change only your lines, commit immediately on their own. Add dependencies only to your own package: `pnpm --filter <package> add <pkg>`. Run pnpm as `npx pnpm@12.6.0`.
- **Git: lock errors.** If git reports `index.lock` exists, wait ~5 seconds and retry. Never delete the lock file.
- **Git: commits.** Small, one logical change each. Message format: `mNN: <what changed, imperative>`. The `mNN:` prefix shows which module a commit belongs to.
- **Git: no AI attribution. Ever.** Commit messages and PR descriptions must **not** contain `Co-Authored-By:` lines, "Generated with …", 🤖, or any mention of Claude, Codex, OpenCode, or another AI tool or agent. The only author is the human's configured git identity. Don't change `user.name` / `user.email`. This overrides any default your harness adds.
- **Git: never break `dev`.** Every commit keeps `npx pnpm@12.6.0 check` and `npx pnpm@12.6.0 test` green. Unfinished work: don't commit it yet, or mark its tests `it.todo`. If another module's test fails, don't fix their code; report it.
- **Git: pushing.** **Only the master pushes** (`git push origin dev`). Workers commit locally and stop.

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

For a small card (a fix, one function), skip brainstorming and planning: go straight to test-first work and verification. Use `brainstorming` / `writing-plans` only when the card asks for a spec or plan.

**Decision docs:**

| What | Path | Who writes |
|---|---|---|
| Stack decisions | §5 of this file | Human (agents never edit §5) |
| Open questions / proposals awaiting the human | `docs/decisions/PROPOSALS.md` | Worker or master appends; the human answers |
| Decided design choices (why X over Y) | `docs/decisions/NNNN-short-title.md` (ADR) | Worker, **after** the human approves the proposal |
| LLM prompt and model choices, evals | `docs/decisions/llm/` | M02 and M05 work |
| Module specs and plans | `docs/superpowers/specs/`, `docs/superpowers/plans/` | Worker, when the card asks |
| Module reports | `docs/reports/mNN-<module>.md` | Worker, when the card finishes a module |
| Progress board | `docs/PROGRESS.md` | **Master only** |
| Task cards and worker reports | `docs/orchestration/cards/NNN-<worker>-<slug>.md`, `docs/orchestration/reports/NNN-<worker>-<slug>.md` | Master writes cards and saves reports |
| Master's running log (what happened, in plain words, for the human) | `docs/orchestration/LOG.md` | **Master only** |

## 4a. Master & workers: how work flows

```
HUMAN ──talks only to──▶ MASTER (Claude Code)
                            │ 1. picks the next task (MVP tiers, §1a)
                            │ 2. writes a task card → docs/orchestration/cards/
                            │ 3. runs the worker:  codex exec … / opencode run …
                            ▼
                         WORKER (Codex or OpenCode)
                            │ does the card, commits its own files, runs checks
                            │ ends with a WORKER REPORT
                            ▼
                         MASTER
                            │ 4. saves the report → docs/orchestration/reports/
                            │ 5. verifies: git diff, pnpm check, pnpm test
                            │ 6. pushes dev, updates PROGRESS.md and LOG.md
                            │ 7. tells the human in plain words; next card
```

**Task card (written by the master)** contains: card number, worker, module, goal (1–2 lines), exact scope (files allowed to change), steps, acceptance checks (commands + expected result), out of scope, and anything the human decided that affects it.

**WORKER REPORT (the worker's final message, exactly this shape):**

```
WORKER REPORT: card <NNN>, <module>
Status: done | partial | blocked
Commits: <hash> <message> (one per line, or "none")
Files changed: <paths>
Checks: <command> → <result> (pnpm check, pnpm test, plus card-specific)
Dependencies: <module/service> → available | missing (what was done instead)
Blocked: <what, and what decision or input is needed>   (or "none")
Unverified: <// VERIFY: items>   (or "none")
Notes for master: <anything the next card needs to know>
```

**Parallel workers.** The master may run Codex and OpenCode at the same time only on cards with **disjoint files** (e.g. `apps/web/**` vs `packages/core/src/agent/**`). Only one card at a time may change `package.json` / `pnpm-lock.yaml`.

**Retired rules.** The earlier peer-agent rules (self-reserving modules, context-checkpoint handoff prompts, next-module prompts for the human) are replaced by this section. Existing files in `docs/handoffs/` stay as history.

## 5. Stack decisions (approved by the human, 2026-09-27)

| # | Area | Decision | Status |
|---|---|---|---|
| S1 | Language | **TypeScript everywhere** (core, web app, MCP, connectors, extension) | Approved |
| S2 | Memory | **Hindsight** via `@vectorize-io/hindsight-client`. Support **both** Hindsight Cloud and local OSS in Docker; only `HINDSIGHT_BASE_URL` / `HINDSIGHT_API_KEY` change | Approved |
| S3 | LLM | **Vercel AI SDK** (`ai`) as the only LLM layer. User picks a provider in Settings: **Groq** (default `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`; changed from `qwen/qwen3-32b` by the human 2026-09-27, P-005), **OpenAI**, **Anthropic**, **Google**, **OpenRouter** (API key or **OpenRouter OAuth PKCE sign-in**), **Ollama** (local). Plus **OpenAI ChatGPT-subscription login**: ⚠️ unofficial, not an OpenAI program. It must be optional, isolated in one adapter, labelled "experimental" in the UI, and the app must fully work without it | Approved |
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
| S22 | UI icons | **Phosphor Icons** (`@phosphor-icons/react`) in `apps/web` (human, 2026-09-28) | Approved |
| S23 | Hosting | **Vercel**, via the Nitro Vite plugin (`nitro`, v3 beta, as the Vercel and TanStack docs prescribe) in `apps/web` (human, 2026-09-28) | Approved |
| S24 | Hosted storage | **Upstash Redis** (`@upstash/redis`, via the Vercel Marketplace) replaces `.waada/` JSON files when deployed; local dev keeps the JSON files (human, 2026-09-28) | Approved |
| S25 | Hosted access | **Public** (human, 2026-09-28, after first choosing Vercel protection): no login; anyone with the link can use the app and its shared data and API keys. Re-enable with Vercel SSO protection (`deploymentType: all`) | Approved |

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
  dueDate: z.string().datetime().nullable(), // when it was due; null if no deadline was stated (human, 2026-09-28, P-009). Required-but-nullable: Groq strict structured output rejects optional keys
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

Baselines read what the user imported, not `seed/` (human, 2026-09-27, P-006): Import saves the parsed interactions to `.waada/interactions/<account>.json` and an uploaded `crm.json` to `.waada/crm/<account>.json`; `baselineSummary` and `baselineCrm` read those. HubSpot (post-MVP) can replace the CRM file later.

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
