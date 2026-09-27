# Card 009 — Codex — M03 + M05 + M06: baselines read imported data; import fixes

**Worker:** Codex · **Modules:** M03 ingest, M05 `baselines.ts`, M06 Import page · **Issued by:** master, 2026-09-27

## Goal
Human decision **P-006** (AGENTS.md §6.8 note, updated): Compare's baselines read **what the user imported**, not `seed/`. Also fix two import problems the master saw in the real browser run.

## Read first
`AGENTS.md` (§1a, §2, §3, §4a, §6.3, §6.6, §6.8 note), `docs/decisions/PROPOSALS.md` P-006, `packages/core/src/ingest/**`, `packages/core/src/agent/baselines.ts`, `packages/core/src/store.ts`, `apps/web/src/lib/server.ts`, `apps/web/src/routes/accounts.$slug.import.tsx`.

## What the master saw (real run, account "Acme Corp" → slug `acme-corp`, all 35 files of `seed/acme` uploaded flat)
1. Compare: "No CRM record found for "acme-corp" at seed/acme-corp/crm.json." and "Could not read the seed folder at …\seed\acme-corp." Only the Waada column filled.
2. Every Slack item was titled `#unknown — <date>`: with a flat upload the parser can't see the `deal-acme` folder; `channels.json` was uploaded but skipped ("no timestamped messages").
3. `call-04-pilot-scoping.txt` and `call-07-commercial.txt` (no header): "metadata extraction failed; used the file name and current time" → dated today, titled with the file name. No reason was logged anywhere.

## Files you may change
`packages/core/src/ingest/**`, `packages/core/src/agent/baselines.ts`, `packages/core/src/index.ts` (exports only), `packages/core/test/ingest*.test.ts`, `packages/core/test/agent-baselines.test.ts`, `apps/web/**`, `docs/reports/m03-ingest.md`, `docs/reports/m06-web-app.md`.
**Don't touch:** `packages/core/src/agent/{ledger,landmines,brief,prompts,evidence}.ts` (OpenCode, card 008, works there now), `packages/core/src/llm/**`, `seed/**`, `package.json`, `pnpm-lock.yaml`, `AGENTS.md`, `docs/PROGRESS.md`, `.env`.

## Steps (TDD, no network in unit tests)
1. **Save imported interactions.** After a successful `ingest`, the interactions for the account are merged (dedupe by `sourceId`) into `.waada/interactions/<account>.json` via `store.ts` (`readJson` / `writeJson`, Zod-validated). Keep `ingest`'s signature (§6.6).
2. **CRM file.** A file named `crm.json` in an import is a CRM record, not an interaction: save it to `.waada/crm/<account>.json` (validate it's a flat JSON object of fields) and show "CRM record saved" in the Import result. Do this without changing `parseFiles`' contract (e.g. a new core export such as `saveCrmRecord(account, file)` that the web server function calls first).
3. **Baselines.** `baselineSummary` reads `.waada/interactions/<account>.json` (sorted by date, same budget as today); `baselineCrm` reads `.waada/crm/<account>.json`. Missing file → the existing friendly message, reworded ("No CRM record imported for this account. Add crm.json on the Import page." / "Nothing imported for this account yet."). Remove the `seed/` reads.
4. **Slack channel name.** If `channels.json` is in the same upload, use it to name the channel; otherwise, when the channel is unknown, title items `Slack — <date>` instead of `#unknown — <date>`. Don't report `channels.json` / `users.json` as errors; use `users.json` for names if it isn't already.
5. **Transcript metadata.** Find why metadata extraction fails for header-less transcripts (with `FakeLLM` you can at least check the prompt and schema path). Log the reason through `log.ts` (never the transcript text or keys). If the extraction returns a partial result (e.g. a date but no title), keep what it found. Add a `// VERIFY:` if the real cause needs a live run; the master will run it.
6. **Import page:** show the CRM-saved line; keep everything else.

## Acceptance (paste real output)
- `npx pnpm@12.6.0 --filter @waada/core test` and `npx pnpm@12.6.0 --filter web test` → green
- `npx pnpm@12.6.0 --filter web build` → succeeds
- Biome: run `node node_modules/@biomejs/biome/bin/biome check <your files>` from the repo root (root config, not `apps/web`'s)

## Rules
**Don't commit** (your sandbox can't write `.git`): leave changes in the working tree and list every changed path; the master verifies and commits. Your sandbox has no network: don't try live calls. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
