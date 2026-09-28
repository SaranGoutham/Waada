# Card 015 — Codex — M06: neat product UI, Integrations page, Pipeline page

**Worker:** Codex · **Module:** M06 · **Issued by:** master, 2026-09-28

## Goal
Human decision **P-010** (`docs/decisions/PROPOSALS.md`): a simple MVP with a **neat, polished UI/UX** that looks like a real product, including an **Integrations** page and a **Pipeline** page. Integrations are presented as product screens: **no "coming soon", "planned", "later", "not yet", "mock" or "demo" wording anywhere in the UI.** Guardrail (master): the brief, commitments and answers only ever show real imported data; the UI never claims data was synced from a source.

## Read first
`AGENTS.md` (§1a incl. the new "Showcase UI" row, §2, §3, §4a, §6), `docs/decisions/PROPOSALS.md` P-009 and P-010, `tasks/M06-web-app.md`, all of `apps/web/src/`.

## Constraints
- **No new packages** (your sandbox has no network, and new packages need human approval). Tailwind CSS only; write small components yourself; icons as **inline SVG**. Don't render markdown with a library: render the brief from its **structured fields** (`commitments`, `landmines`) plus simple own-code formatting for text (paragraphs, bullet lines, `**bold**`).
- `Commitment` now has `dueDate: string | null` (P-009; OpenCode adds it in core at the same time, card 014). Code against it tolerantly (`c.dueDate ?? null`) so the app works before and after.
- Don't touch `packages/**`. Server functions live in `apps/web/src/lib/server.ts`; extend there.
- Friendly failures stay (§2 rule 8): no stack traces; each page keeps its error panel.

## Design direction
Calm, trustworthy B2B tool (think Linear / Attio): neutral background, one accent colour, clear type scale, generous spacing, subtle borders and shadows, light **and** dark mode (`prefers-color-scheme`), responsive down to phone width, visible keyboard focus, loading skeletons instead of "Working…" text.

## What to build
1. **App shell:** left sidebar (logo "Waada", Accounts list + "New account", Integrations, Pipeline, Settings); top bar with the current account's **name** (not the slug) and its tabs: Brief · Commitments · Ask · Import · Compare.
2. **Home / Accounts:** account cards (name, interactions imported, open commitments count if cheap to get, last import time) and a clean "New account" form.
3. **Brief:** hero section "Before you call <customer>": **Open commitments** as cards (text, made by → to, made on, due date with an **Overdue** badge when past due, evidence as a quiet line, source chip), then **Landmines** (topic, "Don't re-open" guidance prominent, what happened, source), then People, Deal story, Recent changes, Customer words, formatted, not raw markdown. Refresh button with a spinner.
4. **Commitments:** table with status pills (open / unclear / delivered), filters by status, due date and Overdue badge.
5. **Ask:** chat-style layout, suggestion chips, answer card with light formatting, **deduplicated** source chips (same source once).
6. **Import:** drag-and-drop zone, file list, preview table, progress state, result summary ("33 imported · 0 skipped · CRM record saved"), friendly errors per file.
7. **Compare:** three columns (CRM only / Summary only / Waada) with a header row explaining each, same card styling, error text inside a column if one fails.
8. **Integrations page** (`/integrations`): cards grouped as **Sources** (Gmail, Slack, HubSpot CRM, Google Meet capture via Chrome extension, File upload), **Memory** (Hindsight), **AI model** (Groq, plus the other providers from Settings), **Surfaces** (MCP server for Claude/Cursor, Web app). Each card: logo-like inline SVG mark, one-line description, status pill, and an action:
   - **Hindsight** and **Groq**: real status from config (Groq key from Settings or `.env`; Hindsight URL set) → "Connected" / "Set up".
   - **File upload** and **Web app**: always "Active".
   - **Gmail, Slack, HubSpot, Google Meet, MCP**: "Connect" opens a tidy dialog (e.g. "Sign in with Google", "Add to Slack", token field for HubSpot, "Install Chrome extension", MCP config snippet to copy). Confirming saves `{ connected: true, connectedAt, label }` to `.waada/integrations.json` via a server function using `readJson`/`writeJson` from `@waada/core` (Zod-validated), and the card then shows "Connected · <label>" with a "Disconnect" option. **Never** show synced-item counts or "last synced" data for these.
9. **Pipeline page** (`/pipeline`): a clear left-to-right diagram (inline SVG/CSS, subtle animation respecting `prefers-reduced-motion`): **Sources** (Gmail, Slack, HubSpot, Meet, uploads) → **Ingest** (parse, date & participants, dedupe) → **Memory** (Hindsight bank per account) → **Agent** (commitment ledger, landmines, brief, ask) → **Surfaces** (web app, MCP). Under it, 3–4 short plain-language cards explaining each stage. Where cheap, show real numbers for the selected account (interactions stored, open commitments).
10. Settings → LLM restyled to match; keep behaviour.

## Acceptance
- `node node_modules/@biomejs/biome/bin/biome check apps/web` from the repo root → clean
- `apps/web`: typecheck and `vitest run` → green; `vite build` → succeeds
- `grep -riE "coming soon|not yet|planned|later|mock|placeholder|demo data" apps/web/src` → no user-visible hits (code comments are fine)
- In the report: a short list of every route and what it shows

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
