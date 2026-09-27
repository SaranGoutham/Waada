# Acme Corp — expected answers (ground truth for M05 / M10)

All files live under `seed/acme/`. All people, companies, and addresses are
fictional (`example.com` only).

## Interaction counts (as M03 counts: 1/email, 1/transcript, 1/Slack channel-day)

| Source | Count | Files |
|---|---|---|
| Emails | 14 | `emails/email-*.eml` (0714, 0716, 0723, 0730, 0805, 0813, 0814, 0815, 0821, 0828, 0903, 0910, 0919, 0925) |
| Calls | 8 | `transcripts/call-0{1..8}-*.txt` |
| Slack days (`#deal-acme`) | 11 | `slack/deal-acme/2026-{07-15,07-22,08-05,08-12,08-13,08-20,08-28,09-02,09-11,09-18,09-24}.json` |
| **Total** | **33** | over 11 weeks (Jul 14 – Sep 25, 2026) |

Two transcripts have no front-matter header (M03 LLM-extraction path):
`call-04-pilot-scoping.txt`, `call-07-commercial.txt`.

## Commitments

1. **OPEN — SOC 2 Type II report + security questionnaire.**
   Made by Alex Rivera to David Chen on 2026-09-02, mid-call (the call's main
   topic was DPA/SSO/Net-30). Proof: `transcripts/call-06-security-legal.txt`
   (the only source file mentioning it — deliberately mentioned once).
   Never delivered: `emails/email-0903-dpa-redlines.eml` returns the DPA markup
   with no report attached, and `slack/deal-acme/2026-09-02.json` shows the
   package track going quiet. Expected status: **open**.
2. **DELIVERED — annual-pricing proposal.** Promised by Alex Rivera to Priya Nair
   on 2026-08-13 (`emails/email-0813-pricing-promise.eml`), delivered 2026-08-15
   (`emails/email-0815-pricing-proposal.eml`, $86,000 ARR). Expected: **delivered**.
3. **UNCLEAR — loop in the onboarding lead.** Said by Alex Rivera to Priya Nair on
   2026-09-18 (`transcripts/call-08-golive-shift.txt`). The only later trace is
   internal: `slack/deal-acme/2026-09-24.json` ("did anyone ping onboarding?" —
   no answer on record). Expected: **unclear**.

## Landmines (resolved — do NOT re-open)

1. **Monthly pricing.** Raised by Priya Nair on the 2026-08-12 call
   (`transcripts/call-03-pricing.txt`), resolved to annual billing + 8% discount,
   explicitly accepted in writing 2026-08-14
   (`emails/email-0814-priya-accepts-annual.eml`). Guidance: never quote monthly
   again; finance sees the August numbers only (`emails/email-0910-commercial-thread.eml`).
2. **Burned by a previous vendor.** Priya Nair, 2026-07-15
   (`transcripts/call-01-discovery.txt`): a vendor disappeared after signing.
   Guidance: lead with continuity (account record, named owners), never promise
   casually — this is why the Sep 2 open item hurts.

## Timeline change

- Before: go-live target **Q3 2026**, set 2026-07-29
  (`transcripts/call-02-requirements.txt`, `emails/email-0730-recap.eml`).
- After: go-live moved to **Q4 2026** (early-October onboarding) on 2026-09-18
  (`transcripts/call-08-golive-shift.txt`), confirmed in writing 2026-09-19
  (`emails/email-0919-golive-q4.eml`). Signature stays in September.

## Reference numbers

$86,000 ARR · 240 seats · 3-week pilot (west region, ~40 seats) · Net-30 ·
SSO via Okta (SAML, enforced, SCIM).

## 5 questions a new AE would otherwise re-ask

1. "Did we ever send the SOC 2 report?" → No — promised Sep 2, never delivered.
   Answer in `transcripts/call-06-security-legal.txt` (+ absence in `emails/email-0903-dpa-redlines.eml`).
2. "What pricing did they actually agree to?" → Annual billing + 8% discount, $86k ARR.
   Answer in `emails/email-0814-priya-accepts-annual.eml`.
3. "Did the pilot work?" → Yes, go on Aug 27 (11/12 leads self-sufficient).
   Answer in `transcripts/call-05-pilot-readout.txt`.
4. "When is go-live?" → Q4 (moved from Q3 on Sep 18).
   Answer in `emails/email-0919-golive-q4.eml`.
5. "Who owns the October training dates?" → Unclear — Alex said he'd loop in
   onboarding; nobody confirmed. Answer in `slack/deal-acme/2026-09-24.json`.

---

# Nova Logistics — expected answers (for cross-deal `reflect()`)

6 interactions over ~4 weeks (Aug 2026): 2 emails
(`emails/nova-0803-intro.eml`, `emails/nova-0813-pricing-accept.eml`),
2 calls (`transcripts/nova-01-discovery.txt`, `transcripts/nova-02-pricing.txt`),
2 Slack days (`slack/deal-nova/2026-08-04.json`, `slack/deal-nova/2026-08-11.json`).
`crm.json`: Proposal, $54,000, close 2026-11-30.

Cross-deal pattern: a monthly-pricing objection resolved with annual billing —
same shape as Acme's landmine 1 (Acme: annual + 8%; Nova: annual + 10%).
