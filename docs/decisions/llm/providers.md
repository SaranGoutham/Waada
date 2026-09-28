# LLM providers

M02 stores API-key settings only. OAuth sign-in and the experimental ChatGPT
subscription adapter are owned by M02b.

| Provider | Auth | Structured output | Transcription | Notes |
| --- | --- | --- | --- | --- |
| Groq | API key | Yes, model-dependent | Yes | Default chat: `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`; recommended speech model: `whisper-large-v3-turbo`. |
| OpenAI | API key | Yes | Yes | The selected transcription model is user-configured; current provider support includes Whisper and GPT-4o transcription models. |
| Anthropic | API key | Yes | No | No audio route in this module. |
| Google | API key | Yes | No | No audio route in this module. |
| OpenRouter | API key | Model-dependent | No | API-key flow only; OAuth is M02b. |
| Ollama | None | Model-dependent | No | Uses its OpenAI-compatible endpoint at `http://localhost:11434/v1`; local model schema adherence varies. |
| ChatGPT subscription | M02b only | No in M02 | No | Experimental placeholder; the MVP works without it. |

Security rules:

- Credentials persist only in `.waada/llm.json`, which is gitignored.
- Exception: `GROQ_API_KEY` in `.env` is accepted as a fallback when no Groq key is saved in Settings; a Settings key wins.
- UI-facing settings use `redactedSettings()`; API keys are replaced with
  `[redacted]` and are never logged.
- Provider failures are surfaced as friendly Waada errors without raw provider
  responses.
- A Groq `429` with a `retry-after` over 60 seconds is treated as an exhausted
  free-tier daily/window limit: Waada skips waiting, tries the configured
  fallback model, then shows a friendly time estimate if both fail. A Groq
  `json_validate_failed` structured-output `400` follows extraction's repair
  and plain-JSON recovery path rather than surfacing raw provider output.

Verification sources: installed `ai@7.0.116` provider types and the Groq/OpenAI
provider package documentation. The Groq package declares transcription support;
the OpenAI provider package includes transcription support. Live calls remain
opt-in in `llm.live.test.ts`.
