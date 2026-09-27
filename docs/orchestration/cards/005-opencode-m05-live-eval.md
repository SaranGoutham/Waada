# Card 005 — OpenCode — M05 Agent core: live evaluation

**Worker:** OpenCode (run after card 003 is done and pushed) · **Module:** M05 · **Issued by:** master, 2026-09-27

## Goal
Write and run `packages/core/test/agent.eval.live.test.ts` exactly as `tasks/M05-agent-core.md` "Evaluation" describes, against `seed/acme`, with the real Groq model and real Hindsight. Record the result honestly in `docs/decisions/llm/evals.md` (MVP success criterion 3).

## Read first
`AGENTS.md` (§1a, §2, §3, §4a), `tasks/M05-agent-core.md` ("Evaluation"), `seed/acme/EXPECTED.md`, `packages/core/test/e2e.live.test.ts` (how live tests set up a bank).

## Current state (checked by master)
- `.env` has Hindsight settings and `GROQ_API_KEY`; card 003 made the env key work. **Never print or log key values.**
- All M05 functions exist, including `compare` and both baselines (card 002).

## Files you may change
`packages/core/test/agent.eval.live.test.ts` (new), `docs/decisions/llm/evals.md` (new), `docs/decisions/llm/prompts/*` and `docs/decisions/llm/task-routing.md` (only if a prompt fix is needed; version the prompt), `packages/core/src/agent/**` (only for a prompt fix the eval shows is needed), `docs/superpowers/plans/2026-09-27-m05-agent-core.md` (tick boxes), `docs/reports/m05-agent-core.md`.
**Don't touch:** `apps/**`, `package.json`, `pnpm-lock.yaml`, `docs/PROGRESS.md`, `.env`.

## Steps
1. Write the eval test: fresh bank for the account (use a unique slug so it doesn't collide with the web app's bank), ingest `seed/acme`, run `brief`, `ask("acme", "What changed since July?")` and `compare`, and score every check listed in "Evaluation" / `EXPECTED.md` for Waada **and** for both baselines.
2. Run it with `npx pnpm@12.6.0 test:live` (only this file if possible). Delete the test bank at the end.
3. Write `docs/decisions/llm/evals.md`: date, model, per-check pass/fail for Waada, CRM-only and summary-only. **If the summary baseline scores as well as Waada, say so plainly.**
4. At most **one** prompt-fix round if a Waada check fails for a clear prompt reason; version the prompt and rerun. Record both runs.
5. Update `docs/reports/m05-agent-core.md` with the results.

## Acceptance (paste real output)
- `npx pnpm@12.6.0 test:live` run of the eval file → output pasted (pass or fail, honestly)
- `npx pnpm@12.6.0 --filter @waada/core test` → green (unit tests; no network)
- `npx pnpm@12.6.0 check` → passes

## Rules
Commits start with `m05:`, with **no** AI attribution. Stage explicit paths only. **Don't push.** End with the WORKER REPORT block from AGENTS.md §4a.
