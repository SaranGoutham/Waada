# M02 LLM Core — Design

**Module:** M02 — LLM core  
**Date:** 2026-09-27  
**Status:** Planning; implementation waits for M00 Foundation to be `done`.

## Purpose

Provide the `LLM` contract from `@waada/core` using the approved Vercel AI SDK
providers. The module stores user-selected model settings in `.waada/llm.json`,
keeps provider credentials out of returned UI data and logs, and turns provider
failures into safe Waada errors.

M02 covers API-key connections. OpenRouter OAuth PKCE and the experimental
ChatGPT-subscription adapter belong to M02b; this module only preserves their
settings slot and describes the `chatgpt` registry entry as experimental.

## Public module design

`packages/core/src/llm/index.ts` replaces M00's stub and exports:

- `LLM` and `createLLM()` exactly as specified in `AGENTS.md` §6.5.
- Settings helpers and `LlmSettings` from `settings.ts`.
- Provider metadata and connection testing from `providers.ts` as needed by
  the web Settings surface.

Only files under `packages/core/src/llm/` import `ai` or an AI SDK provider
package. Callers receive the stable `LLM` interface and never provider clients
or credential values.

## Settings and secrecy

`LlmSettings` is a Zod schema persisted through M00's atomic `readJson` and
`writeJson` helpers at `llm.json`. Its defaults are:

| Field | Default |
| --- | --- |
| provider | `groq` |
| model | `openai/gpt-oss-120b` |
| fallbackModel | `qwen/qwen3-32b` |
| Ollama base URL | `http://localhost:11434/v1` |

Credentials are per provider and validated without logging their contents.
`redactedSettings()` returns the same usable shape for the UI, but masks every
API key and preserves neither an unredacted key nor token-derived value. M02b's
`chatgpt` credentials remain an opaque optional object so it can extend the
schema without changing the public settings format.

Invalid persisted settings fall back safely only when the file is absent; an
existing malformed file results in a safe `ConfigError` explaining that the
settings need correction.

## Provider registry

The registry is the single source of metadata and client construction. Every
entry has an id, label, suggested model ids, capability flags, authentication
requirements, an optional experimental flag, and a factory accepting the
matching credentials.

| Provider | Auth in M02 | Structured output | Transcription | Notes |
| --- | --- | --- | --- | --- |
| Groq | API key | yes, model-dependent | yes | Default chat model is `openai/gpt-oss-120b`; default transcription model will be `whisper-large-v3-turbo`. |
| OpenAI | API key | yes | yes | Default transcription model will be verified from current OpenAI docs during implementation. |
| Anthropic | API key | yes | no | No audio route in this module. |
| Google | API key | yes | no | No audio route in this module. |
| OpenRouter | API key (`via: key`) | model-dependent | no | OAuth credentials are reserved for M02b. |
| Ollama | no key; OpenAI-compatible endpoint | model-dependent | no | Uses approved `@ai-sdk/openai-compatible`; local model quality determines schema adherence. |
| ChatGPT | none in M02 | unavailable | unavailable | Experimental placeholder for M02b only. |

`testConnection(provider)` invokes the selected provider through a minimal text
generation request and returns `{ ok: true }` or a user-safe error result. It
must never surface a raw provider response or credential. It uses the configured
model for the selected provider; M02b will own testing the ChatGPT entry.

## Runtime behavior

### Chat

`chat()` calls AI SDK text generation with a system and user prompt. On a
provider/model failure it retries once using `fallbackModel` when configured and
different from the primary model. If both attempts fail, it throws an
`ExternalServiceError` with a safe provider/model message. Missing configuration
throws `ConfigError` before any provider call.

### Structured extraction

`extract()` has a fixed three-stage protocol:

1. Call AI SDK structured-object generation with the supplied Zod schema.
2. On object-generation or schema-validation failure, make exactly one repair
   call. The prompt includes the validation failure and a JSON representation of
   the expected schema, and requests only a corrected object.
3. If repair fails, request plain JSON, remove an outer Markdown code fence,
   parse it, and validate with the supplied schema.

Malformed output at every stage logs a redacted warning via core's logger and
returns `null`; it never throws. A provider/network failure is differentiated
from malformed output and becomes an `ExternalServiceError`. Calls in this
protocol do not accidentally use `fallbackModel`: the fallback-model retry is
the `chat()` availability policy, while extraction must exhibit its specified
repair order deterministically.

### Transcription

`transcribe()` selects `settings.transcription` only when it is Groq or OpenAI
and that provider has an API key. Otherwise it throws exactly:

`ConfigError("Add a Groq or OpenAI key in Settings to transcribe audio")`.

The byte array and original filename become an AI SDK file input. The method
returns transcript text, converting provider failures to `ExternalServiceError`.
Ollama declares no transcription capability under S21.

## Test seams and verification

Factories and AI SDK calls will be dependency-injectable internally so unit
tests can use `MockLanguageModelV3` from `ai/test` rather than network calls.
The test suite will prove settings round trips/redaction, model fallback,
extraction stage ordering, code-fenced JSON fallback, garbage-to-`null`, safe
errors, and transcription configuration selection. `llm.live.test.ts` remains
opt-in and runs only with a real Groq key; its output will be recorded in the
final module report without exposing keys.

## Source checks made during planning

- [AI SDK testing documentation](https://ai-sdk.dev/docs/ai-sdk-core/testing)
  documents the `ai/test` mock language models.
- [Groq speech-to-text documentation](https://console.groq.com/docs/speech-to-text)
  currently lists `whisper-large-v3-turbo` and `whisper-large-v3`.
- [Groq supported models](https://console.groq.com/docs/models) currently
  lists `openai/gpt-oss-120b` as a production model.

## Deferred decisions

- Exact API shapes for the installed AI SDK version, especially transcription
  and structured-generation helpers, will be verified against its installed
  package types and current official documentation after M00 establishes the
  workspace.
- OpenAI's current transcription model identifier will be verified before it is
  committed to provider metadata.
