# M00 Foundation: report

**Status:** done · **Plan:** [2026-09-27-m00-foundation.md](../superpowers/plans/2026-09-27-m00-foundation.md) · **Design notes:** [2026-09-27-m00-foundation-design.md](../superpowers/specs/2026-09-27-m00-foundation-design.md)

## What was built

- **Workspace:** pnpm 12.6.0 workspace (`apps/*`, `packages/*`), Biome 2.5.14, TypeScript 7.0.2, Vitest 5.0.2, Zod 4.6.5, `.nvmrc` = 22, `.gitignore`, `.env.example`.
- **Root scripts:** `check` = `biome check .` **plus** `tsc --noEmit` in every package with a `typecheck` script · `format` · `test` (every package's `vitest run`) · `test:live` (only `*.live.test.ts`, via `vitest run --mode live`).
- **`@waada/core`** (`packages/core`), exported as TypeScript source, no build step:
  - `"@waada/core"` → `src/index.ts`: models (§6.1), errors (§6.2), `getEnv` / `requireEnv` / `bankIdFor` (+ `slugify`, `findProjectRoot`), `readJson` / `writeJson`, `Account` / `listAccounts` / `upsertAccount` (§6.3), `log` / `createLogger`.
  - Stubs with exact §6 signatures that throw `not implemented: <module>`: `memory/` (M01), `llm/` (M02, incl. a provisional `LlmSettings` copied from the M02 brief), `ingest/` (M03), `agent/` (M05, plus a `AgentDeps` type).
  - `"@waada/core/testing"` → `test/fakes.ts`: `FakeMemory`, `FakeLLM`, `sampleInteractions()`.

## How to use it (for other modules)

```ts
import { Interaction, createMemory, getEnv, readJson, WaadaError } from "@waada/core";
import { FakeLLM, FakeMemory, sampleInteractions } from "@waada/core/testing";
```

- Add the dependency with `pnpm --filter <your-package> add @waada/core@workspace:*`.
- Inside `packages/core`, relative imports use **`.ts` extensions** (`import { x } from "./config.ts"`). `erasableSyntaxOnly` is on: no `enum`, no parameter properties, no namespaces.
- `getEnv().dataDir` is an **absolute** path (relative values resolve against the repo root, the folder with `pnpm-workspace.yaml`), so the web app and the MCP server share one `.waada/`.
- `readJson` throws `ConfigError` (naming the file) on invalid JSON or schema mismatch; returns the fallback only when the file is missing. Paths must stay inside `dataDir`.
- Logger writes to **stderr** only; fields named like `key/token/secret/password/authorization/cookie` are redacted. `WAADA_LOG_LEVEL=debug` for more.

## Verification (real output, 2026-09-27)

```
$ pnpm install
Scope: all 2 workspace projects
Already up to date
Done in 14ms using pnpm v12.6.0

$ pnpm check
$ biome check . && pnpm -r --if-present typecheck
Checked 19 files in 100ms. No fixes applied.
$ tsc --noEmit
(exit 0)

$ pnpm test
 RUN  v5.0.2 C:/Code-Files/Waada/packages/core
 Test Files  1 passed (1)
      Tests  28 passed (28)
(exit 0)

$ pnpm test:live
include: test/**/*.live.test.ts
(no live tests yet; exit 0 via --passWithNoTests)
```

The live/unit split was checked with a temporary `probe.live.test.ts`: `--mode live` ran only it (1 test), the default run skipped it (28 tests). The file was removed.

The acceptance import `import { Interaction, createMemory, createLLM, ingest, brief } from "@waada/core"` is type-checked in `foundation.test.ts` through the package name (`expectTypeOf`), and so is `@waada/core/testing`. Changing a name there makes `pnpm check` fail (tested).

## Deviations and decisions (please review)

1. **`.gitattributes` added** (`* text=auto eol=lf`), a file not in my list. Git here has `core.autocrlf=true`, which checks files out as CRLF, while tools write LF; Biome would fail on one or the other. LF everywhere fixes it. If an agent's existing checkout has CRLF files, `pnpm format` fixes them.
2. **`biome.json` ignores `seed/`.** M04's seed exports are minified JSON like real exports and failed `pnpm check`. (While finding this, my `biome check --write .` briefly reformatted six M04 seed files; I restored their exact committed bytes with `git show HEAD:<file>`. M04's content was not changed.)
3. **`FakeLLM.chat` / `transcribe` throw on an empty queue** instead of returning `null` (brief step 7), because their contract type is `Promise<string>`. `extract` returns `null` as described.
4. `getEnv().dataDir` is returned as an absolute path (the type is still `string`).
5. `pnpm check` also runs `tsc --noEmit`, so a contract break fails `check`, not only lint.

## Unverified (`// VERIFY:`)

- **pnpm via corepack is broken on Node 22.15:** its bundled corepack can't start pnpm 12 (`Cannot find module …\pnpm\12.6.0\bin\pnpm.cjs`). I ran everything with `npx pnpm@12.6.0 …`. **Human:** run `npm i -g pnpm@12.6.0` (or `npm i -g corepack@latest`) so every agent has `pnpm`.
- The MCP server (M07) running `@waada/core` source under plain Node relies on Node's built-in type stripping. I believe it is unflagged from Node 22.18 and needs `--experimental-strip-types` on 22.15; M07 should check the Node docs (or use a Vite-based runner) and decide.

## Proposals raised

None.

## Follow-ups for other modules

- **M01 / M02 / M03 / M05:** replace the stub bodies in your folder; keep the exported names and signatures. `foundation.test.ts` asserts the stubs throw `not implemented: …`: when you implement yours, delete that one assertion (in the "public index" test) in the same commit, or tell me and I will.
- **M02:** `LlmSettings` in `llm/index.ts` is provisional; move it to `llm/settings.ts` and re-export from `llm/index.ts`.
- **M06 / M07:** use `@waada/core/testing` for fakes (M06's `WAADA_FAKE_CORE=1`).
- **Everyone:** scope formatting to your own paths (`pnpm biome check --write <your paths>`); `pnpm format` rewrites the whole repo.
