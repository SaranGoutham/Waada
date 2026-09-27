# M04 Synthetic Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write the Acme (33 interactions) + Nova (6 interactions) synthetic datasets as real export files plus `EXPECTED.md` answer key.

**Architecture:** Hand-authored static files, no code. Each task writes one file group, then a throwaway Node script verifies counts, dates, headers, and domains.

**Tech Stack:** Markdown, RFC 5322 `.eml`, Slack-export JSON, Node built-ins (verification only, uncommitted).

**Spec:** `docs/superpowers/specs/2026-09-27-m04-synthetic-data-design.md`

## Global Constraints

- TypeScript strict / Biome / Vitest do not apply (no code); every commit must still keep `pnpm check && pnpm test` green (data files don't affect it — verify before each commit).
- Only `example.com` domains; no real companies, people, emails, or phone numbers.
- Dates are UTC ISO-8601; filenames and content dates must sort consistently with the story.
- Stage/commit only M04-owned paths: `seed/**`, `docs/superpowers/specs/2026-09-27-m04-*`, `docs/superpowers/plans/2026-09-27-m04-*`, `docs/reports/m04-*`; shared `docs/PROGRESS.md` only on its own commits. Never `git add -A`.
- Commits start with `m04:`, no AI attribution.

## Review Focus

- A transcript date that disagrees with its filename order — a reader sorting by date must get the story order (pinned by verification script).
- An `.eml` missing Message-ID/Date/From/To/Subject — M03's parser needs all five (pinned by verification script).
- A non-`example.com` address slipping into a signature or reply chain (pinned by verification script).
- Slack `ts` epoch not matching the filename day (pinned by verification script).
- The Sep 2 SOC 2 promise appearing twice or being answered anywhere — it must occur exactly once and stay undelivered (pinned by grep).

---

### Task 1: Scaffold — crm.json files, Slack users/channels, READMEs

**Files:**
- Create: `seed/acme/crm.json`, `seed/nova/crm.json`
- Create: `seed/acme/slack/users.json`, `seed/acme/slack/channels.json`, `seed/nova/slack/users.json`, `seed/nova/slack/channels.json`
- Create: `seed/README.md`

**Interfaces:**
- Consumes: spec §2–§4 (people, UIDs, channel names `#deal-acme`, `#deal-nova`).
- Produces: Slack identity files every day-file references (UIDs `U01ALEX`, `U02MEENA`, `U03BHAV`).

- [x] **Step 1: Write the scaffold files** — crm.json per spec §3.2/§4 (Acme: Evaluation, 86000, 2026-12-15, Unassigned); users.json (3 users + real_names), channels.json (one channel each); `seed/README.md` ≤ 10 lines.
- [ ] **Step 2: Verify** — `git status --short` shows only M04 paths; eyeball JSON validity via `node -e "JSON.parse(require('fs').readFileSync('seed/acme/slack/users.json'))"`.
- [ ] **Step 3: Commit** — `git add seed/acme/crm.json seed/nova/crm.json seed/acme/slack/users.json seed/acme/slack/channels.json seed/nova/slack/users.json seed/nova/slack/channels.json seed/README.md`, `git commit -m "m04: scaffold crm, slack identities, readme"`.

### Task 2: Acme transcripts (8, two headerless)

**Files:**
- Create: `seed/acme/transcripts/call-0{1,2,3,4,5,6,7,8}-*.txt` (exact names in spec §3.2).

**Interfaces:**
- Consumes: spec §3.1 (story beats each call must hit).
- Produces: the 8 call interactions; `call-06` carries the once-mentioned SOC 2 promise.

- [x] **Step 1: Write all 8 transcripts** — front-matter (title/date/type/participants) on all except `call-04` and `call-07`; headerless two embed date + speaker names in dialogue; Sep 2 buries SOC 2 mid-call (DPA main topic); Aug 12 has the monthly objection → annual+8% verbal agreement.
- [ ] **Step 2: Verify** — grep: `SOC 2` occurs in exactly one transcript; `grep -L "^---" seed/acme/transcripts/*.txt` lists exactly the 2 headerless files.
- [ ] **Step 3: Commit** — `git add seed/acme/transcripts`, `git commit -m "m04: write Acme call transcripts"`.

### Task 3: Acme emails (14 .eml)

**Files:**
- Create: `seed/acme/emails/email-*.eml` (14 exact names in spec §3.2).

**Interfaces:**
- Consumes: Task 2 (calls the emails reference: Aug 13 promise → Aug 15 delivery; Aug 14 Priya acceptance).
- Produces: the 14 email interactions; multipart (`0723`, `0815`) and reply-chain (`0716`, `0814`) coverage for M03.

- [x] **Step 1: Write all 14 emails** — valid RFC 5322 with Message-ID `<acme-MMDD-<slug>@example.com>`, Date (RFC 2822 matching story date), From/To/Subject, plain-text body; `0723` + `0815` multipart text+HTML; `0716` + `0814` quoted reply chains; `0828` typo-laden; `0814` explicit annual+8% acceptance; `0903` no SOC 2 attached.
- [ ] **Step 2: Verify** — every file matches `^Message-ID:`, `^Date:`, `^From:`, `^To:`, `^Subject:`; no address outside `example.com`.
- [ ] **Step 3: Commit** — `git add seed/acme/emails`, `git commit -m "m04: write Acme emails"`.

### Task 4: Acme Slack days (11)

**Files:**
- Create: `seed/acme/slack/deal-acme/YYYY-MM-DD.json` (11 dates in spec §3.2).

**Interfaces:**
- Consumes: Task 1 (UIDs), Tasks 2–3 (events Slack reacts to).
- Produces: 11 channel-day interactions; `2026-09-24.json` holds the "did anyone ping onboarding?" line; `2026-08-05.json` the joke.

- [x] **Step 1: Write all 11 day files** — array of `{type: message, user, user_profile.real_name, text, ts}`; `ts` = true epoch for that day (compute with `node -e "Date.parse(...)"`); only internal team speaks.
- [ ] **Step 2: Verify** — each `ts` date-UTC equals its filename; UIDs exist in users.json.
- [ ] **Step 3: Commit** — `git add seed/acme/slack/deal-acme`, `git commit -m "m04: write Acme Slack export"`.

### Task 5: Nova dataset (6 interactions + crm already done)

**Files:**
- Create: `seed/nova/transcripts/nova-01-discovery.txt`, `nova-02-pricing.txt`
- Create: `seed/nova/emails/nova-0804-intro.eml`, `nova-0811-pricing-accept.eml`
- Create: `seed/nova/slack/deal-nova/2026-08-0{4,11}.json`

**Interfaces:**
- Consumes: spec §4 (monthly objection → annual resolution mirrors Acme Landmine 1).
- Produces: Nova's 6 interactions for cross-deal `reflect()`.

- [x] **Step 1: Write Nova files** — same format contracts as Acme (headers on both transcripts; RFC 5322 emails; Slack shape).
- [ ] **Step 2: Verify** — counts (2+2+2) and `example.com`-only.
- [ ] **Step 3: Commit** — `git add seed/nova/transcripts seed/nova/emails seed/nova/slack/deal-nova`, `git commit -m "m04: write Nova dataset"`.

### Task 6: EXPECTED.md + full verification

**Files:**
- Create: `seed/acme/EXPECTED.md` (covers Nova in a second section).

**Interfaces:**
- Consumes: Tasks 1–5 (every filename it cites must exist).
- Produces: the answer key M05/M10 test against.

- [x] **Step 1: Write EXPECTED.md** — counts (33 = 14+8+11; Nova 6 = 2+2+2); 3 commitments with proof files; 2 landmines with sources; Q3→Q4 before/after + sources; 5 re-ask questions with answer files.
- [x] **Step 2: Run full verification script** (temp dir, uncommitted): counts, date-sort consistency, 5-header check on all `.eml`, exactly-2 headerless transcripts, `example.com`-only, Slack ts↔filename match, `SOC 2` single occurrence. Expected: all PASS. Paste output into final report.
- [ ] **Step 3: Commit** — `git add seed/acme/EXPECTED.md`, `git commit -m "m04: write EXPECTED.md answer key"`.

### Task 7: Report, PROGRESS → review, push

**Files:**
- Create: `docs/reports/m04-synthetic-data.md`
- Modify: `docs/PROGRESS.md` (M04 row only → `review`).

- [x] **Step 1: Run `pnpm check && pnpm test`** (or note if blocked on M00 scaffold) — Expected: green; if another module's test fails, note it on their row per AGENTS.md §3, don't fix.
- [x] **Step 2: Write final report** — what was built, verification output, VERIFY list (none expected), proposals (none expected), follow-ups for M03/M05/M10.
- [ ] **Step 3: Commit report, then PROGRESS separately** — `git add docs/reports/m04-synthetic-data.md` + commit; re-read PROGRESS, edit M04 row only, commit alone; `git push origin dev`.
