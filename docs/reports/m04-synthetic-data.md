# M04 Synthetic Data — Final Report

**Module:** M04 (Synthetic data) · **Status:** review · **Date:** 2026-09-27
**Spec:** `docs/superpowers/specs/2026-09-27-m04-synthetic-data-design.md`
**Plan:** `docs/superpowers/plans/2026-09-27-m04-synthetic-data.md` (all boxes ticked)

## What was built

Acme Corp: **33 interactions over 11 weeks** (Jul 14 – Sep 25, 2026) — 14 `.eml`,
8 transcripts, 11 Slack channel-days — plus thin `crm.json` and `EXPECTED.md`.
Nova Logistics: **6 interactions** (~4 weeks) mirroring the monthly→annual pricing
pattern for cross-deal `reflect()`. People: Priya Nair (champion), David Chen
(blocker), Alex Rivera (AE, exits Sep 26), Meenakshi Rao (SE), Bhavana Iyer
(manager) — human-requested names; all addresses `example.com`, all fictional.

All required story elements present: Sep 2 SOC 2 promise buried mid-call and never
delivered (string occurs in exactly one source file); delivered pricing proposal
(Aug 13→15); unclear onboarding loop-in (Sep 18 + Sep 24 Slack); both landmines
(Aug 12 monthly objection → annual+8% accepted Aug 14 in writing; Jul 15
burned-by-vendor); Q3→Q4 go-live move; noise (scheduling, small talk, joke,
typo-laden mobile email, pricing-mentioned-not-reopened); numbers ($86k, 240
seats, 3-week pilot, Net-30, SSO). Two headerless transcripts (`call-04`,
`call-07`); two multipart + two reply-chain emails.

Deviations from plan (mine, no approval needed): Nova email filenames use true
dates (`nova-0803-…`, `nova-0813-…`) instead of the planned `0804`/`0811` names.

## Test commands with real output

Update (same day, after `pnpm` was installed via `npm install -g pnpm --force`
— corepack's cache was corrupt): `pnpm install && pnpm check && pnpm test`
ran fully green — install up to date, `biome check` clean (19 files),
`tsc --noEmit` clean, **28/28 `foundation.test.ts` tests pass**. M04's
data-only files break nothing.

Original note, kept for the record: `pnpm` was initially unavailable in this
environment (human checklist item), and M00's scaffold was still in progress — so
verification was first done with a throwaway Node script (uncommitted, `TEMP/opencode/m04-verify.js`):

```
PASS acme emails = 14 (want 14)
PASS acme transcripts = 8 (want 8)
PASS acme slack days = 11 (want 11)
PASS nova = 2+2+2 (want 2+2+2)
PASS eml 5-headers + example.com-only
PASS headerless = call-04-pilot-scoping.txt,call-07-commercial.txt
PASS transcript headers valid
PASS slack shape + ts match filename
PASS SOC 2 in one source file: seed\acme\transcripts\call-06-security-legal.txt
PASS security questionnaire in one source file
PASS EXPECTED citations resolve (24 unique)
PASS acme email dates within Jul 14 – Sep 25
PASS multipart emails = email-0723-sso-requirements.eml,email-0815-pricing-proposal.eml
PASS reply-chain emails = email-0716-discovery-followup.eml,email-0814-priya-accepts-annual.eml
ALL CHECKS PASSED
```

One script bug found during verification (glob/Nova citation resolution) was fixed
in the script; the data was correct throughout.

## VERIFY list

None — no external API facts were used. Slack message shape follows the brief's
contract (which M03 owns); if M03's parser wants extra fields, that's their call.

## Proposals raised

None. No stack or contract changes needed.

## Follow-ups for other modules

- **M03:** 2 headerless transcripts + multipart/reply-chain emails are ready for
  the LLM-extraction and MIME paths; Slack `ts` values are true epochs.
- **M05:** `EXPECTED.md` is the eval key — `brief("acme")` must surface the Sep 2
  commitment as **open** first; `reflect()` across acme+nova should find the
  annual-billing pattern.
- **M10:** this data is stage material — human review requested (acceptance gate).
- **Human:** please review `seed/acme/` + `EXPECTED.md`; MS0 merge needs your
  explicit data sign-off. Also: `pnpm` unavailable in this environment.

## Commits (all `m04:`, explicit paths only)

`d16ce5f` planning → `8076649` spec+plan → `41c6aa5` in progress →
`e32583f` scaffold → `26a6ddf` transcripts → `00c851a` emails →
`95bcc26` slack → `80ecfb8` nova → `d0d11aa` EXPECTED.md (+ plan ticks, report).
