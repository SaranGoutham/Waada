# M08c — HubSpot connector

**Goal:** (1) read a deal's **CRM fields**, so the CRM-only baseline uses real CRM data, and (2) import the deal's logged **notes, emails and call summaries** as `Interaction`s.

## Files you own

```
packages/core/src/connectors/hubspot.ts      (+ add your exports to connectors/index.ts)
packages/core/test/hubspot*.test.ts  packages/core/test/hubspot.live.test.ts
docs/connectors/hubspot.md
```
Dependency: `@hubspot/api-client` (S19).

## Build

1. Token from `HUBSPOT_TOKEN` (private app). A deal is identified by `dealId` in `opts`. Also support lookup by name if the search API allows it simply.
2. `crmFields(account, { dealId })` returns `{ dealname, dealstage (label, not ID), amount, closedate, owner name, next step }`. Verify property names in HubSpot's docs. M05's `baselineCrm` uses this when HubSpot is configured.
3. `fetchInteractions(account, { dealId, since? })`: the deal's associated engagements (notes, emails, calls, meetings) → `Interaction` with `sourceId = hubspot:<engagementId>`, the real timestamp, type mapped (note→note, email→email, call→call, meeting→meeting), and content = body text with HTML stripped.
4. Last sync per deal → `.waada/connectors/hubspot.json`.
5. `docs/connectors/hubspot.md`: create a developer test account, create a private app, the **read-only** scopes needed (verify the minimal set), and create a sample deal from `seed/acme/crm.json`.

## Acceptance

- [ ] Unit tests with the client mocked: field mapping (stage label resolution), engagement mapping, HTML stripping
- [ ] Live test against the human's test account. Paste the output.
- [ ] `compare("acme")` uses HubSpot fields when `HUBSPOT_TOKEN` is set (coordinate with M05: you only provide `crmFields`)

## References

Node client: https://github.com/HubSpot/hubspot-api-nodejs · Private apps: https://developers.hubspot.com/docs/api/private-apps · CRM API overview: https://developers.hubspot.com/docs/api/crm/understanding-the-crm
