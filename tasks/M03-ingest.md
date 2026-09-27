# M03 — Ingest (files → Interactions → memory)

**Goal:** turn exported files into `Interaction`s and store them in memory exactly once. Implements AGENTS.md §6.6. Every future source (connectors, live capture) reuses `ingest()`.

## Files you own

```
packages/core/src/ingest/index.ts          (replace M00's stub)
packages/core/src/ingest/pipeline.ts       ingest() + dedupe manifest
packages/core/src/ingest/parse-files.ts    parseFiles(): dispatch by extension
packages/core/src/ingest/eml.ts            (uses `postal-mime`, S20)
packages/core/src/ingest/slack-export.ts
packages/core/src/ingest/transcript.ts
packages/core/src/ingest/audio.ts
packages/core/test/ingest*.test.ts  packages/core/test/fixtures/ingest/*
```

## Build

1. **`ingest(items, deps)`**: sort by `date` ascending, skip any `sourceId` already in `.waada/manifest.json` (keyed by account), call `memory.ensureBank` once per account and then `memory.remember` for each item. Record successes in the manifest after each item, so a crash mid-way doesn't duplicate on rerun. Return an `IngestReport`. One failing item → an error string; continue with the others.
2. **`parseFiles(files, account, deps)`**: dispatch by extension. `.eml` → eml · `.json` → Slack export · `.txt`/`.md`/`.vtt` → transcript · `.mp3`/`.m4a`/`.wav`/`.webm` → audio. Unknown extension → error string. Also accept a **Slack export `.zip`** only if Node built-ins suffice; otherwise raise a proposal for a zip library.
3. **`.eml`** (with `postal-mime`, approved S20): `sourceId` = the Message-ID header (fall back to `file:<hash>`), date from the `Date` header → UTC ISO, participants from From/To/Cc display names (fall back to addresses), title = Subject, content = the plain-text body (convert HTML to text only if there's no text part; strip quoted replies starting with `>` or "On … wrote:"), type `email`.
4. **Slack export JSON**: Slack's per-channel, per-day files (an array of messages with `ts`, `user`, `user_profile.real_name`, `text`). **One Interaction per channel per day**: `sourceId = slack:<channel>:<YYYY-MM-DD>`, content = `"<time> <name>: <text>"` lines, participants = unique names, type `slack`, title `"#<channel> — <date>"`. The channel name comes from the parent folder name or the file's `channel` field. Verify the export format against Slack's help docs.
5. **Transcripts**: if the file starts with a front-matter header (the format below, shared with M04), use it directly. Otherwise call `llm.extract` with a Zod schema `{ date, title, participants, type }` from the first ~2,000 characters. If extraction returns `null`, use the file's name as the title, the current time as the date, and add a warning to `errors`. `sourceId = file:<sha256(content) first 16 hex>`.
   ```
   ---
   title: Call #2 — pricing discussion
   date: 2026-08-12T15:00:00Z
   type: call
   participants: Priya Nair, Alex Rivera
   ---
   Priya Nair: ...
   Alex Rivera: ...
   ```
   Parse this header by hand (no YAML library needed: `key: value` lines only). `.vtt`: strip the WEBVTT header and cue timings; keep `<v Speaker>` names as `Speaker:` prefixes.
6. **Audio**: `llm.transcribe(data, name)` → treat as a transcript with no header (step 5). Type `call`, source `audio`.

## Acceptance

- [ ] Fixture tests for every parser (small hand-made files in `test/fixtures/ingest/`), including a multipart `.eml` with an HTML-only body and quoted replies
- [ ] Dedupe: ingesting the same items twice → second report `added: 0, skipped: n`
- [ ] Items reach `FakeMemory.remember` in date order
- [ ] After M04 lands: `parseFiles(all files in seed/acme)` produces no errors, and interactions count equals `seed/acme/EXPECTED.md`'s count. Paste the output.

## References

Slack export format: https://slack.com/help/articles/220556107 · RFC 5322 (email headers): https://www.rfc-editor.org/rfc/rfc5322 · WebVTT: https://www.w3.org/TR/webvtt1/

## Out of scope

Live connectors (M08*). Live capture (M09). UI upload widget (M06).
