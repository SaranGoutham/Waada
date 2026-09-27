# M08a — Slack connector

**Goal:** pull a deal channel's history from Slack's API into `Interaction`s (same shape as M03's Slack-export parser), so users can sync instead of exporting.

## Files you own

```
packages/core/src/connectors/slack.ts
packages/core/src/connectors/index.ts        (create if missing; export only your function. M08b and M08c add theirs)
packages/core/test/slack*.test.ts  packages/core/test/slack.live.test.ts
docs/connectors/slack.md                      setup guide for the human
```
Dependency: `@slack/web-api` (S12).

## Build

1. `fetchInteractions(account, { channel, since? })`: token from `getEnv().slackBotToken` (`requireEnv("SLACK_BOT_TOKEN")`). Resolve the channel name to an ID. Page through `conversations.history` (all pages, oldest → newest), resolve user IDs to real names with a cached `users.info` lookup, skip bot/join/leave subtypes.
2. **Group exactly like M03**: one Interaction per channel per day, `sourceId = slack:<channel>:<YYYY-MM-DD>`, same content format. Reuse M03's formatting helper if it's exported; otherwise propose exporting it (don't copy-paste).
   **Heads-up:** a day that grows after a sync keeps the same `sourceId`, so dedupe would skip the new messages. Propose a fix in `PROPOSALS.md`: e.g. only sync days that have fully ended, or include the message count in the ID.
3. Store the last sync time per account and channel in `.waada/connectors/slack.json`. `since` defaults to it.
4. Rate limits: respect `Retry-After` (the SDK has retry options; verify). Errors → `ExternalServiceError` with a hint ("Invite the bot to #channel").
5. `docs/connectors/slack.md`: create a Slack app, the scopes needed (verify the minimal set, e.g. `channels:history`, `channels:read`, `users:read`), install it, invite the bot, set `SLACK_BOT_TOKEN`.

## Acceptance

- [ ] Unit tests with the Slack client mocked: pagination, grouping by day, name resolution, since-filter
- [ ] Live test against the human's test workspace `#deal-acme`. Paste the output.

## References

`@slack/web-api`: https://tools.slack.dev/node-slack-sdk/web-api · `conversations.history`: https://api.slack.com/methods/conversations.history · Scopes: https://api.slack.com/scopes
