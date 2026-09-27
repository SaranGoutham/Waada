# M00 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** pnpm workspace + `@waada/core` contract code (AGENTS.md §6.1–6.3), stubs for §6.4–6.6/6.8, fakes and tests, so Wave 1 modules can start.

**Architecture:** One package, `packages/core`, exported as TypeScript source (no build). Zod schemas are the single type source. JSON storage under an absolute `dataDir`. Stubs keep every §6 name importable before its owner builds it.

**Tech Stack:** TypeScript 7, Zod 4, Vitest 5, Biome 2, pnpm 12 (corepack), Node ≥ 22.

**Spec:** [docs/superpowers/specs/2026-09-27-m00-foundation-design.md](../specs/2026-09-27-m00-foundation-design.md) · brief [tasks/M00-foundation.md](../../../tasks/M00-foundation.md) · contract AGENTS.md §6

## Global Constraints

- Names and signatures exactly as AGENTS.md §6. Dates are ISO-8601 UTC strings.
- No `console.log` in `packages/core`; logger writes to stderr.
- Only packages from AGENTS.md §5 (plus TypeScript/@types/node for S1). No network in unit tests.
- Commits `m00: …`, explicit paths only, no AI attribution; `pnpm check && pnpm test` green at every commit.

## Review Focus

1. `.env` absent / `dataDir` relative while running from `packages/core` or `apps/web` → must resolve to the repo-root `.waada/` (test: `getEnv` resolves relative `WAADA_DATA_DIR` against root).
2. Corrupt or schema-invalid JSON file in `.waada/` → friendly `ConfigError` naming the file, not a crash (test in store round-trip task).
3. `relPath` like `../secrets.json` → rejected (test in store task).
4. Account names with accents/punctuation/only symbols (`"Café Säo"`, `"!!!"`) → sane slug or `WaadaError` (test in config task).
5. Concurrent `upsertAccount` calls → both accounts persisted (test in accounts task).

---

### Task 1: Workspace scaffold

**Files:** Create `package.json`, `pnpm-workspace.yaml`, `biome.json`, `tsconfig.base.json`, `.nvmrc`, `packages/core/{package.json,tsconfig.json,vitest.config.ts}`, `packages/core/src/index.ts` (empty export); Modify `.gitignore`, `.env.example`.

- [ ] Root scripts: `check` = `biome check . && pnpm -r --if-present typecheck`, `format` = `biome format --write .`, `test` = `pnpm -r --if-present test`, `test:live` = `pnpm -r --if-present test:live`.
- [ ] Core scripts: `test` = `vitest run`, `test:live` = `vitest run --mode live --passWithNoTests`, `typecheck` = `tsc --noEmit`. `vitest.config.ts` switches `include` on `mode === "live"` (`test/**/*.live.test.ts`) vs default (`test/**/*.test.ts`, excluding live).
- [ ] `.gitignore` and `.env.example` per brief step 3–4.
- [ ] `corepack pnpm install`, then `pnpm check` green.
- [ ] Commit `m00: scaffold pnpm workspace and core package`.

### Task 2: errors + models

**Files:** `src/errors.ts`, `src/models.ts`, `test/foundation.test.ts`.
**Produces:** §6.1 schemas + `z.infer` types of the same name; `WaadaError`, `ConfigError`, `ExternalServiceError`.

- [ ] Tests: valid `Interaction` parses; bad `type`, non-ISO `date`, missing `sourceId` rejected; `Commitment.status` enum; `FileInput` accepts `Uint8Array`, rejects string; `ConfigError instanceof WaadaError` and keeps `name`.
- [ ] Run → fail; implement verbatim from §6.1/6.2; run → pass.
- [ ] Commit `m00: add contract models and errors`.

### Task 3: config + log

**Files:** `src/config.ts`, `src/log.ts`, tests.
**Produces:** `getEnv()`, `requireEnv(...names)`, `bankIdFor(account)`, `slugify(s)`, `findProjectRoot()`; `log`, `createLogger(scope)`.

- [ ] Tests: `bankIdFor("Acme Corp") === "waada-acme-corp"`, `"  ACME--corp!! "` → `waada-acme-corp`, `"Café Säo"` → `waada-cafe-sao`, `"!!!"` throws `WaadaError`; `requireEnv("WAADA_T_A","WAADA_T_B")` throws `ConfigError` whose message lists both; set var → no throw; relative `WAADA_DATA_DIR` resolves to absolute under project root; default dataDir ends with `.waada`. Logger: writes to stderr (spy `process.stderr.write`), never stdout, redacts `apiKey`, respects level.
- [ ] Run → fail; implement per spec; run → pass.
- [ ] Commit `m00: add config and stderr logger`.

### Task 4: store + accounts

**Files:** `src/store.ts`, `src/accounts.ts`, tests.
**Produces:** `readJson(relPath, schema, fallback)`, `writeJson(relPath, value)`, `Account`, `listAccounts()`, `upsertAccount({name, slug?})`.

- [ ] Tests (temp dir via `WAADA_DATA_DIR`): missing file → fallback; write then read round-trip in nested folder; no `.tmp` files left; invalid JSON → `ConfigError`; schema mismatch → `ConfigError`; `../x.json` rejected. Accounts: empty list; upsert returns slug `acme-corp` + ISO `createdAt`; second upsert same slug updates name, keeps `createdAt`; explicit slug honoured; two concurrent upserts both persisted.
- [ ] Run → fail; implement; run → pass.
- [ ] Commit `m00: add JSON store and account registry`.

### Task 5: module stubs + index

**Files:** `src/memory/index.ts`, `src/llm/index.ts`, `src/ingest/index.ts`, `src/agent/index.ts`, `src/index.ts`, `test/exports.test.ts`.

- [ ] Test: `import { Interaction, createMemory, createLLM, ingest, brief } from "../src/index.ts"` — all defined; `createMemory()` throws `not implemented: memory`; `LlmSettings.parse` accepts the default Groq settings.
- [ ] Implement stubs with exact §6.4–6.6/6.8 signatures; `index.ts` re-exports everything.
- [ ] `pnpm check` (typecheck proves signatures) + test → pass. Commit `m00: add module stubs and public index`.

### Task 6: fakes

**Files:** `test/fakes.ts`, tests.
**Produces:** `FakeMemory`, `FakeLLM`, `sampleInteractions()` (exported as `@waada/core/testing`).

- [ ] Tests: `sampleInteractions()` = 3 valid `Interaction`s for `acme`; FakeMemory remember/search ranks the SOC 2 email first for "SOC 2 report", excludes zero-overlap, `maxResults` honoured, same `sourceId` replaces, `deleteBank` empties, `reflect` fixed string, `.calls` recorded; FakeLLM chat in order then throws when empty, extract by name validated by schema, `null` when empty or invalid, transcribe fixed string, calls recorded.
- [ ] Run → fail; implement; run → pass. Commit `m00: add FakeMemory, FakeLLM and sample interactions`.

### Task 7: verify, report, progress

- [ ] `corepack pnpm install && pnpm check && pnpm test && pnpm test:live` — capture output.
- [ ] Write `docs/reports/m00-foundation.md`; update M00 row in `docs/PROGRESS.md` (commit alone); push `dev`.
