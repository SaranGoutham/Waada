# Synthetic Data Plan

> *"The #1 thing that will make your project look real is the data."*

All data is fictional but must **feel** real: real-sounding names, numbers, dates, and the messy texture of actual sales conversations.

## Schema

Each account is one JSON file in `seed/accounts/`:

```json
{
  "account": {
    "id": "acme",
    "name": "Acme Corp",
    "industry": "Mid-market logistics SaaS",
    "deal_value_usd": 86000,
    "stage": "Mid-stage / evaluation",
    "crm_next_step": "Follow up next week"
  },
  "people": [
    {"name": "Priya Nair", "title": "VP Operations", "role": "champion"},
    {"name": "David Chen", "title": "CFO", "role": "blocker"},
    {"name": "Alex Rivera", "title": "Account Executive (left the company)", "role": "former_owner"}
  ],
  "interactions": [
    {
      "id": "call-1",
      "type": "call",
      "date": "2026-08-01",
      "title": "Discovery call",
      "participants": ["Priya Nair", "Alex Rivera"],
      "content": "... transcript-style text ...",
      "context": "Call #1 — discovery"
    },
    {
      "id": "email-1",
      "type": "email",
      "date": "2026-08-05",
      "title": "Follow-up email",
      "participants": ["Alex Rivera", "Priya Nair"],
      "content": "... email body ...",
      "context": "Email — follow up after call #1"
    }
  ]
}
```

The seeder calls `retain()` per interaction, in date order, passing `timestamp=date` and `metadata={type, participants, account}`.

## Hero account: Acme Corp (must contain ALL demo elements)

| Element | What to write | Why |
|---|---|---|
| Champion | Priya Nair (VP Ops) — personally pushing Q4 go-live | Stakeholder memory |
| Blocker | CFO David Chen wants security/compliance docs | Open commitment |
| **Objection + resolution** | Call #2 (Aug 12): Priya objects to monthly pricing → Alex resolves with annual billing + 8% discount | The landmine warning |
| **Undelivered promise** | Sep 2: Alex promises security docs to the CFO — never sent | The kicker moment |
| Prospect's own words | Priya: *"We got burned by a vendor who disappeared after signing."* | Emotional recall in briefing |
| Temporal anchor | Something that changed since July (e.g., timeline moved from Q3 to Q4) | Powers the temporal-recall demo |
| Recent event | Sep 18: Alex's last call — Priya asks about onboarding support | "Last known state" before the quit |

**Timeline:** Jul 28 intro email → Aug 1 discovery call → Aug 12 pricing call (objection resolved) → Aug 20 champion forwards CFO's concerns → Sep 2 security docs promised → Sep 18 final call → Sep 26 Alex resigns.

## Supporting accounts

- **Nova Logistics** (~5 interactions): smaller deal, similar pricing objection resolved the *same* way → enables a cross-deal observation via `reflect()`: *"Pricing objections on deals >$50K resolve with annual billing."*
- **Briar & Co** (optional, 3 interactions): a deal that died after a botched handoff — the cautionary tale for the demo intro.

## Generation strategy

1. Draft each account with your LLM of choice using the schema above + the element checklist.
2. **Realism pass** (do not skip):
   - Vary sentence length; include interruptions, small talk, one typo in an email
   - Real numbers: $86,000 ARR, 240 seats, 3-week pilot, Net-30 terms
   - Real product-flavor: module names, "SSO requirement", "SOC 2 Type II report"
   - Dates must be internally consistent (check the timeline!)
3. Human-review every file once — you'll be quoting these on stage.

## What the data must produce at demo time

- `brief acme` → surfaces: champion/blocker, resolved objection (**do not re-open**), undelivered promise (**do this first**), Priya's quote, Q4 timeline
- `ask acme "What changed since July?"` → timeline shift Q3→Q4
- `handoff-report acme` → includes a reflected observation about annual billing
- `amnesia acme` → generic discovery restart that re-raises pricing
