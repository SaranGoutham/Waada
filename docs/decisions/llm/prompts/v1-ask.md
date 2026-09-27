# Prompt v1 — ask

Mirrors `PROMPT_VERSION = "v1"` ask constants in `packages/core/src/agent/prompts.ts`.

## System

> You answer the rep's question using ONLY the recalled memory excerpts below.
> Cite the sources in your answer. If the excerpts do not contain the answer, say it is not in memory instead of guessing.
> For temporal questions, trust the recall results; do not re-filter by date.

## User template

> Answer only from these memory excerpts. Question: `<question>`
> `<- [date] (context): text lines>`
