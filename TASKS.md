# Build Plan — Modules for Parallel Agents

**Since 2026-09-27: Claude Code is the master; Codex and OpenCode are workers dispatched by the master with task cards (AGENTS.md §4a). You talk only to the master.** The build is split into **modules**. To start an agent on a module, give it this prompt:

> Read `AGENTS.md` fully, then `tasks/<MODULE>.md`. Follow the Superpowers workflow in AGENTS.md §4. Update your row in `docs/PROGRESS.md`. Do not choose any stack item that isn't Approved in AGENTS.md §5. Ask via `docs/decisions/PROPOSALS.md` instead.

## Today's target (2026-09-27): first working UI

By end of day, this must work on `localhost`, with the real core wherever it's already built:

1. `pnpm --filter web dev` starts the web app.
2. **Settings → LLM:** paste a Groq key, click **Test**, and it says OK.
3. **Accounts:** create "Acme Corp".
4. **Import:** drag in the files from `seed/acme` → preview table → **Import** → IngestReport (real M03 + M01 → Hindsight).
5. **Brief:** open commitments and landmines tables plus the brief text. Real M05 if it has landed; otherwise fake data with a visible "sample data" banner.
6. **Ask:** a question returns an answer with citations (real once M05's `ask` lands).

| Who | Today |
|---|---|
| **Codex (worker): M06** | Code **now** (exception to the wave gate, see AGENTS.md §4): scaffold, Settings→LLM, Accounts, Import (real), then Brief and Ask pages, first on fakes, then swapped to real functions as M05 lands |
| **OpenCode (worker): M05** | `brief` (commitment ledger + landmines) and `ask` first; `compare` and baselines after. Push each function as soon as its tests pass, so M06 can wire it |
| **Claude Code (master)** | Dispatches and reviews the workers' cards, pushes, runs the e2e live test once a Groq key exists, reports to you. (M00 test fix and e2e test: done.) |
| **You** | Review the Acme data (M04), add a Groq key, mark M01–M04 `done` if their reports look right |

Compare page, eval and docs are tomorrow.

## MVP scope (decided 2026-09-27)

**Must-have only.** The MVP is a simple working prototype; see [AGENTS.md §1a](AGENTS.md) for the goal, the 5 success criteria and the tier rules.

| Tier | Modules |
|---|---|
| **Must-have (MVP)** | M00, M01, M02, M03, M04, M05, M06 (MVP pages only), M10 (MVP docs + e2e + demo) |
| **Should-have** (after the MVP works) | M07 MCP server, M02b OpenRouter sign-in, `report()` + Report page |
| **Later** (post-MVP) | M08a Slack, M08b Gmail, M08c HubSpot, M09 Meet capture, Slack `.zip` (P-003), ChatGPT login (deferred) |

## Module map

| ID | Module | Brief | Needs to run for real | Size | Day |
|---|---|---|---|---|---|
| **M00** | Foundation: pnpm workspace, `@waada/core` contracts, config, store, fakes, Biome, Vitest | [M00](tasks/M00-foundation.md) | — | S | 1 |
| **M01** | Memory: Hindsight TS client wrapper + live smoke test | [M01](tasks/M01-memory.md) | M00 | S | 1 |
| **M02** | LLM core: AI SDK providers (API keys), settings, `extract` retry/fallback, transcription | [M02](tasks/M02-llm-core.md) | M00 | M | 1 |
| **M02b** | LLM sign-in: OpenRouter OAuth PKCE + experimental ChatGPT login | [M02b](tasks/M02b-llm-signin.md) | M02, M06 | M | 2 |
| **M03** | Ingest: pipeline + dedupe; `.eml`, Slack export, transcripts, audio | [M03](tasks/M03-ingest.md) | M00 (M01, M02 for real runs) | M | 1 |
| **M04** | Synthetic data: long Acme history + Nova, as real export files | [M04](tasks/M04-synthetic-data.md) | — | M | 1 |
| **M05** | Agent core: commitment ledger, landmines, brief, ask, report, baselines | [M05](tasks/M05-agent-core.md) | M00 (M01, M02 for real runs) | L | 1–2 |
| **M06** | Web app: TanStack Start + Tailwind + shadcn/ui (Import, Brief, Ask, Compare, Settings, Connectors) | [M06](tasks/M06-web-app.md) | M05 contract | L | 2 |
| **M07** | MCP server (stdio) | [M07](tasks/M07-mcp-server.md) | M05 contract | S | 2 |
| **M08a** | Connector: Slack | [M08a](tasks/M08a-slack-connector.md) | M00 | S | 2 |
| **M08b** | Connector: Gmail | [M08b](tasks/M08b-gmail-connector.md) | M00, M06 (OAuth callback route) | M | 2 |
| **M08c** | Connector: HubSpot | [M08c](tasks/M08c-hubspot-connector.md) | M00 | M | 3 |
| **M09** | Live capture: `/api/capture/meet` route + WXT Meet extension | [M09](tasks/M09-live-capture.md) | M03, M06 | L | 3 |
| **M10** | Integration, docs & demo | [M10](tasks/M10-integration-docs.md) | all | M | 3 |

Size: S ≈ 1–2 h · M ≈ 2–4 h · L ≈ 4–6 h of agent time. These are estimates, not measurements.

## Dependency graph

```
M04 data ───────────────────────────────────────────────────────┐
                                                                ▼
M00 ─┬─ M01 memory ─┐                                     M10 integration
     ├─ M02 llm ────┼─ M05 agent ─┬─ M06 web app ─┬─ M02b sign-in   ▲
     ├─ M03 ingest ─┘             │               ├─ M08b Gmail ───┤
     │      └──────────────────── │ ───────────── └─ M09 capture ──┤
     │                            └─ M07 MCP ──────────────────────┤
     ├─ M08a Slack ────────────────────────────────────────────────┤
     └─ M08c HubSpot ──────────────────────────────────────────────┘
```

Every module codes against the contracts in AGENTS.md §6 and tests with fakes, so **everything after M00 can start in parallel**. "Needs to run for real" means an end-to-end run requires it, not that the agent must wait to start.

## Hand-out waves

| Wave | Start together | Gate before the next wave |
|---|---|---|
| **0** | M00 (one agent, small, first) · M04 (no code; can start now) | M00 `done` on `dev`: `pnpm install && pnpm check && pnpm test` green |
| **1** | M01 · M02 · M03 · M05 | Live smoke test passes against Hindsight; `seed/acme` ingests; `brief("acme")` lists the Sep 2 commitment as **open** |
| **2** | M06 (MVP pages) | The web app shows the same brief as `brief("acme")` |
| **3** | M10 (MVP scope) | All 5 success criteria in AGENTS.md §1a pass → **MVP done** |
| *should-have* | M07 · M02b (OpenRouter) | Only after the MVP is done |
| *later* | M08a · M08b · M08c · M09 | Post-MVP; not scheduled |

## Branch & milestone merges

**One folder, one shared branch.** All agents work in parallel in `C:\Code-Files\Waada` on branch **`dev`** (created on `origin` 2026-09-27). There are no per-module branches; each commit's `mNN:` prefix shows which module it belongs to (`git log --oneline --grep "^m03:"`). Agents follow AGENTS.md §3: they stage only their own files, never switch branches, and never break `pnpm check && pnpm test`.

**Your folder stays on `dev`** while agents run. Don't check out `main` in it while any agent is working; do milestone merges when agents are idle (or merge on GitHub, see below).

**Milestone merges (you merge `dev` → `main`; agents never touch `main`):**

| Milestone | Modules that must be `done` in docs/PROGRESS.md | Also check |
|---|---|---|
| **MS0: foundation** | M00, M04 | You reviewed the Acme data |
| **MS1: core works** | M01, M02, M03, M05 | Live smoke test passes; `brief("acme")` shows the Sep 2 commitment open; M05 eval recorded |
| **MS2: web app** | M06 | Web app shows the same brief as `brief("acme")` |
| **MS3: MVP** | M10 | All 5 success criteria in AGENTS.md §1a pass |
| **MS4: should-have** | M07, M02b | MCP and OpenRouter sign-in work (after the MVP) |

`dev` may also contain partly-built work of later modules at merge time. That's acceptable because every commit on `dev` must keep checks green.

**Option A: on GitHub (no folder switching, safe while agents run).** Open a pull request `dev → main` titled `MS0: foundation`, check that CI or your local `pnpm check && pnpm test` is green, merge with "Create a merge commit". Then locally: `git fetch origin`.

**Option B: locally (only when no agent is running):**

```bash
git checkout main && git pull
git merge --no-ff dev -m "MS0: foundation"
pnpm install && pnpm check && pnpm test        # must be green
git push origin main
git tag ms0 && git push origin ms0             # marks the milestone
git checkout dev                               # back to dev before agents resume
```

## Human checklist (you, not an agent)

- [ ] **Stack decisions**: done 2026-09-27 (AGENTS.md §5). Answer new entries in `docs/decisions/PROPOSALS.md` as they arrive. **P-001 (.eml library) is open now.**
- [ ] Install pnpm: `corepack enable pnpm` (Node v22.15.0 is installed)
- [ ] Superpowers for **OpenCode**: tell OpenCode *"Fetch and follow instructions from https://raw.githubusercontent.com/obra/superpowers/refs/heads/main/.opencode/INSTALL.md"*. Claude Code has it; confirm it's enabled in Codex.
- [ ] Rename `@CLAUDE.md` → `CLAUDE.md` (its content `@AGENTS.md` makes Claude Code load these rules)
- [ ] Before Wave 1: Hindsight Cloud keys (`HINDSIGHT_BASE_URL`, `HINDSIGHT_API_KEY`) and/or local Docker Hindsight; at least one LLM key (Groq is the default)
- [ ] Before M08a: Slack test workspace + app + bot token + `#deal-acme` channel
- [ ] Before M08b: Google Cloud project, OAuth client, your Gmail added as a test user
- [ ] Before M08c: HubSpot developer account + private app token
- [ ] Before M02b: an OpenRouter account (for testing sign-in)
- [ ] Merge `dev` → `main` at each milestone (MS0–MS3); watch `docs/PROGRESS.md`

## Definition of done (whole MVP)

All 5 success criteria in [AGENTS.md §1a](AGENTS.md) pass, checked by M10's end-to-end test and demo run. Connectors, Meet capture, MCP and sign-in are **not** part of MVP done.
