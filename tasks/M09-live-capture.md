# M09 — Live capture (Google Meet extension + capture route)

**Goal:** while a Google Meet call is running, capture its live captions with a Chrome extension, send them to the web app, and ingest the finished transcript as one `Interaction` when the call ends.

⚠️ **Consent:** everyone on the call must be told it's being transcribed. Recording and transcription laws vary, and some places require all-party consent. The extension must show a visible "Waada is capturing" indicator, and the popup must remind the user to announce it.

## Files you own

```
apps/web/src/routes/api/capture/meet/*        server routes (S7)
packages/core/src/capture/meet.ts             buffer + finalize → Interaction (core logic, testable)
apps/extension/**                             WXT extension (S9)
packages/core/test/capture*.test.ts
docs/capture.md                               user guide + consent note + known limitations
```
Dependencies: WXT (S9). Nothing else without a proposal.

## Build

**Core (`capture/meet.ts`)**
1. `appendCaptions(meetingId, lines: { speaker, text, ts }[])` → `.waada/capture/<meetingId>.json`. Captions are revised as the speaker talks, so the same caption line can arrive several times with growing text. Keep the **latest version** per caption line (design the key; document it).
2. `finalizeMeeting(meetingId, { account, title? })` → an `Interaction` (`type: "meeting"`, `source: "meet"`, `sourceId: meet:<meetingId>`, date = first caption time, participants = speakers, content = `Speaker: text` lines) → `ingest()` → delete the buffer file.

**Routes**
- `POST /api/capture/meet/captions` `{ meetingId, lines[] }` · `POST /api/capture/meet/end` `{ meetingId, account, title? }` · `GET /api/capture/accounts` (for the popup dropdown)
- Validate bodies with Zod. Allow CORS **only** from the extension's origin (`chrome-extension://<id>`; make the ID configurable). The app binds to localhost (S15).

**Extension (WXT, Manifest V3)**
- Content script on `https://meet.google.com/*`: the user turns on Meet captions; a `MutationObserver` reads the caption region's speaker and text. **Isolate all DOM selectors in one file** (`selectors.ts`). Meet's DOM changes without notice, and this is the part that will break.
- Batch lines every ~2 s to `/captions`. On leaving the call (or clicking Stop) → `/end`.
- Popup: pick an account (from `/api/capture/accounts`), Start/Stop, a status line ("Capturing: 42 lines"), the consent reminder, and the web app URL setting (default `http://localhost:<port>`).
- If captions are off or selectors find nothing for 30 s, show a warning in the popup (not silent failure).

## Acceptance

- [ ] Core tests: caption revision dedupe, finalize → Interaction shape, buffer deleted after ingest
- [ ] Route tests: validation errors → 400 with a message; wrong origin → rejected
- [ ] Manual: a real Meet call (2 browser profiles is enough) → Stop → the meeting appears in the account's memory and a follow-up `ask` finds something said in it. Describe the steps; include a screenshot of the popup.
- [ ] `docs/capture.md` lists limitations honestly (captions must be on; language support depends on Meet; selector fragility)

## References

WXT: https://wxt.dev · Chrome MV3: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 · Meet captions help: https://support.google.com/meet/answer/10212276

## Out of scope (roadmap, documented only)

Phone calls via Twilio Media Streams, dialer APIs (Aircall, RingCentral), Zoom/Teams capture. Uploading call recordings is already covered by M03's audio parser.
