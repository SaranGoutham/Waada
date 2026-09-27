# Card 002 — OpenCode — M05 Agent core: baselines and compare

**Worker:** OpenCode · **Module:** M05 · **Issued by:** master, 2026-09-27

## Goal
Implement `baselineCrm`, `baselineSummary` and `compare` exactly as AGENTS.md §6.8 and `tasks/M05-agent-core.md` step 6 describe, test-first, so the web app's Compare page can use real data.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a, §6.8), `tasks/M05-agent-core.md`, `docs/superpowers/plans/2026-09-27-m05-agent-core.md`, `seed/acme/crm.json`.

## Current state (checked by master)
`commitmentLedger`, `landmines`, `brief` and `ask` are implemented and committed (f47c397, 93cce28, e10626f, 4d50d7c); the full suite is 101 green. Pushing is the master's job now; don't retry pushes.

## Files you may change
`packages/core/src/agent/**`, `packages/core/test/agent*.test.ts` (**not** `*.live.test.ts` in this card), `docs/superpowers/plans/2026-09-27-m05-agent-core.md` (tick boxes only), `docs/decisions/llm/prompts/*`, `docs/decisions/llm/task-routing.md`.
**Don't touch:** `apps/**`, `package.json`, `pnpm-lock.yaml`, `docs/PROGRESS.md`, other modules.

## Steps (TDD for each function)
1. `baselineCrm(account, deps?)`: input is **only** `seed/<account>/crm.json` (HubSpot is post-MVP; ignore it). Same model, same output format as the brief. Tests: never calls `memory`; prompt contains only CRM fields.
2. `baselineSummary(account, deps?)`: read `seed/<account>` through `parseFiles` (M03), sort by date, concatenate, truncate to a documented character budget. **No Hindsight.** Tests: never calls `memory`; content is ordered by date; truncation works.
3. `compare(account, deps?)` → `{ crm, summary, waada }`, where `waada` is `brief(...).markdown`. Run the three in parallel. One failing leg returns its error message in that column instead of failing the whole compare.
4. Version any new prompts in `docs/decisions/llm/prompts/` and note model/temperature in `task-routing.md`.
5. **Skip** `report()` (should-have tier) and the live eval (needs a Groq key; the master will issue a separate card).

## Acceptance (paste real output)
- `npx pnpm@12.6.0 --filter @waada/core test` → green, including new tests
- `npx pnpm@12.6.0 check` → passes. If it fails **only** because of `apps/web` config (Codex is fixing that in card 001), report it and don't touch `apps/`.
- `git log --oneline -5` shows your `m05:` commits

## Rules
Commits start with `m05:`, with **no** AI attribution. Stage explicit paths only. **Don't push.** Codex may be working in `apps/web/**` at the same time: don't touch it. End with the WORKER REPORT block from AGENTS.md §4a.
