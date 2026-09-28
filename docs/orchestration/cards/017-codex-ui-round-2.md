# Card 017 — Codex — M06: UI round 2 (brief sections, names, sources, richer screens)

**Worker:** Codex · **Module:** M06 · **Issued by:** master, 2026-09-28

## Goal
Fix what the master saw clicking through card 016's UI, and bring Home, Pipeline and the integration dialogs up to the same product quality. Keep following `C:\Users\saran\.agents\skills\design-taste-frontend\SKILL.md` and `C:\Users\saran\.agents\skills\ui-ux-pro-max\SKILL.md`, the design system from card 016, and Phosphor icons (S22). P-010 rules still apply (no "coming soon / planned / later / not yet / mock / demo" wording; only real imported data in briefs and answers; integrations never claim synced items). No new packages. Don't touch `packages/**`.

## Must fix (master, browser)
1. **Account name, not slug**, everywhere: Brief title "Before you call Acme Corp", Ask title, Import, Compare, Pipeline footer. Resolve the name from the account registry.
2. **Brief sections are broken.** The model's markdown doesn't reliably use `##` headings: it returned plain lines like `Open commitments`, `Landmines`, `People`, `Deal story`, `Recent changes`, `Customer words to lead with`. Result: everything landed in "Deal story", "People" was empty, and "Recent changes" / "Customer words" showed filler. Write a tolerant parser (in `lib/format.ts`, unit-tested with both shapes: `## Heading`, `Heading`, `**Heading**`, `Heading:`; case-insensitive) that splits the brief into those six sections. Don't repeat Open commitments / Landmines as text (they're already cards). If a section is empty, **hide it** (no filler sentences).
3. **Source chips and evidence:** strip raw ISO timestamps like `2026-09-19T00:00:00.020Z (slack — …)` / `[2026-08-12T09:00:00.010Z] …`; show a short date ("Sep 19") + a type icon (email / Slack / call) + the title. Same in Ask sources and landmine sources. Unit-test the formatter.
4. **Due date:** when `dueDate` is null, show nothing instead of "Due —".
5. **Home:** sidebar items get Phosphor icons; account cards show interactions imported (from `.waada/interactions/<slug>.json`, cheap), last import date and an arrow affordance; the hero area should feel less empty (e.g. a short 3-step "Import → Brief → Ask" strip with icons).
6. **Pipeline:** larger stage nodes with Phosphor icons, a clearer connector line (animated flow, `prefers-reduced-motion` respected), and the stat cards should read the selected account's real counts (interactions, sources by type). When an account has no local interactions file, show "Import files to see this account's pipeline" with a link to Import, not "0".
7. **Integration dialogs:** make each one feel native to the service: Gmail / Google Meet → a "Sign in with Google" styled button; Slack → "Add to Slack"; HubSpot → private-app token field (masked); MCP → a copyable JSON config snippet for Claude Desktop / Cursor with a Copy button; after confirming, the card shows "Connected · <label>" and a Disconnect action. The "Ready" pill + Connect button is fine; drop "Ready" once connected.

## Acceptance
- `node node_modules/@biomejs/biome/bin/biome check apps/web` from the repo root → clean
- `apps/web`: `tsc --noEmit`, `vitest run` (with the new parser/formatter tests) → green; `vite build` → succeeds
- Report lists each fix 1–7 with the file(s) changed

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
