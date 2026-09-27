# M04 — Synthetic data

**Goal:** write realistic, fully fictional deal histories **as real export files** (`.eml`, Slack export JSON, transcripts), plus a ground-truth answer key used to test whether Waada works. No code. You can start immediately.

The data must be long and messy enough that **a plain LLM summary could miss or bury things**. That's what the summary baseline is tested against. Don't make it easy.

## Files you own

```
seed/acme/crm.json
seed/acme/emails/*.eml
seed/acme/slack/deal-acme/YYYY-MM-DD.json      (+ seed/acme/slack/users.json, channels.json)
seed/acme/transcripts/*.txt
seed/acme/EXPECTED.md
seed/nova/…   (same structure)
seed/README.md
```

## Formats (contract with M03; follow exactly)

- **Transcripts**: a front-matter header, then `Speaker: text` lines:
  ```
  ---
  title: Call #2 — pricing discussion
  date: 2026-08-12T15:00:00Z
  type: call
  participants: Priya Nair, Alex Rivera
  ---
  ```
  Leave **2 transcripts with no header**, so M03's LLM extraction path gets exercised.
- **`.eml`**: valid RFC 5322 with `Message-ID`, `Date`, `From`, `To`, `Subject`, a plain-text body. Include at least **one multipart** email (text + HTML) and **one with a quoted reply chain**.
- **Slack**: Slack's export layout: per-channel folder with one JSON file per day, each an array of messages `{ "type": "message", "user": "U…", "user_profile": { "real_name": "…" }, "text": "…", "ts": "1723480000.000100" }`. Include `users.json` and `channels.json`. Check the format against Slack's help article before writing.
- **`crm.json`**: only what a CRM would realistically hold after a rep leaves:
  `{ "account": "Acme Corp", "stage": "Evaluation", "amount_usd": 86000, "close_date": "2026-12-15", "owner": "Unassigned", "next_step": "Follow up next week" }`

## Acme Corp: required story elements

At least **30 interactions** over **at least 10 weeks** (e.g. mid-July to Sep 26, 2026). Mix: about 8 calls, 14 emails, and 10+ Slack days (internal channel `#deal-acme`, where Alex talks with the sales engineer and manager).

| Element | Requirement |
|---|---|
| People | Priya Nair (VP Operations, champion); David Chen (CFO, blocker); Alex Rivera (AE, resigns Sep 26); a sales engineer and a sales manager on our side |
| Commitment, **open** (the kicker) | Sep 2, **mentioned once, mid-call, not the call's main topic**: Alex promises the SOC 2 Type II report and security questionnaire to David Chen. **Never delivered.** |
| Commitment, **delivered** | e.g. Aug 13, Alex promises an annual-pricing proposal; an email on Aug 15 delivers it. The ledger must show **delivered** |
| Commitment, **unclear** | e.g. Sep 18, "I'll loop in our onboarding lead". Later, only an internal Slack message says "did anyone ping onboarding?". Status is genuinely unclear |
| Landmine 1 | Aug 12 call: Priya objects to monthly pricing → resolved with annual billing + 8% discount, **explicitly accepted** by Priya in a later email |
| Landmine 2 | A sensitive topic, e.g. Priya: *"We got burned by a vendor who disappeared after signing."* The guidance should be to lead with continuity, not to promise things casually |
| Change over time | Go-live target moves from **Q3 to Q4** (Sep 18 call), so "what changed since July?" has a clear answer |
| Noise | Scheduling emails, small talk, an internal Slack joke, one typo-laden email, a thread where pricing is *mentioned* again without re-opening it |
| Numbers | $86,000 ARR, 240 seats, 3-week pilot, Net-30, SSO requirement |

## Nova Logistics: pattern for `reflect()`

About 6 interactions. A smaller deal where a monthly-pricing objection is also resolved with annual billing, so a cross-deal observation ("pricing objections resolve with annual billing") is possible.

## `EXPECTED.md` (answer key: be precise)

- Total number of interactions **as M03 will count them** (1 per email, 1 per transcript, 1 per Slack channel-day)
- Every commitment: text, made by, made to, date, **expected status**, and the files that prove it
- Every landmine: topic, resolution, date, source file
- The timeline change, with before/after and sources
- 5 "questions a new AE would otherwise re-ask" and the file containing each answer. These feed the "re-asked questions" metric in M10.

## Acceptance

- [ ] All dates internally consistent (sorted listing matches the story)
- [ ] Every element in the table exists and is listed in `EXPECTED.md` with file names
- [ ] No real companies, people, emails or phone numbers (use `example.com` domains)
- [ ] `seed/README.md` explains the structure in 10 lines
- [ ] Human review requested in your report. The human will quote this data on stage.
