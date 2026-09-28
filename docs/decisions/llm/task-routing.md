# Task routing — which model settings each task uses

All tasks go through the user's configured LLM settings (`.waada/llm.json`, Settings → LLM).
Default provider: **Groq**, model `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`.
All `chat`/`extract` calls use the SDK default temperature unless the call site says otherwise.
Card 013 restored the ledger to that default: run D's structured output failed after
the temperature-0 override was introduced, while run A worked before it. Model ids
for successful chat/extract calls are logged at info; a fallback logs both model ids
at warn, without prompt content or credentials.

Prompt sizing uses 2.5 characters per token. Run D measured Groq requesting 8,517
tokens for 20,000 characters (about 2.35 chars/token), so the 5,000-input-token cap
now gives call sites a 12,500-character prompt budget instead of the unsafe 20,000.

| Task | Function | LLM calls | Temperature | Notes |
|---|---|---|---|---|
| Commitment ledger | `commitmentLedger` | up to 4 × `extract` (`commitments`), one per evidence chunk, sequential | default | 4 high-budget recalls first, chunked so a single tail mention survives; per-chunk results merged (same deliverable = normalised text + recipient, delivered wins); provider default restored after run-D structured-output failures |
| Landmines | `landmines` | 1 × `extract` (`landmines`) | default | 3 high-budget recalls first |
| Brief | `brief` | 1 × `chat` | default | ledger + landmines + 2 recalls in parallel |
| Ask | `ask` | 1 × `chat` | default | single high-budget recall |
| Baseline (CRM-only) | `baselineCrm` | 1 × `chat` | default | **no memory**; input is only `seed/<account>/crm.json` fields |
| Baseline (summary-only) | `baselineSummary` | 1 × `chat` (+ `extract` for headerless transcripts during `parseFiles`) | default | **no memory**; raw text oldest-first, truncated to 60,000 chars keeping the most recent |
| Compare | `compare` | 3 legs in parallel (crm + summary + brief) | default | a failing leg shows its error message in that column |
| Report | `report` | 1 × `chat` + `reflect` | default | should-have tier (§1a), not implemented yet |

## Prompt versions

Each task's system/user prompts are versioned under `prompts/` (ledger v4, brief v2, all others v1). A prompt
change means a new `vN` file, never a silent edit.
