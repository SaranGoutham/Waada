# Prompt v1 — baseline (summary-only)

Mirrors the baseline summary constants in `packages/core/src/agent/prompts.ts` (`baselineSummaryUser`).
System prompt: `BRIEF_SYSTEM` (v1 brief) — same output format as the Waada brief.

## User template

> Write the brief using ONLY the raw interaction text below (oldest first, possibly truncated). No search, highlights or memory are available to you:
> `<[date] (type — title): content` lines, joined oldest-first`

## Why

The summary-only baseline is the honest "dump every interaction into the prompt" stand-in:
all raw text from `seed/<account>/` parsed through M03 (`parseFiles`), sorted by date,
truncated to `SUMMARY_BUDGET_CHARS` = 60,000 characters (~15k tokens), keeping the most
recent content. It never touches Hindsight (`baselineSummary` makes zero memory calls).
