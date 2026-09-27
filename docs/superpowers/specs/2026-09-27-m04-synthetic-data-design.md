# M04 Synthetic Data — Design Spec

**Date:** 2026-09-27 · **Status:** timeline approved by human (chat, 2026-09-27)
**Brief:** `tasks/M04-synthetic-data.md` · **Plan:** `docs/superpowers/plans/2026-09-27-m04-synthetic-data.md`

## 1. Purpose

Fictional-but-realistic deal histories as real export files, messy enough that a plain
LLM summary could miss or bury key items. Ground-truth answer key (`EXPECTED.md`) lets
M05/M10 test whether Waada surfaces what baselines bury. No code.

## 2. People (all fictional, all `example.com`)

| Person | Role | Email |
|---|---|---|
| Priya Nair | VP Operations, Acme (champion) | priya.nair@example.com |
| David Chen | CFO, Acme (blocker) | david.chen@example.com |
| Alex Rivera | AE, our side (resigns Sep 26) | alex.rivera@example.com |
| Meenakshi Rao | Sales engineer, our side | meenakshi.rao@example.com |
| Bhavana Iyer | Sales manager, our side | bhavana.iyer@example.com |

Human asked for Meenakshi and Bhavana by first name; surnames Rao / Iyer are my
choice for realism. Slack UIDs: `U01ALEX`, `U02MEENA`, `U03BHAV` (+ prospect-side
`U04PRIYA` if Priya appears in shared channel — no, `#deal-acme` is internal;
prospects never appear in Slack).

## 3. Acme: 33 interactions (8 calls + 14 emails + 11 Slack days), Jul 14 – Sep 25 2026

Counting rule (M03): 1 per `.eml`, 1 per transcript, 1 per Slack channel-day.

### 3.1 Required story elements → file mapping

- **Open commitment (kicker):** `call-06-security-legal.txt` (Sep 2). Main topic DPA/SSO;
  mid-call Alex promises David Chen the SOC 2 Type II report + security questionnaire.
  Mentioned once. Never delivered (`email-0903-dpa-redlines.eml` conspicuously lacks it;
  `slack/2026-09-02.json` shows it slipping through).
- **Delivered commitment:** `email-0813-pricing-promise.eml` promises annual-pricing
  proposal → `email-0815-pricing-proposal.eml` delivers it ($86k ARR).
- **Unclear commitment:** `call-08-golive-shift.txt` (Sep 18) "I'll loop in our onboarding
  lead" → `slack/2026-09-24.json` "did anyone ping onboarding?" — genuinely unclear.
- **Landmine 1:** `call-03-pricing.txt` (Aug 12) monthly-pricing objection → annual + 8%
  discount; **explicitly accepted** by Priya in `email-0814-priya-accepts-annual.eml`.
- **Landmine 2:** `call-01-discovery.txt` (Jul 15) — burned by a vendor who disappeared
  after signing → guidance: lead with continuity, don't promise casually.
- **Change over time:** Q3 go-live (set Jul 29) → Q4 (`call-08-golive-shift.txt` Sep 18,
  confirmed `email-0919-golive-q4.eml`).
- **Noise:** scheduling (`email-0714`, `email-0821`), small talk + typos
  (`email-0828`), internal joke (`slack/2026-08-05.json`), pricing mentioned without
  re-opening (`email-0910-commercial-thread.eml`).
- **Numbers:** $86,000 ARR, 240 seats, 3-week pilot, Net-30, SSO requirement.

### 3.2 File list (exact names)

Transcripts (`seed/acme/transcripts/`, header per brief §Formats; **2 headerless**:
`call-04-pilot-scoping.txt`, `call-07-commercial.txt` — each still embeds date +
participants in dialogue so M03's LLM extraction path has signal):

1. `call-01-discovery.txt` — Jul 15
2. `call-02-requirements.txt` — Jul 29
3. `call-03-pricing.txt` — Aug 12
4. `call-04-pilot-scoping.txt` — Aug 20 (NO header)
5. `call-05-pilot-readout.txt` — Aug 27
6. `call-06-security-legal.txt` — Sep 2
7. `call-07-commercial.txt` — Sep 11 (NO header)
8. `call-08-golive-shift.txt` — Sep 18

Emails (`seed/acme/emails/`, RFC 5322, `Message-ID: <acme-MMDD-<slug>@example.com>`):
`email-0714-intro-scheduling.eml`, `email-0716-discovery-followup.eml` (reply chain),
`email-0723-sso-requirements.eml` (multipart), `email-0730-recap.eml`,
`email-0805-pilot-proposal.eml`, `email-0813-pricing-promise.eml`,
`email-0814-priya-accepts-annual.eml` (reply chain), `email-0815-pricing-proposal.eml`
(multipart), `email-0821-pilot-logistics.eml`, `email-0828-pilot-results.eml` (typos),
`email-0903-dpa-redlines.eml`, `email-0910-commercial-thread.eml`,
`email-0919-golive-q4.eml`, `email-0925-handover.eml`.

Slack (`seed/acme/slack/deal-acme/YYYY-MM-DD.json` + `users.json`, `channels.json`,
message shape per brief): 07-15, 07-22, 08-05, 08-12, 08-13, 08-20, 08-28, 09-02,
09-11, 09-18, 09-24. `ts` = real Unix epoch for the message time (compute at write
time; format `"1723....000100"`).

`crm.json`: `{account: Acme Corp, stage: Evaluation, amount_usd: 86000,
close_date: 2026-12-15, owner: Unassigned, next_step: Follow up next week}`.

## 4. Nova: 6 interactions over ~4 weeks (Aug 2026)

Same structure. Monthly-pricing objection also resolved with annual billing, so
`reflect()` can surface the cross-deal pattern. 2 calls (`nova-01-discovery.txt`
with header, `nova-02-pricing.txt` with header), 2 emails, 2 Slack days
(`#deal-nova`), + `crm.json` + Nova section in `EXPECTED.md`.

## 5. `EXPECTED.md` contents

- Total counts as M03 will count them (Acme 33 = 14 + 8 + 11; Nova 6 = 2 + 2 + 2).
- Every commitment: text, made-by, made-to, date, expected status, proof files.
- Every landmine: topic, resolution, date, source file.
- Timeline change (Q3→Q4) with before/after + sources.
- 5 "questions a new AE would otherwise re-ask" + file containing each answer.

## 6. Verification (no test framework — data module)

A throwaway Node script (in temp dir, NOT committed) checks: file counts,
date-sorted consistency, every `.eml` has Message-ID/Date/From/To/Subject,
exactly 2 headerless transcripts, `example.com`-only addresses, Slack `ts`
matches filename date, `crm.json` shape. Real output pasted into the final report.

## 7. Open decisions

None. Only assumption: Meenakshi/Bhavana surnames and emails (above).
