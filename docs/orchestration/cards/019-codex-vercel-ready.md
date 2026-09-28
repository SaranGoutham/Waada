# Card 019 — Codex — M00 + M06: make Waada deployable on Vercel (Nitro) with Upstash Redis storage

**Worker:** Codex · **Modules:** M00 (`store.ts`, `config.ts`), M06 (`vite.config.ts`) · **Issued by:** master, 2026-09-28

## Goal
Human decisions S23–S25 (AGENTS.md §5): host on **Vercel** via the **Nitro** Vite plugin; when deployed, persist app data in **Upstash Redis** instead of `.waada/` files; local dev keeps the JSON files. Access is handled by Vercel deployment protection (no code). Packages are **already installed** by the master: `nitro` (apps/web) and `@upstash/redis` (packages/core). Don't add others.

## Read first
`AGENTS.md` (§2, §3, §4a, §5 S13, S23–S25, §6.3), `packages/core/src/{store,config}.ts` and their tests, `apps/web/vite.config.ts`.

## Verified facts (master, official docs, 2026-09-28)
- Vercel "TanStack Start on Vercel": install `nitro`, then in `vite.config.ts`: `import { nitro } from 'nitro/vite'` and `plugins: [tanstackStart(), nitro(), viteReact()]`.
- Upstash Redis TS SDK: `import { Redis } from '@upstash/redis'`; `Redis.fromEnv()` reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Vercel Marketplace may inject differently named variables (e.g. `KV_REST_API_URL` / `KV_REST_API_TOKEN`): support both, preferring the `UPSTASH_*` names; mark the `KV_*` names `// VERIFY:`.

## Files you may change
`packages/core/src/store.ts`, `packages/core/src/config.ts`, `packages/core/test/foundation.test.ts` (or a new `packages/core/test/store.test.ts`), `apps/web/vite.config.ts`, `.env.example` (document the two Upstash variables, empty), `docs/reports/m06-web-app.md`.
**Don't touch:** everything else (`agent/`, `llm/`, `ingest/`, `memory/`, `apps/web/src/**`, `AGENTS.md`, `docs/PROGRESS.md`, `.env`, `package.json` files, `pnpm-lock.yaml`).

## Steps (TDD, no network in unit tests)
1. **Store backend switch** in `store.ts` (the only place app data is read or written; keep `readJson` / `writeJson` signatures, §6.3):
   - If Upstash credentials are present → Redis backend: key = `waada:<relPath>` (e.g. `waada:accounts.json`), `writeJson` stores the JSON value, `readJson` loads it, validates with the Zod schema, and returns `fallback` when missing or invalid (log a warning on invalid, like the file backend).
   - Otherwise → today's file backend, unchanged (atomic temp file + rename).
   - The Redis client is created lazily (no network at import) and is injectable for tests (e.g. an internal setter or a small interface with `get`/`set`); write tests with an in-memory fake for both backends' behaviour.
2. **`config.ts`:** a missing `.env` file must never throw (on Vercel, variables come from `process.env`). `process.env` keeps priority over the file (existing behaviour). Add a test.
3. **`vite.config.ts`:** add `nitro()` exactly as the verified snippet above, keeping the existing plugins and their order around it.
4. **`.env.example`:** add `UPSTASH_REDIS_REST_URL=` and `UPSTASH_REDIS_REST_TOKEN=` with a one-line comment ("only for the hosted app; leave empty locally").
5. Build: `vite build` in `apps/web` must still succeed; say in the report what the Nitro build writes (e.g. `.output/` or `.vercel/output/`) and whether it's gitignored (`.gitignore` already ignores `.output/`; if it's `.vercel/`, report it, don't edit `.gitignore`).

## Acceptance
- `npx pnpm@12.6.0 --filter @waada/core test` → green (sandbox EPERM on `.waada/` only: say so)
- `apps/web`: `tsc --noEmit`, `vitest run` → green; `vite build` → succeeds
- `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root → clean

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
