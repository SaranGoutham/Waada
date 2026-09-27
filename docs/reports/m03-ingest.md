# M03 Ingest — final report

- Module: M03 Ingest (files → Interactions → memory), owner OpenCode, status `review`
- Plan: `docs/superpowers/plans/2026-09-27-m03-ingest.md` (all 7 tasks done)
- Brief: `tasks/M03-ingest.md` (implements AGENTS.md §6.6)

## What was built

`packages/core/src/ingest/` (replacing the M00 stub; `index.ts` re-exports the §6.6 surface):

- `pipeline.ts` — `ingest(items, deps?)`: validates each item (`Interaction.safeParse`,
  invalid → error string, continue), sorts by `date` ascending, dedupes via
  `.waada/manifest.json` (`Manifest = z.record(account → sourceId[])`), calls
  `memory.ensureBank` once per account then `memory.remember` per item (one failing
  item → error string, continue), writes the manifest after each success (crash-safe reruns).
- `parse-files.ts` — `parseFiles(files, account, deps?)`: dispatches by lowercased
  extension (`.eml` / `.json` / `.txt|.md|.vtt` / `.mp3|.m4a|.wav|.webm`), unknown → error
  string, `.zip` → extract-first error (no zip library per AGENTS.md rule 3; see P-003).
  Per-file try/catch, transcript warnings appended to `errors` as non-fatal notices.
- `eml.ts` — `postal-mime` (S20): Message-ID → `sourceId` (`file:<sha256-16>` fallback),
  `Date` header → UTC ISO (missing/unparseable → friendly `WaadaError`), From/To/Cc display
  names → participants, Subject → title, text part preferred with HTML→text fallback
  (tag-strip + entity decode), quoted replies stripped (`>` lines and `On … wrote:` cut).
- `slack-export.ts` — one Interaction per channel-day: `sourceId = slack:<channel>:<YYYY-MM-DD>`
  (channel from parent folder else payload `channel`), `HH:MM name: text` lines, unique
  participants (`real_name ?? display_name ?? user` id), date = earliest `ts`, bot messages
  kept, empty-text messages skipped, unusable input → friendly `WaadaError`.
- `transcript.ts` — hand-parsed `--- key: value ---` front-matter used directly
  (participants split/trimmed, `type` validated, default `call`); otherwise `llm.extract`
  (`name: "transcript-metadata"`, first ~2,000 chars); `null` → file basename + now + warning.
  `.vtt`: WEBVTT/timings/NOTE/cue-numbers stripped, `<v Speaker>` → `Speaker:` lines.
  `sourceId = file:<sha256-16>`.
- `audio.ts` — `llm.transcribe(data, name)` → transcript path with no header; `type: "call"`,
  `source: "audio"`, `sourceId` from the audio bytes; missing LLM → friendly error (not a crash).

Tests: `packages/core/test/ingest-{pipeline,eml,slack,transcript,parse-files,seed}.test.ts`
plus `test/fixtures/ingest/` (plain + HTML-only-with-quotes `.eml`, Slack day with a
`bot_message` and a missing `user_profile`, with/without-header transcripts, `.vtt`).

## Test commands with real output

- `pnpm --filter @waada/core test -- ingest-` → **6 files, 20 tests, all pass** (incl. seed
  test: `parseFiles(all of seed/acme)` → **33 interactions (14 eml + 8 transcript +
  11 slack_export), 0 errors**, all schema-valid, 33 unique sourceIds).
- `pnpm exec biome check <my 13 files>` → clean. `tsc --noEmit` on my files → clean.
- TDD followed throughout: every test was watched failing (missing-module) before the
  implementation; two real bugs caught by tests and fixed in code (not tests):
  `email.messageId` `undefined !== ""` crash; dispatcher double-prefixing error strings.

## Dependencies on other modules (per human request)

- M00 Foundation: `done` — consumed contracts (`Interaction`, `FileInput`, `IngestReport`),
  `readJson`/`writeJson`, `log`, `FakeMemory`/`FakeLLM`. No changes needed to M00 code.
- M04 seed data: `review` (approved data) — used as the reference set; acceptance count
  (33) verified against `seed/acme/EXPECTED.md`. No seed changes needed.
- M01 Memory / M02 LLM: **not blocked** — coded against the §6.4/§6.5 contracts via
  `deps` injection; all tests use fakes. `ingest()` lazily calls `createMemory()` only when
  no `Memory` is passed and new items exist (M05 will pass real instances later).

## Not green / not mine (left untouched per AGENTS.md)

- `foundation.test.ts` → "public index … stubs for unbuilt modules" fails at the
  `createLLM()` stub assertion: M02 (Codex) has implemented `createLLM` in uncommitted
  `src/llm/*` but not yet updated that assertion. Their row note says settings work is
  underway; they will hit this themselves.
- `tsc --noEmit` reports `src/llm/index.ts(61,11)` (`File` vs `Uint8Array`) — M02's
  uncommitted file. My files are clean.
- `pnpm check` also flags `src/llm/providers.ts` CRLF line endings — M02's file.

## // VERIFY list

None. `postal-mime` API taken from its shipped `postal-mime.d.ts` (v3.0.1); Slack format
matches both the seed exports and the linked help article shape (array of `ts`/`user`/
`user_profile`/`text`); VTT cue rules from the linked W3C spec (header, `-->` timings,
`<v>` voice tags, NOTE blocks).

## Proposals raised

- P-003 (open): library for reading Slack-export `.zip` directly (`yauzl` recommended,
  only if the human wants direct zip upload in the MVP; blocks nothing).

## Follow-ups for other modules

- M05: `ingest()` is ready — pass a real `Memory`; call `parseFiles` for uploads then
  `ingest` for storage. Transcript warnings come back inside `errors` (non-fatal notices).
- M06: `.zip` uploads currently get an extract-first error by design (pending P-003).
- M02b+: `transcribeAudio` needs `deps.llm`; without one it returns an error string.

## Commits (`git log --oneline --grep "^m03:"`)

88372cd pipeline · 876254d eml · 1ab65b9 slack · fae82f1 transcript · 9fcd3c2 dispatcher+audio ·
8b25f85 postal-mime dep · f07c571 seed test · 2c0bbf6 lint/typecheck (+ pending: P-003, PROGRESS, report)
