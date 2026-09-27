# M02 — LLM core (multi-provider via the AI SDK)

**Goal:** implement the `LLM` interface (AGENTS.md §6.5) with the Vercel AI SDK, letting the user choose among the providers approved in S3 using **API keys**. Sign-in flows (OpenRouter PKCE, ChatGPT) are **M02b**. You provide the settings slot they write into.

## Files you own

```
packages/core/src/llm/index.ts          (replace M00's stub)
packages/core/src/llm/settings.ts       LlmSettings schema + load/save (.waada/llm.json)
packages/core/src/llm/providers.ts      provider registry: id, label, models, capabilities, factory
packages/core/src/llm/extract.ts        structured output with retry → repair → JSON fallback
packages/core/src/llm/transcribe.ts
packages/core/test/llm*.test.ts  packages/core/test/llm.live.test.ts
docs/decisions/llm/providers.md
```
Dependencies (approved S3/S4): `ai`, `@ai-sdk/groq`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@openrouter/ai-sdk-provider`, and `@ai-sdk/openai-compatible` for **Ollama** (S21: base URL `http://localhost:11434/v1`, placeholder API key; Ollama ignores it).

## Build

1. **Settings** (`.waada/llm.json`, via `store.ts`):
   ```ts
   { provider: "groq" | "openai" | "anthropic" | "google" | "openrouter" | "ollama" | "chatgpt",
     model: string, fallbackModel?: string,
     credentials: { groq?: {apiKey}, openai?: {apiKey}, anthropic?: {apiKey}, google?: {apiKey},
                    openrouter?: {apiKey, via: "key" | "oauth"}, ollama?: {baseUrl},
                    chatgpt?: {/* owned by M02b; opaque object */} },
     transcription?: { provider: "groq" | "openai", model: string } }
   ```
   Defaults: `groq`, `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`, Ollama base URL `http://localhost:11434/v1`. Mark Ollama `supportsTranscription: false` and note in `providers.md` that structured-output quality depends on the local model. Export `getLlmSettings()`, `saveLlmSettings()`, and `redactedSettings()` (keys masked, for the UI).
2. **Provider registry**: for each provider: label, suggested models, and flags `supportsStructuredOutput`, `supportsTranscription`, `requiresKey`. Also `testConnection(provider)`, which makes a tiny call and returns ok or a friendly error (the UI's "Test" button). The `chatgpt` entry is a placeholder that M02b fills in; keep it behind a flag `experimental: true`.
3. **`chat`**: AI SDK text generation with the configured model. On a provider or model error, retry once with `fallbackModel` if set.
4. **`extract<T>`**: the contract in §6.5, exactly:
   - try AI SDK structured-object generation with the Zod schema
   - if that fails or validation fails → retry once with a repair prompt that includes the validation error and the schema
   - if it fails again → ask for plain JSON, strip code fences, `JSON.parse`, validate
   - if still failing → log a warning and return `null`. **Never throw on malformed output.** Provider or network errors → `ExternalServiceError`.
5. **`transcribe`**: AI SDK transcription with `settings.transcription` (Groq or OpenAI Whisper). Verify the current Whisper model IDs in each provider's docs. If neither provider is configured → `ConfigError("Add a Groq or OpenAI key in Settings to transcribe audio")`.
6. **`docs/decisions/llm/providers.md`**: a table of providers, auth method, structured-output support, transcription support, and quirks you observed (e.g. models that ignore the schema).

## Acceptance

- [ ] Unit tests with the AI SDK's mock/test model utilities (check the AI SDK docs): extract fallback chain order, `null` on garbage, fallback model on error, settings round-trip, redaction
- [ ] `llm.live.test.ts`: with a real Groq key, `extract` returns a schema-valid object for a small prompt; `chat` returns text. Paste the output.
- [ ] No API key is ever logged or returned unredacted to the UI

## References

AI SDK: https://ai-sdk.dev/docs · Providers: https://ai-sdk.dev/providers/ai-sdk-providers · OpenRouter provider: https://ai-sdk.dev/providers/community-providers/openrouter · Groq models: https://console.groq.com/docs/models

## Out of scope

OAuth and sign-in flows (M02b). Prompts for features (M05). The settings UI (M06).
