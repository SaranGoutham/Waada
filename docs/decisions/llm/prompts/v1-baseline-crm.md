# Prompt v1 — baseline (CRM-only)

Mirrors the baseline CRM constants in `packages/core/src/agent/prompts.ts` (`baselineCrmUser`).
System prompt: `BRIEF_SYSTEM` (v1 brief) — same output format as the Waada brief, so the
Compare page can show all three columns side by side.

## User template

> Write the brief using ONLY these CRM record fields. No emails, calls or messages are available to you:
> `<key: value lines from seed/<account>/crm.json>`

## Why

The CRM-only baseline is the honest "what a CRM gives you" stand-in: stage, amount,
close date, next step, owner — and nothing about commitments, landmines or people.
It never touches Hindsight (`baselineCrm` makes zero memory calls).
