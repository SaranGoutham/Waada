# M00 Foundation — design notes

The brief ([tasks/M00-foundation.md](../../../tasks/M00-foundation.md)) and AGENTS.md §6 fix almost everything. This file records only the choices they leave open.

## Tool versions (latest on 2026-09-27, all support Node 22.15)

pnpm 12.6.0 (pinned via `packageManager`, run through corepack) · TypeScript 7.0.2 · Zod 4.6.5 · Vitest 5.0.2 · Biome 2.5.14 · @types/node 22.x. `.nvmrc` = `22`.

## How other packages consume `@waada/core`

- **No build step.** `packages/core/package.json` exports TypeScript source: `"."` → `./src/index.ts`, `"./testing"` → `./test/fakes.ts` (so M06/M07 can import `FakeMemory`/`FakeLLM`).
- Vite-based consumers (TanStack Start, Vitest) compile it directly. A plain-Node consumer (the MCP server) can use Node's built-in TypeScript type stripping.
- To keep that possible: relative imports use **`.ts` extensions** (`allowImportingTsExtensions`, `noEmit`), and **`erasableSyntaxOnly`** is on (no `enum`, no parameter properties, no namespaces).
- `pnpm check` runs Biome **and** `tsc --noEmit` in every package that has a `typecheck` script, so a contract break fails `check`.

## config.ts

- `.env` location: walk up from `process.cwd()` to the **project root** (first directory containing `pnpm-workspace.yaml`; else `cwd`) and read `<root>/.env` if present. Parsed with `node:util` `parseEnv`. Real environment variables win over `.env` values. Read on each `getEnv()` call (cheap, and tests can change `process.env`). Never throws; a missing or unreadable `.env` is ignored.
- `dataDir` is returned **resolved to an absolute path** (relative values, including the default `.waada`, are resolved against the project root), so the web app and MCP server share one data folder whatever their cwd.
- Empty strings count as missing in `requireEnv`.
- `bankIdFor`: Unicode-normalise (NFKD, strip diacritics), lowercase, non-alphanumerics → `-`, collapse, trim, prefix `waada-`. A name with no letters or digits throws `WaadaError`. The same `slugify()` is exported and used by `accounts.ts`.

## store.ts

- `relPath` must resolve inside `dataDir` (absolute paths and `..` escapes throw `WaadaError`).
- Missing file → `fallback`. Invalid JSON or schema mismatch → `ConfigError` naming the file (not a stack trace).
- Atomic write: temp file in the same folder, then `rename`. On Windows `rename` can fail transiently (`EPERM`/`EBUSY`/`EACCES`) when another process has the file open; retry a few times with a short backoff.

## accounts.ts

- `upsertAccount`: slug = `slugify(slug ?? name)`. Existing slug → update `name`, keep `createdAt`. Upserts in one process are serialised (promise chain) so concurrent calls don't lose writes.

## log.ts

- `log.debug/info/warn/error(message, fields?)` → one line on **stderr**. Level from `WAADA_LOG_LEVEL` (default `info`). Field keys matching `key|token|secret|password|authorization` are replaced with `[redacted]`. `createLogger(scope)` for a prefixed logger.

## Stubs (M01, M02, M03, M05)

Exact §6 signatures; bodies throw `new Error("not implemented: <module>")`. `LlmSettings` gets the provisional shape from the M02 brief so the type is useful; M02 owns and replaces it.

## Fakes

- `FakeMemory`: per-account `Map` keyed by `sourceId` (re-remembering the same id replaces it, like a Hindsight `document_id`). `search` scores by shared lower-case words between query and `title + content`, drops zero scores, sorts by score then date, honours `maxResults` (default 10). `reflect` returns a fixed string (overridable in the constructor). Every call is appended to `.calls` as `{ method, args }`.
- `FakeLLM`: queues from the constructor. `extract` is keyed by `name`, validates the queued value with the given schema (invalid → `null`, like the real one), returns `null` when the queue is empty. **Deviation from the brief:** `chat` and `transcribe` return `Promise<string>` in the contract, so an empty queue **throws** a clear error instead of returning `null` (a `null` would violate the type and fail confusingly later). `transcribe` is a single string returned on every call.
