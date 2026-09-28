# Card 020 — Codex — M06: simple flow, plain labels, clean hierarchy

**Worker:** Codex · **Module:** M06 · **Issued by:** master, 2026-09-28

## Goal
Human: "make the flow and UI labels simple and the UI flow clean, with a neat hierarchy." Keep card 018's minimal light monochrome style (`C:\Users\saran\.agents\skills\minimalist-ui\SKILL.md`), Phosphor icons sparingly (S22), no new packages, don't touch `packages/**`. P-010 still applies.

## Problems the master saw (Import page, representative of the app)
- Three labels repeat the same thing: top bar "Acme Corporation", eyebrow "ACCOUNT HISTORY", H1 "Import history for Acme Corporation".
- Tabs are plain text with no clear active state; "Brief" is first even for an empty account.
- Helper text is nearly invisible (very light grey); drop zone is still purple (leftover from the old theme).
- "Your source files stay local." is **false** on the hosted app (data goes to Hindsight and Upstash Redis): remove it.

## New structure
**Sidebar** (app only): Waada logo → `/app`; **Accounts** list + "New account"; at the bottom, quieter: **Integrations**, **Settings**. Remove **Pipeline** from the app sidebar (the landing page's "How it works" covers it; keep the `/pipeline` route reachable from the landing page, or redirect it to `/#how-it-works`).

**Account page layout** (one pattern for every tab):
1. **Account header** (only place the name appears): H1 = account name; one muted line = "33 items · last import Sep 28" (or "No files yet"); one contextual primary button: "Add files" when empty, otherwise "Refresh brief" on the Brief tab only.
2. **Tabs** with a clear active state (underline or weight, not colour alone), in flow order: **Brief · Promises · Ask · Sources · Compare**.
3. **Tab content**: section titles are H2; no eyebrows; at most one primary button per view.
- Remove the top bar title and all eyebrow labels inside the app (the landing page may keep one eyebrow per section).
- **Empty account**: opening an account with no imported items goes to **Sources** and shows one clear step ("Add the departed rep's emails, Slack exports and call transcripts to build the brief.").

## Plain labels (use everywhere, including the landing page, so words match)
| Now | New |
|---|---|
| Commitments / Commitment ledger | **Promises** (landing: "Promise ledger") |
| Landmines | **Don't reopen** (landing card may keep a one-line explanation) |
| Import / Import history | **Sources** tab; action "Add files" |
| Handover brief / Account brief | **Brief** |
| Recent changes | **What changed** |
| Customer words to lead with | **In their words** |
| Deal story | **Deal story** |
| People | **People** |

**Brief tab order** (most important first): Open promises (overdue ones marked "Overdue") → Don't reopen → What changed → People → Deal story → In their words. Hide empty sections.

**Sources tab**: the drop zone (neutral grey dashed border, no purple) with plain copy: "Drop emails (.eml), Slack exports (.json), call transcripts (.txt, .vtt) or crm.json"; then the preview / result; then a simple list of what's already imported (date, type icon, title) from `.waada/interactions/<slug>.json` / Redis via the existing store (read cheaply).

**Ask tab**: one input, two suggestion chips, answer, sources. **Compare tab**: one sentence explaining the three columns.

**Contrast**: all body and helper text must meet WCAG AA on the background (no near-invisible grey).

## Acceptance
- `node node_modules/@biomejs/biome/bin/biome check apps/web` from the repo root → clean
- `apps/web`: `tsc --noEmit` (run it for real), `vitest run` → green; `vite build` → succeeds
- `grep -rn "stay local" apps/web/src` → no hits
- Report: final sidebar, tab list and label list as implemented

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
