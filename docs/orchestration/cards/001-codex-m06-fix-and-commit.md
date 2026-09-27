# Card 001 — Codex — M06 Web app: fix nested config, commit the web app

**Worker:** Codex · **Module:** M06 · **Issued by:** master, 2026-09-27

## Goal
Make the existing (uncommitted) web-app scaffold in `apps/web` part of the pnpm workspace so `pnpm check` and `pnpm test` pass at the repo root, then commit it in small `m06:` commits. Getting a green, committed baseline matters more than new features here.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a), `tasks/M06-web-app.md`, `docs/superpowers/specs/2026-09-27-m06-web-app-design.md`, `docs/superpowers/plans/2026-09-27-m06-web-app.md`.

## Current state (checked by master)
- `apps/web/` exists with `src/`, `package.json`, `tsconfig.json`, `tsr.config.json`, `vite.config.ts`, **and** its own `biome.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `dist/`, `node_modules/`.
- Root `npx pnpm@12.6.0 check` fails: *"Found a nested root configuration"* (`apps/web/biome.json`).
- Nothing under `apps/` is committed. The M06 spec and plan are also uncommitted.
- The root `pnpm-lock.yaml` has uncommitted changes (from the scaffold).
- M05 `brief` / `ask` are now real and committed in `@waada/core`. `compare` isn't there yet.

## Files you may change
`apps/web/**`, root `pnpm-lock.yaml`, root `biome.json` (only to include/ignore `apps/web` paths such as `dist`, `.output`, `routeTree.gen.ts`), `.gitignore` (only to add web build output), `docs/superpowers/specs/2026-09-27-m06-web-app-design.md`, `docs/superpowers/plans/2026-09-27-m06-web-app.md`, `docs/reports/m06-web-app.md`.
**Don't touch:** `packages/**`, `docs/PROGRESS.md`, `AGENTS.md`, anything else.

## Steps
1. Remove the nested workspace artifacts: `apps/web/pnpm-workspace.yaml`, `apps/web/pnpm-lock.yaml`, and `apps/web/biome.json`. Any web-specific Biome settings go into the root `biome.json` as overrides.
2. Make sure `apps/web/package.json` depends on `@waada/core` via `workspace:*`. Run `npx pnpm@12.6.0 install` from the repo root.
3. Keep build output out of git and out of Biome: `apps/web/dist`, `.output`, `.tanstack`, `node_modules`, and generated route trees if the router generates them.
4. Finish the fix you were on: `apps/web/src/routes/settings.llm.tsx` must use `settings.groqConfigured` (the server DTO no longer exposes credentials).
5. Wire Brief and Ask to the **real** `brief` / `ask` from `@waada/core`. Keep the `WAADA_FAKE_CORE=1` fallback with its visible "sample data" banner. The Compare page may stay on fakes (M05 `compare` isn't done).
6. Run the checks below until green. Commit in small slices: config fix, then settings fix, then real brief/ask wiring, then spec/plan docs.

## Acceptance (paste real output in the report)
- `npx pnpm@12.6.0 check` → passes at the repo root
- `npx pnpm@12.6.0 test` → all green
- `npx pnpm@12.6.0 --filter web build` → succeeds (use the package's actual filter name)
- `git status --short apps/` → empty (everything committed or ignored)

## Out of scope
New pages beyond the MVP list, connectors, sign-in buttons, the Compare page with real data.

## Rules
Commits start with `m06:`, with **no** AI attribution. Stage explicit paths only. **Don't push.** OpenCode may be working in `packages/core/src/agent/**` at the same time: don't touch it. End with the WORKER REPORT block from AGENTS.md §4a.
