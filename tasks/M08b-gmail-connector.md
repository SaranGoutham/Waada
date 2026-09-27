# M08b — Gmail connector

**Goal:** pull email threads with a prospect's domain from Gmail into `Interaction`s, using Google OAuth (Waada itself has no user login, S15, but Google requires its own consent).

## Files you own

```
packages/core/src/connectors/gmail.ts        (+ add your export to connectors/index.ts)
apps/web/src/routes/api/oauth/google/*       start + callback server routes
packages/core/test/gmail*.test.ts  packages/core/test/gmail.live.test.ts
docs/connectors/gmail.md
```
Dependency: `googleapis` (S11).

## Build

1. OAuth: read the client JSON from `GOOGLE_CREDENTIALS_PATH`. The start route redirects to Google consent with **read-only** Gmail scope (`gmail.readonly`; verify it's the minimum), `access_type=offline`. The callback exchanges the code and stores tokens in `.waada/connectors/gmail.json`. Refresh them automatically.
2. `fetchInteractions(account, { domain, since? })`: Gmail search `from:@<domain> OR to:@<domain>` (+ `after:` from `since`). For each message: `sourceId` = the RFC `Message-ID` header (so the same email imported as `.eml` by M03 dedupes against it). Date, participants, subject and plain-text body are mapped **exactly like M03's `.eml` parser** (reuse its helpers; if not exported, propose it).
3. Last sync per account → `.waada/connectors/gmail.json`.
4. `docs/connectors/gmail.md`: create a Google Cloud project, enable the Gmail API, OAuth consent screen in **testing** mode with your Gmail as a test user, create an OAuth client (type: web app, redirect `http://localhost:<port>/api/oauth/google/callback`), download the JSON. Verify each step against Google's docs.

## Acceptance

- [ ] Unit tests with the Gmail client mocked: query building, header mapping, token refresh path
- [ ] Manual: Connect Gmail in the web app → sync a test domain → the interactions appear in the Import preview. Describe the steps and result.
- [ ] Tokens never logged; `.waada/` is gitignored

## References

Gmail API: https://developers.google.com/gmail/api · Node client: https://github.com/googleapis/google-api-nodejs-client · Search operators: https://support.google.com/mail/answer/7190 · OAuth consent testing mode: https://support.google.com/cloud/answer/10311615
