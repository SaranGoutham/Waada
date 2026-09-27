# LLM Decisions

Records **which model does which task, prompt versions, and evaluation results**. Owned by M02 (provider layer) and M05 (prompts). Other modules read only.

## Files

| File | Contents | Owner |
|---|---|---|
| `providers.md` | Supported providers, how each authenticates (API key / OpenRouter PKCE / experimental ChatGPT login), which support structured output, tool calls and transcription, and known quirks | M02, M02b |
| `task-routing.md` | Which model settings each task uses (extraction, commitment ledger, landmines, brief, ask, report, baselines), temperature, and why | M05 |
| `prompts/<name>-vN.md` | Each system prompt version: the text, what changed from vN-1, and why | M05 |
| `evals.md` | Results on `seed/acme` and `seed/nova`: did the brief surface the open Sep 2 commitment first? Did it flag the pricing landmine? Is Waada better than the summary baseline? Date, model, and pass/fail per check | M05, M10 |

## Rules

- Never claim a model "works" for a task without an entry in `evals.md` showing the run.
- A prompt change = a new `prompts/<name>-vN.md` file, never a silent edit.
- Anything that needs the human's decision goes to `../PROPOSALS.md`, not here.
