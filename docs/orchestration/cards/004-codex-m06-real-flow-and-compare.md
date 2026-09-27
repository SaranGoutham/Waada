# Card 004 — Codex — M06 Web app: today's flow on real data, real Compare

**Worker:** Codex (run after cards 001, 002 and 003 are done and pushed) · **Module:** M06 · **Issued by:** master, 2026-09-27

## Goal
Make TASKS.md "Today's target" work end to end on `localhost` with the **real** core: Settings → LLM (Test OK) → Accounts (create "Acme Corp") → Import (`seed/acme`) → Brief → Ask. Wire the Compare page to the real `compare` from `@waada/core`.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a, §6), `tasks/M06-web-app.md`, the M06 spec and plan, `docs/reports/m06-web-app.md`, TASKS.md "Today's target".

## Current state (checked by master)
- Card 001 committed the web app; Brief and Ask use real `brief` / `ask`, with the `WAADA_FAKE_CORE=1` fallback.
- Card 002 added real `compare`, `baselineCrm`, `baselineSummary` to `@waada/core`.
- Card 003 made `GROQ_API_KEY` in `.env` work as a fallback; the Settings page should show Groq as configured when only the env key exists.
- `.env` has Hindsight settings and a Groq key. `.waada/` may be empty. **Never print or log key values.**

## Files you may change
`apps/web/**`, `docs/superpowers/plans/2026-09-27-m06-web-app.md` (tick boxes), `docs/reports/m06-web-app.md`.
**Don't touch:** `packages/**`, `package.json` at the root, `pnpm-lock.yaml` (unless a web dep is truly needed; then stop and report instead), `docs/PROGRESS.md`, `.env`.

## Steps
1. Compare page: call the real `compare(account)`. Show three columns (CRM-only, Summary-only, Waada). A failing column shows its error text, not a crash. Keep the fake fallback behind `WAADA_FAKE_CORE=1`.
2. Settings → LLM: if only the env key exists, show "Groq key from .env" (or similar), and **Test** must succeed with it.
3. Run the flow for real on `localhost` (dev server): Test → create "Acme Corp" → import every file in `seed/acme` → Brief → Ask "What changed since July?" → Compare. Fix anything that crashes or shows a stack trace (friendly-failure rule §2.8). Long operations show a loading state.
4. If something fails because of `packages/core` (not the web app), **don't fix it**: write it down under Blocked / Notes with the exact error message.
5. Update `docs/reports/m06-web-app.md` with what you ran and what you saw (including whether the Brief's first item is the open Sep 2 commitment and whether the pricing landmine appears).

## Acceptance (paste real output)
- `npx pnpm@12.6.0 check` → passes
- `npx pnpm@12.6.0 test` → all green
- `npx pnpm@12.6.0 --filter web build` → succeeds
- Short transcript of the real flow: Test result, IngestReport numbers (added / skipped / errors), first commitment in the Brief, landmines listed, the Ask answer's first line, and whether all three Compare columns filled
- `git status --short apps/` → empty

## Out of scope
Report page, Connectors page, sign-in buttons, new pages, restyling.

## Rules
**Don't commit** (your sandbox can't write `.git`): leave changes in the working tree and list every changed path in your report; the master verifies and commits them as `m06:`. **Don't push.** End with the WORKER REPORT block from AGENTS.md §4a.
