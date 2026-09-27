# M01 — Memory (Hindsight wrapper)

**Goal:** implement the `Memory` interface (AGENTS.md §6.4) on top of Hindsight's official TypeScript client. This is the **only** code that talks to Hindsight.

## Files you own

```
packages/core/src/memory/index.ts        (replace M00's stub)
packages/core/src/memory/hindsight.ts
packages/core/test/memory.test.ts
packages/core/test/memory.live.test.ts
```
Dependency to add: `@vectorize-io/hindsight-client` (approved, S2).

## Build

1. `createMemory()` builds a client from `getEnv().hindsightBaseUrl` / `hindsightApiKey`. It works for **both Hindsight Cloud and local Docker** (S2). The API key is optional for a local server without auth. Missing base URL → `ConfigError`.
2. `ensureBank(account)`: create the bank `bankIdFor(account)` if missing, with this mission (verify the SDK's parameter name for mission/background):
   > "You are the continuity memory for a B2B sales deal. Track what the prospect said, what our team promised and whether it was delivered, objections raised and how they were resolved, stakeholder roles and sentiment, and how things changed over time."
   Cache known banks in memory for the process lifetime.
3. `remember(i)`: `retain` with `content = i.content`, `context = "<type> — <title>"`, **`timestamp = i.date`** (the real date; this is what enables "what changed since July?"), `document_id = i.sourceId`, metadata `{ type, participants (joined), account, source }`. Use the SDK's **synchronous** retain mode if it has one, so demos are deterministic. Check the docs for which metadata value types are allowed.
4. `search(...)`: `recall` → map results to `MemoryHit` (text, date, context, documentId; null where absent). Map `budget` to the SDK's budget option.
5. `reflect(...)`: call Hindsight `reflect` and return its text answer.
6. `deleteBank(...)`: delete the bank (used for "reset account").
7. Errors: network, auth or 5xx → `ExternalServiceError` with a friendly message ("Couldn't reach Hindsight at <url>. Is the server running / is the API key right?"). One retry with backoff on network errors and 5xx only.
8. **Verify and document** in your report what Hindsight does when `retain` is called twice with the same `document_id` (replace or duplicate?). M03 dedupes locally either way, but M10 needs to know.

## Acceptance

- [ ] Unit tests mock the client at the module boundary: field mapping, error mapping, retry
- [ ] `memory.live.test.ts` (runs with `pnpm test:live`, needs `.env`): ensureBank `waada-smoke` → remember an interaction dated 2026-08-12 → search "Who is the champion?" returns it with its date → reflect returns non-empty text → deleteBank. Paste real output in your report.
- [ ] Runs against Cloud **or** Docker by changing only `.env` (test at least one; say which)

## References

TS client: https://hindsight.vectorize.io/sdks/nodejs · npm: https://www.npmjs.com/package/@vectorize-io/hindsight-client · Hindsight docs: https://hindsight.vectorize.io/ · Local install: https://hindsight.vectorize.io/developer/installation

## Out of scope

Deciding what to search for (M05). Parsing files (M03).
