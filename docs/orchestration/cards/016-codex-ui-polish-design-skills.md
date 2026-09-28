# Card 016 — Codex — M06: UI polish pass with the design skills and Phosphor icons

**Worker:** Codex · **Module:** M06 · **Issued by:** master, 2026-09-28

## Goal
The human asked for a polished, product-grade UI using two design skills and Phosphor icons. Card 015 built the structure; this card makes it look and feel premium and fixes what the master saw in the browser.

## Read first (in this order)
1. `C:\Users\saran\.agents\skills\design-taste-frontend\SKILL.md` and **follow it** (read the files it points to as needed).
2. `C:\Users\saran\.agents\skills\ui-ux-pro-max\SKILL.md` and **follow it**: use its local data/scripts to pick a style, palette and font pairing for "B2B SaaS / sales productivity / trustworthy". If a script needs Python and it runs in your sandbox, use it; if not, read the data files directly.
3. `AGENTS.md` (§2, §3, §4a, §5 incl. **S22 Phosphor icons**), `docs/decisions/PROPOSALS.md` P-010, all of `apps/web/src/`.

## Constraints
- Icons: **`@phosphor-icons/react`** (installed in `apps/web`, approved S22). Brand marks for Gmail/Slack/HubSpot/Google Meet/Groq etc.: use Phosphor's logo icons where they exist, otherwise a neutral Phosphor icon; no copied brand artwork.
- **No other new packages.** Fonts: only if the chosen font can be loaded without a package (e.g. a `<link>` to Google Fonts in `__root.tsx`); otherwise a good system stack.
- P-010 still holds: no "coming soon / planned / later / not yet / mock / demo" wording; briefs and answers show only real imported data; integrations never claim synced items.
- Don't touch `packages/**`.

## Must fix (seen by the master)
1. **Home account card**: white background with near-white text in dark mode, so the name is unreadable. Fix contrast everywhere (check both themes; body text ≥ WCAG AA).
2. **Home subtitle** text too faint.
3. **Pipeline page takes > 90 s to load** (its loader seems to run heavy core calls). Pipeline and Home may only use **cheap** data: account list, `.waada/interactions/<account>.json` counts, last import time. No LLM calls and no Hindsight searches in these loaders.
4. **Integrations**: letter badges ("G", "S", "H") look like placeholders → Phosphor icons. Each card shows **one** clear state + one action (today "Set up" pill + "Connect" link is redundant). Accent colour is inconsistent (purple labels, teal buttons): pick one system from the skills.
5. Loading states: skeletons, not "Working…".

## Scope
Every page gets the same design system: Home, Brief, Commitments, Ask, Import, Compare, Integrations, Pipeline, Settings. Keep all behaviour and server functions working.

## Acceptance
- `node node_modules/@biomejs/biome/bin/biome check apps/web` from the repo root → clean
- `apps/web`: `tsc --noEmit`, `vitest run` → green; `vite build` → succeeds
- In the report: which style / palette / font the skills led you to and why (2–3 lines), and a list of pages changed

## Rules
**Don't commit** (your sandbox can't write `.git`); list every changed path. No network. Never print or log secret values. End with the WORKER REPORT block from AGENTS.md §4a.
