# M06 — Web app (TanStack Start)

**Goal:** the product surface for sales users. It's built on TanStack Start (UI + backend), Tailwind CSS and shadcn/ui, calling `@waada/core` from server functions. No auth in the MVP (S15): **bind to localhost**.

## Files you own

```
apps/web/**   except  apps/web/src/routes/api/auth/**   (M02b)
                      apps/web/src/routes/api/oauth/google/**   (M08b)
                      apps/web/src/routes/api/capture/**   (M09)
```
Dependencies: TanStack Start (and what its official scaffold installs), Tailwind CSS, shadcn/ui components (S6, S17). Anything else (charts, markdown renderer, drag-and-drop, icons) → **proposal first** (AGENTS.md rule 3).

## MVP scope (AGENTS.md §1a)

**Build for the MVP:** `/`, `/accounts/$slug` (Brief), `/accounts/$slug/commitments`, `/accounts/$slug/import` (file upload only; no connector Sync buttons), `/accounts/$slug/ask`, `/accounts/$slug/compare`, `/settings/llm` (API keys only; no sign-in buttons).
**Should-have, later:** `/accounts/$slug/report`, sign-in button slots for M02b. **Post-MVP:** `/settings/connectors`, connector Sync buttons.

## Pages

| Route | Content |
|---|---|
| `/` | Accounts list + "New account" (uses `listAccounts` / `upsertAccount`) |
| `/accounts/$slug` | **Brief**: 🚩 open commitments table first, then ⚠️ landmines, then the rendered brief markdown. A "Refresh" button |
| `/accounts/$slug/commitments` | Full ledger table: status badge (open / delivered / unclear), made by → to, date, evidence, source |
| `/accounts/$slug/import` | Drag-and-drop files → `parseFiles` → preview table (date, type, title, participants) → "Import" → `ingest` → show the IngestReport. Also "Sync" buttons for configured connectors |
| `/accounts/$slug/ask` | Question box → `ask` → answer + citations. Suggested questions: "What did we promise?", "What changed since July?" |
| `/accounts/$slug/compare` | Three columns: CRM only · Summary only · Waada, from `compare` |
| `/accounts/$slug/report` | `report` markdown + a "Download .md" button |
| `/settings/llm` | Provider picker, model, API key fields (masked; uses `redactedSettings`), "Test" button, plus **slots** for M02b's "Sign in with OpenRouter" and "Sign in with ChatGPT (experimental)" buttons (link to `/api/auth/openrouter/start`, `/api/auth/chatgpt/start`) |
| `/settings/connectors` | Slack, Gmail and HubSpot status. Slack/HubSpot read from `.env` (show configured or missing, never the token). "Connect Gmail" links to `/api/oauth/google/start` (M08b) |

## Rules

- Server functions call only `@waada/core` exports. No Hindsight or LLM imports in `apps/web` (AGENTS.md rule 4).
- Every server function catches `WaadaError` → shows its message in a toast or inline alert. Unknown errors → a generic "Something went wrong. Check the server log."
- Long operations (import, brief, compare) show progress or loading states. The brief should feel fast: show the commitments table as soon as it's ready if you can stream or split calls; otherwise use a clear spinner.
- Dev server binds to `127.0.0.1` (document the port in your report; M02b, M08b and M09 need it).
- Accessibility basics: labels on inputs, keyboard-reachable actions, sufficient contrast (shadcn defaults).

## Acceptance

- [ ] `pnpm --filter web dev` → import `seed/acme` through the UI → the Brief page's first row is the open Sep 2 commitment (with M01–M05 done on `dev`). Screenshots in your report.
- [ ] Works with the fakes when core isn't ready: a dev flag `WAADA_FAKE_CORE=1` wires `FakeMemory`/`FakeLLM` with sample data, so UI work isn't blocked
- [ ] `pnpm check` clean; component tests for the commitments table and import preview (Vitest + Testing Library only if approved via proposal; otherwise test pure formatting functions)

## References

TanStack Start: https://tanstack.com/start/latest · TanStack Router: https://tanstack.com/router/latest · shadcn/ui (TanStack Start guide): https://ui.shadcn.com/docs/installation · Tailwind: https://tailwindcss.com/docs
