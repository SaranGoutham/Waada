import { z } from "zod";
import { getEnv } from "../config.ts";
import { readJson, writeJson } from "../store.ts";

const ApiKey = z.object({ apiKey: z.string().min(1) });

export const LlmSettings = z.object({
  provider: z.enum(["groq", "openai", "anthropic", "google", "openrouter", "ollama", "chatgpt"]),
  model: z.string().min(1),
  fallbackModel: z.string().min(1).optional(),
  credentials: z.object({
    groq: ApiKey.optional(),
    openai: ApiKey.optional(),
    anthropic: ApiKey.optional(),
    google: ApiKey.optional(),
    openrouter: z.object({ apiKey: z.string().min(1), via: z.enum(["key", "oauth"]) }).optional(),
    ollama: z.object({ baseUrl: z.string().url() }).optional(),
    // M02b owns the contents. Keep this slot opaque while validating that it is a JSON object.
    chatgpt: z.record(z.string(), z.unknown()).optional(),
  }),
  transcription: z
    .object({ provider: z.enum(["groq", "openai"]), model: z.string().min(1) })
    .optional(),
});
export type LlmSettings = z.infer<typeof LlmSettings>;

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  provider: "groq",
  model: "openai/gpt-oss-120b",
  fallbackModel: "qwen/qwen3-32b",
  credentials: { ollama: { baseUrl: "http://localhost:11434/v1" } },
};

export async function getLlmSettings(): Promise<LlmSettings> {
  return readJson("llm.json", LlmSettings, structuredClone(DEFAULT_LLM_SETTINGS));
}

export async function saveLlmSettings(settings: LlmSettings): Promise<void> {
  const parsed = LlmSettings.parse(settings);
  await writeJson("llm.json", parsed);
}

/** A UI-safe copy: credentials indicate configuration but never expose their values. */
export function redactedSettings(settings: LlmSettings): LlmSettings {
  const redacted = structuredClone(settings);
  for (const provider of ["groq", "openai", "anthropic", "google"] as const) {
    if (redacted.credentials[provider]) redacted.credentials[provider].apiKey = "[redacted]";
  }
  // GROQ_API_KEY env fallback (AGENTS.md §2 rule 6 exception): report Groq as
  // configured without exposing the key value itself.
  if (!redacted.credentials.groq && getEnv().groqApiKey) {
    redacted.credentials.groq = { apiKey: "[redacted]" };
  }
  if (redacted.credentials.openrouter) redacted.credentials.openrouter.apiKey = "[redacted]";
  if (redacted.credentials.chatgpt) redactOpaqueCredentials(redacted.credentials.chatgpt);
  return redacted;
}

function redactOpaqueCredentials(value: Record<string, unknown>): void {
  for (const [key, child] of Object.entries(value)) {
    if (/key|token|secret|password|authorization|cookie/i.test(key)) {
      value[key] = "[redacted]";
    } else if (child && typeof child === "object" && !Array.isArray(child)) {
      redactOpaqueCredentials(child as Record<string, unknown>);
    }
  }
}
