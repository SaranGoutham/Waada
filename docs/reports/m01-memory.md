# M01 Memory: report

**Status:** review · **Plan:** [2026-09-27-m01-memory.md](../superpowers/plans/2026-09-27-m01-memory.md) · **Spec:** [2026-09-27-m01-memory-design.md](../superpowers/specs/2026-09-27-m01-memory-design.md)

## What was built

`Memory` (AGENTS.md §6.4) over `@vectorize-io/hindsight-client` **0.10.1** (pinned exactly).

| File | What |
|---|---|
| `packages/core/src/memory/index.ts` | `createMemory()`: builds a `HindsightClient` from `.env`. `ConfigError` if `HINDSIGHT_BASE_URL` is unset. The API key is optional (local Docker without auth). No network call at construction. The SDK's own retry is off (`maxAttempts: 1`). |
| `packages/core/src/memory/hindsight.ts` | `HindsightMemory`, coded against `HindsightApi` (the 5 client methods used; `HindsightClient` satisfies it structurally, no cast). |
| `packages/core/test/memory.test.ts` | 19 unit tests with a fake `HindsightApi`: field mapping, dates, errors, retry, config. |
| `packages/core/test/memory.live.test.ts` | Live smoke test (2 tests) against a real Hindsight. |

Behaviour:
- `ensureBank`: `createBank(bankIdFor(account), { reflectMission, retainMission })`. Both missions are the brief's mission text. Cached per process, and a failed create is not cached.
- `remember`: sync `retain`. `context = "<type> — <title>"`, `timestamp = i.date`, `documentId = i.sourceId`, metadata `{ type, participants (", "-joined), account, source }`, all strings as the API requires.
- `search`: `recall` with `budget` (default `"mid"`), `maxResults` applied client-side. `date` is `occurred_start`, else `mentioned_at`, else `null`, always normalised to `...Z`. **A bank that doesn't exist yet returns `[]`** (Hindsight answers 404).
- `reflect`: returns `response.text`. `deleteBank`: deletes the bank and forgets the cache entry.
- **Errors:** every public method throws only `ExternalServiceError` (a `WaadaError`). There is one retry (500 ms) on network failures, 429 and 5xx, and none on other 4xx.

| Case | Message |
|---|---|
| Unreachable / 5xx | `Couldn't reach Hindsight at <url>[ (HTTP 5xx)]. Is the server running / is the API key right?` |
| 401 / 403 | `Hindsight rejected the API key (HTTP 401). Check HINDSIGHT_API_KEY in .env.` (the key is never included) |
| 429 | `Hindsight is busy (HTTP 429). Try again shortly.` |
| Other 4xx | `Hindsight rejected the <op> request (HTTP <status>).` |

Logs record only the operation, the status and the error class name, never SDK messages (they could echo request details).

## Verified facts (live, Hindsight Cloud)

- **Same `document_id` retained twice → replaced, not duplicated.** After the re-retain, the bank's document list is `["file:smoke0000000001"]`, and the document text is the new content (ending "Update: the report was sent."). This is the server default `update_mode: "replace"`.
- **Missing bank:** `recall` → HTTP 404, which `search` maps to `[]`. `reflect` → 200 with a "no information available" answer.
- **Recall dates:** a fact gets its own `occurred_start` inferred by Hindsight. "Send the report by Friday" from an Aug 12 call came back dated `2026-08-14`. Recall `text` has a `" | When: <date> | Involving: <names>"` suffix added by Hindsight.

## Test commands and real output

Environment: live tests ran against **Hindsight Cloud** (`https://api.hindsight.vectorize.io`). Only `.env` changes for local Docker.

`npx pnpm@12.6.0 check` → exit 0

```
Checked 44 files in 110ms. No fixes applied.
```

`npx pnpm@12.6.0 --filter @waada/core exec vitest run test/memory.test.ts`

```
      Tests  19 passed (19)
```

`npx pnpm@12.6.0 test` → exit 1, **not from M01**:

```
 FAIL  test/foundation.test.ts > public index > exports the contract names, with stubs for unbuilt modules
AssertionError: promise resolved "{ chat: [AsyncFunction chat], …(2) }" instead of rejecting
 Test Files  1 failed | 12 passed (13)
      Tests  1 failed | 87 passed (88)
```

That line is `createLLM` still asserted as a stub while M02's real `createLLM` is **uncommitted** in the shared folder. It fails only with M02's working tree and is M02's to remove. M01 deleted its own `createMemory` stub line.

`npx pnpm@12.6.0 --filter @waada/core exec vitest run --mode live --silent=false --reporter=verbose test/memory.live.test.ts`:

```
search hits: [
  {
    "text": "Sam Lee promised to provide the SOC 2 Type II report to Acme. | When: 2026-08-14 | Involving: Sam Lee",
    "date": "2026-08-14T00:00:00.010Z",
    "context": "call — Discovery call — champion",
    "documentId": "file:smoke0000000001"
  },
  {
    "text": "Dana Reyes (VP of Engineering at Acme) is the champion for the deal and will advocate for the internal security review. | When: 2026-08-12 | Involving: Dana Reyes",
    "date": "2026-08-12T15:00:00.000Z",
    "context": "call — Discovery call — champion",
    "documentId": "file:smoke0000000001"
  }
]
reflect: ### Champion
The champion for the deal is **Dana Reyes**, the VP of Engineering at Acme. She is actively advocating for our solution during their internal security review process.
### Promises
We have made the following commitment to the prospect:
* **SOC 2 Type II Report:** Sam Lee promised to provide Acme with our SOC 2 Type II report.
documents after re-retain: ["file:smoke0000000001"]
document text now: Discovery call with Acme on August 12, 2026. Dana Reyes, VP of Engineering, said she is our champion and will push the security review internally. Sam Lee promised to send the SOC 2 Type II report by Friday. Update: the report was sent.
 ✓ … ensureBank → remember → search → reflect → re-retain → deleteBank 27508ms
missing bank reflect → The available records do not contain any information regarding "Waada smoke" …
 ✓ … search on a bank that was never created returns no hits; reflect still answers 8782ms
      Tests  2 passed (2)
```

(The search hits and reflect text above are from the previous identical run. The final run printed the same shape, and both runs passed.)

## Unverified (`// VERIFY:`)

None. Every SDK call, option name and error shape was checked against the 0.10.1 source, and again by the reviewer.

## Proposals raised

None.

## Review

One whole-branch review (fresh reviewer), with no Critical findings. Two Important findings were fixed test-first: 429 was not retried and was labelled "couldn't reach", and other 4xx were labelled "couldn't reach". Deferred minors:
- `deleteBank` gets a plain `Error` from the SDK with no status, so a 401/403/404 on delete is retried once and labelled "couldn't reach".
- A negative `maxResults` silently drops hits.
- `memory.live.test.ts` errors at import (instead of skipping) when `.env` has no `HINDSIGHT_BASE_URL`.
- No `Retry-After` handling: a 429 gets one fixed 500 ms backoff.

## Follow-ups for other modules

- **M02:** remove the `createLLM` "not implemented" line in `foundation.test.ts` when committing `createLLM`.
- **M03:** local dedupe still pays off. Hindsight replaces on the same `document_id`, but every retain re-runs LLM extraction (cost and time: about 10–20 s per sync retain on Cloud). A `WaadaError` from `remember` can go into `IngestReport.errors` unchanged.
- **M05:** `search` dates prefer `occurred_start` (the fact's own time, which can differ from the interaction date). Hit `text` carries Hindsight's `| When: … | Involving: …` suffix. `search` on an empty account returns `[]`, so no special case is needed.
- **M06 / M07:** show `ExternalServiceError.message` as-is. It is written for users.
- **M10:** re-importing the same interaction replaces the Hindsight document rather than duplicating it.
