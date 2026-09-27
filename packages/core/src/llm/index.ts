// STUB (M00). Owned by M02: replace createLLM() and LlmSettings (provisional shape from tasks/M02-llm-core.md).
// Only this folder may import `ai` / `@ai-sdk/*` / provider packages (AGENTS.md rule 4).
import { z } from "zod";

export interface LLM {
  chat(a: { system: string; user: string; temperature?: number }): Promise<string>;
  // Structured output. Validate with the schema → on failure retry once with a repair prompt
  // → fall back to plain JSON parsing → return null. Never throws on malformed model output.
  extract<T>(a: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    name: string;
    description: string;
    temperature?: number;
  }): Promise<T | null>;
  transcribe(audio: Uint8Array, filename: string): Promise<string>;
}

const ApiKey = z.object({ apiKey: z.string() });

// Provider, model, fallbackModel, per-provider credentials. Stored in .waada/llm.json.
export const LlmSettings = z.object({
  provider: z.enum(["groq", "openai", "anthropic", "google", "openrouter", "ollama", "chatgpt"]),
  model: z.string(),
  fallbackModel: z.string().optional(),
  credentials: z.object({
    groq: ApiKey.optional(),
    openai: ApiKey.optional(),
    anthropic: ApiKey.optional(),
    google: ApiKey.optional(),
    openrouter: z.object({ apiKey: z.string(), via: z.enum(["key", "oauth"]) }).optional(),
    ollama: z.object({ baseUrl: z.string() }).optional(),
    chatgpt: z.record(z.string(), z.unknown()).optional(), // owned by M02b; opaque
  }),
  transcription: z.object({ provider: z.enum(["groq", "openai"]), model: z.string() }).optional(),
});
export type LlmSettings = z.infer<typeof LlmSettings>;

/** Reads the user's provider settings from .waada/llm.json. */
export async function createLLM(): Promise<LLM> {
  throw new Error("not implemented: llm");
}
