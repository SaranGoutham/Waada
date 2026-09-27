# M01 Memory: design

**Brief:** [tasks/M01-memory.md](../../../tasks/M01-memory.md) · **Contract:** AGENTS.md §6.4 · **SDK:** `@vectorize-io/hindsight-client` 0.10.1 (checked from the published package source, 2026-09-27)

## Goal

Implement `Memory` (§6.4) over Hindsight's official TypeScript client. This is the only code in the repo that imports the client (AGENTS.md rule 4). It must work against Hindsight Cloud and local Docker, and only `.env` changes between the two.

## Approach

Wrap the official `HindsightClient` class. `HindsightMemory` depends on a narrow interface (`HindsightApi`) listing only the five client methods it uses, so unit tests inject a fake at that boundary.

Rejected alternatives:
- The lower-level generated `sdk.*` functions: better access to HTTP status codes, but more code coupled to generated internals.
- Plain `fetch`: throws away the official SDK.

## Files

| File | Contents |
|---|---|
| `packages/core/src/memory/index.ts` | `Memory` interface (unchanged) and `createMemory()` |
| `packages/core/src/memory/hindsight.ts` | `HindsightApi` interface, `HindsightMemory` class, `BANK_MISSION`, error mapping, retry, date conversion |
| `packages/core/test/memory.test.ts` | unit tests with a fake `HindsightApi` |
| `packages/core/test/memory.live.test.ts` | smoke test against a real server (`pnpm test:live`) |

## `createMemory()`

- Reads `getEnv()`. A missing `hindsightBaseUrl` throws `ConfigError("Missing configuration: HINDSIGHT_BASE_URL. …")`.
- Builds `new HindsightClient({ baseUrl, apiKey?, maxAttempts: 1 })`. `apiKey` is passed only when set, so a local server without auth works.
- `maxAttempts: 1` turns off the SDK's own 429/503 retry, so there is one retry policy (ours).

## Method mapping (SDK facts verified in the 0.10.1 source)

| `Memory` | Hindsight |
|---|---|
| `ensureBank(account)` | `createBank(bankIdFor(account), { reflectMission: BANK_MISSION, retainMission: BANK_MISSION })`. `mission` and `background` are deprecated in the SDK. `reflectMission` steers reflect, and `retainMission` steers what retain extracts. `createBank` is create-or-update (PUT), so there is no existence check. Successful bank ids are cached in a `Set` for the process lifetime. Returns the bank id. |
| `remember(i)` | `ensureBank(i.account)`, then `retain(bank, i.content, { context: "<type> — <title>", timestamp: i.date, documentId: i.sourceId, metadata: { type, participants: participants.join(", "), account, source }, async: false })`. Metadata is `Record<string, string>` in the SDK, so participants are joined. `async: false` is the server default, but it is sent explicitly to keep demos deterministic. |
| `search(account, query, opts)` | `recall(bank, query, { budget: opts.budget ?? "mid" })`. The results are mapped to `MemoryHit` and cut to `opts.maxResults` when given, because the SDK only limits by tokens. |
| `reflect(account, query)` | `(await reflect(bank, query)).text` |
| `deleteBank(account)` | `deleteBank(bank)`, then removes the bank from the cache |

`BANK_MISSION` is the exact text from the brief.

`search` and `reflect` don't call `ensureBank`. On a bank that doesn't exist yet, whatever Hindsight returns is mapped through the same error rules. The live run records this behaviour in the report.

### `RecallResult` → `MemoryHit`

- `text` ← `text`
- `date` ← `occurred_start ?? mentioned_at`, normalised with `new Date(x).toISOString()`. The server may return `+00:00` offsets, which Zod's `.datetime()` rejects. Missing or unparseable dates become `null`.
- `context` ← `context ?? null`
- `documentId` ← `document_id ?? null`

## Errors and retry

The SDK signals errors in three ways:
- It throws `HindsightError` with `statusCode` for HTTP errors.
- It throws `HindsightError` with `statusCode === undefined` when `fetch` itself failed. The generated client catches the fetch error and returns `{ error, response: undefined }`.
- `deleteBank` throws a plain `Error` (no status).

Rules, applied to every call through one helper, `call(op, fn)`:

- **Retryable:** a network failure (`HindsightError` without `statusCode`, or a thrown `TypeError`), or a status of 500 or above. Plain `Error`s from `deleteBank` are treated as retryable, because we can't tell the status and deleting is idempotent.
- **One retry** after 500 ms. The delay is injectable, and tests pass 0.
- **Mapping:**
  - 401 or 403 → `ExternalServiceError("Hindsight rejected the API key (HTTP 401). Check HINDSIGHT_API_KEY in .env.")`.
  - Anything else → `ExternalServiceError("Couldn't reach Hindsight at <baseUrl>. Is the server running / is the API key right?")`, with a `(HTTP <status>)` suffix when there is a status.
  - The original error is kept as `cause` and logged at debug level through `createLogger("memory")`, without the key. A `WaadaError` that is already thrown passes through unchanged.
- **Retrying synchronous `retain` is safe here.** The SDK itself doesn't retry sync retain because a repeat could duplicate a write. We always send a `document_id`, and the API's `update_mode` defaults to `replace` (per the generated API docs), so a repeat replaces the document instead of duplicating it. The live test confirms this.

## Testing

**Unit (`memory.test.ts`, fake `HindsightApi`, no network):**
- `ensureBank`: bank id and both missions sent; cached (a second call doesn't reach the client); returns the id.
- `remember`: exact `retain` arguments (context string, timestamp, documentId, string metadata, `async: false`); calls `ensureBank` first.
- `search`: budget passed through (default `mid`); `maxResults` slice; date normalisation (`+00:00` → `Z`, `occurred_start` preferred over `mentioned_at`, missing or invalid → `null`); every hit passes `MemoryHit.parse`.
- `reflect` returns `.text`. `deleteBank` calls the client and clears the cache (a later `ensureBank` calls `createBank` again).
- Errors:
  - A network error retries once and succeeds.
  - A 503 twice gives `ExternalServiceError` with the URL, after two calls.
  - A 400 is not retried.
  - A 401 gives the key message.
  - The message never contains the API key.
- `createMemory()` throws `ConfigError` when `HINDSIGHT_BASE_URL` is unset. This uses `vi.stubEnv("HINDSIGHT_BASE_URL", "")`: real env vars win over `.env`, and `getEnv()` treats an empty value as unset.

**Live (`memory.live.test.ts`, `pnpm test:live`, needs `.env`), run against Hindsight Cloud:**
1. `deleteBank("smoke")` best-effort cleanup, then `ensureBank("smoke")` returns `waada-smoke`.
2. `remember` an interaction dated `2026-08-12T15:00:00Z` that names a champion.
3. `search("smoke", "Who is the champion?")` returns a hit mentioning the champion whose date is on 2026-08-12.
4. `reflect` returns non-empty text.
5. Duplicate check: `remember` the same `sourceId` again with changed content, then count documents with that id. The M01 test file may call the client directly, because it lives in the memory module's files. The result (replace or duplicate) is recorded in the report.
6. `deleteBank("smoke")`.

**Shared-file change:** `foundation.test.ts` (M00) asserts `createMemory()` throws "not implemented: memory". The M00 report hands this assertion to M01. It is removed in the same commit that implements `createMemory`.

## Out of scope

Choosing queries (M05), parsing files (M03), local dedupe (M03).
