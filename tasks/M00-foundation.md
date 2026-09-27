# M00 — Foundation

**Goal:** create the pnpm workspace and the shared contract code in `@waada/core`, so every other module can start in parallel. Small, but it **blocks Wave 1**: keep it minimal and exact.

Read first: [AGENTS.md](../AGENTS.md). §5 is your allowed stack, §6 your exact spec, §7 the layout.

## Files you own

```
package.json  pnpm-workspace.yaml  biome.json  tsconfig.base.json  .gitignore  .env.example  .nvmrc
packages/core/package.json  packages/core/tsconfig.json  packages/core/vitest.config.ts
packages/core/src/index.ts  models.ts  errors.ts  config.ts  store.ts  accounts.ts  log.ts
packages/core/test/fakes.ts  packages/core/test/foundation.test.ts
```

**Stubs** (you create them with the §6 signatures, bodies throw `new Error("not implemented: <module>")`; the owning module replaces them):
`packages/core/src/memory/index.ts` (M01) · `llm/index.ts` (M02) · `ingest/index.ts` (M03) · `agent/index.ts` (M05).

Do **not** scaffold `apps/web`, `apps/extension` or `packages/mcp`. Those belong to M06, M09 and M07.

## Build

1. The repo already exists (remote `origin`, branches `main` and `dev`). Work on **`dev`** in `C:\Code-Files\Waada`, following the AGENTS.md §3 git rules. `.gitignore` exists but is empty; fill it (step 3).
2. Root `package.json` (private) with scripts: `check` (biome check), `format` (biome format --write), `test` (vitest run, all packages), `test:live` (runs only `*.live.test.ts`). `pnpm-workspace.yaml` with `apps/*`, `packages/*`.
3. `.gitignore`: `node_modules/ .env .waada/ dist/ .output/ .wxt/ coverage/ credentials*.json token*.json`
4. `.env.example`: `HINDSIGHT_BASE_URL`, `HINDSIGHT_API_KEY`, `SLACK_BOT_TOKEN`, `HUBSPOT_TOKEN`, `GOOGLE_CREDENTIALS_PATH`, `WAADA_DATA_DIR=.waada`, each with a one-line comment. LLM keys are **not** env vars; they're set in the web app's Settings (S3, S13).
5. `models.ts`, `errors.ts`, `config.ts`, `store.ts`, `accounts.ts`: **exactly** AGENTS.md §6.1–6.3. `bankIdFor`: lowercase, non-alphanumerics → `-`, collapse repeats, trim dashes. `store.ts` writes atomically (temp file + rename) and validates reads with the schema, returning `fallback` when the file is missing.
6. `log.ts`: a tiny leveled logger (`debug/info/warn/error`) writing to stderr. **Stderr, because the MCP server uses stdout for protocol.** No dependency.
7. `test/fakes.ts`:
   - `FakeMemory implements Memory`: in-process store per account. `search` ranks by word overlap with the query and returns `MemoryHit`s. `reflect` returns a fixed string. Every call is recorded in `.calls`.
   - `FakeLLM implements LLM`: constructor `{ chat?: string[]; extract?: Record<string, unknown[]>; transcribe?: string }`. Returns them in order (extract keyed by `name`), records calls, returns `null` when a queue is empty.
   - `sampleInteractions()`: 3 hand-written `Interaction`s for account `"acme"`.
8. `foundation.test.ts`: schemas accept and reject correctly; `bankIdFor` cases; `requireEnv` lists missing vars; store round-trip in a temp dir; accounts upsert/list; fakes behave as described.

## Acceptance

- [ ] `pnpm install && pnpm check && pnpm test`: all green (paste output in your report)
- [ ] `import { Interaction, createMemory, createLLM, ingest, brief } from "@waada/core"` type-checks
- [ ] Names and signatures match AGENTS.md §6 exactly
- [ ] `docs/PROGRESS.md` row updated; report at `docs/reports/m00-foundation.md`

## References

pnpm workspaces: https://pnpm.io/workspaces · Biome: https://biomejs.dev · Vitest: https://vitest.dev · Zod: https://zod.dev

## Out of scope

Any real Hindsight or LLM calls, parsers, UI.
