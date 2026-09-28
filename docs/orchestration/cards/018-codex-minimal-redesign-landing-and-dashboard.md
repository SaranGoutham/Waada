# Card 018 — Codex — M06: minimal light redesign; separate landing page and dashboard

**Worker:** Codex · **Module:** M06 · **Issued by:** master, 2026-09-28

## Goal
The human didn't like the current UI. Decisions (2026-09-28):
- **Minimalism**, **light monochrome** look: white / off-white background, near-black text, grey hairline borders, **one** muted accent at most, lots of whitespace, few boxes. Follow **`C:\Users\saran\.agents\skills\minimalist-ui\SKILL.md`** (this replaces card 016's style). You may still use `ui-ux-pro-max` for checks (contrast, spacing, UX rules).
- **The home page and the dashboard are different things.** `/` becomes a **landing page** that tells people what Waada does and its features; the working app (the **dashboard**) lives under `/app` and the existing account routes.

P-010 still applies: no "coming soon / planned / later / not yet / mock / demo" wording anywhere; briefs and answers show only real imported data; integrations never claim synced items. Phosphor icons (S22) only where they add meaning (sparingly). No new packages (fonts only via a Google Fonts `<link>` if the skill asks for one). Don't touch `packages/**`.

## Structure
1. **`/` Landing page** (no app sidebar; simple top bar: logo "Waada", links "Features", "How it works", "Integrations", and a primary "Open dashboard" button → `/app`):
   - Hero: one strong line + one sentence. Suggested: "Never lose a deal when a rep leaves." / "Waada remembers every promise, objection and decision from the departed rep's emails, Slack and calls, and briefs the new owner in a minute."
   - **Features** (plain text list or a quiet grid, one sentence each): Commitment ledger (open, overdue and delivered promises with evidence) · Landmines (settled objections not to re-open) · Handover brief · Ask with sources · Compare (Waada vs CRM-only vs summary-only) · Per-account memory (Hindsight).
   - **How it works**: the pipeline as a minimal horizontal flow: Sources → Ingest → Memory → Agent → Surfaces, one line each (reuse the Pipeline page's content).
   - **Integrations**: a quiet row of names/marks: Gmail, Slack, HubSpot, Google Meet, MCP (Claude / Cursor), Hindsight, Groq, with a link to the Integrations page.
   - Footer: one line.
2. **`/app` Dashboard**: the app shell (minimal left sidebar: Accounts, Integrations, Pipeline, Settings) with the accounts list (name, interactions imported, last import) and "New account". This replaces today's `/` content.
3. Account pages (`/accounts/$slug/*`), `/integrations`, `/pipeline`, `/settings/llm`: same app shell, restyled to the minimal system. Keep all behaviour and server functions.
4. Update every internal link that pointed to `/` as "home of the app" (sidebar logo, "New account", after-create redirects) to `/app`. The logo on the landing page stays `/`.

## Bugs to fix
- **Slug shown instead of name:** the Import page still says "Import history for acme-corporation" for a freshly created "Acme Corporation". Check every account page and the create flow (the new account also didn't appear in the sidebar right after creation: refresh/invalidate the accounts list after create).

## Acceptance
- `node node_modules/@biomejs/biome/bin/biome check apps/web` from the repo root → clean
- `apps/web`: `tsc --noEmit` (actually run it: card 017's report said green but it wasn't), `vitest run` → green; `vite build` → succeeds
- Report: routes list, and 2–3 lines on the design choices the minimalist-ui skill led to

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
