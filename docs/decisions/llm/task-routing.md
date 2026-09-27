# Task routing — which model settings each task uses

All tasks go through the user's configured LLM settings (`.waada/llm.json`, Settings → LLM).
Default provider: **Groq**, model `openai/gpt-oss-120b`, fallback `qwen/qwen3-32b`.
No task overrides the model or temperature in the MVP; `chat`/`extract` calls use the
SDK default temperature unless the call site says otherwise.

| Task | Function | LLM calls | Temperature | Notes |
|---|---|---|---|---|
| Commitment ledger | `commitmentLedger` | 1 × `extract` (`commitments`) | default | 4 high-budget recalls first |
| Landmines | `landmines` | 1 × `extract` (`landmines`) | default | 3 high-budget recalls first |
| Brief | `brief` | 1 × `chat` | default | ledger + landmines + 2 recalls in parallel |
| Ask | `ask` | 1 × `chat` | default | single high-budget recall |
| Baseline (CRM-only) | `baselineCrm` | 1 × `chat` | default | **no memory**; input is only `seed/<account>/crm.json` fields |
| Baseline (summary-only) | `baselineSummary` | 1 × `chat` (+ `extract` for headerless transcripts during `parseFiles`) | default | **no memory**; raw text oldest-first, truncated to 60,000 chars keeping the most recent |
| Compare | `compare` | 3 legs in parallel (crm + summary + brief) | default | a failing leg shows its error message in that column |
| Report | `report` | 1 × `chat` + `reflect` | default | should-have tier (§1a), not implemented yet |

## Prompt versions

Each task's system/user prompts are versioned under `prompts/` (v1 = current). A prompt
change means a new `vN` file, never a silent edit.
