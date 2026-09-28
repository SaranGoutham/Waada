// Only this folder may import `ai` / `@ai-sdk/*` / provider packages (AGENTS.md rule 4).
import { generateText, transcribe as generateTranscript } from "ai";
import type { z } from "zod";
import { ConfigError, ExternalServiceError } from "../errors.ts";
import { extract as extractObject } from "./extract.ts";
import { createLanguageModel, createTranscriptionModel } from "./providers.ts";
import { dailyLimitMessage, withRateLimitRetry } from "./retry.ts";
import { getLlmSettings } from "./settings.ts";

export * from "./providers.ts";
export * from "./settings.ts";

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

/** Reads the user's provider settings from .waada/llm.json. */
export async function createLLM(): Promise<LLM> {
  const settings = await getLlmSettings();
  return {
    async chat({ system, user, temperature }) {
      const models = [settings.model];
      if (settings.fallbackModel && settings.fallbackModel !== settings.model)
        models.push(settings.fallbackModel);
      let lastError: unknown;
      for (const modelId of models) {
        try {
          // Single retry layer: the SDK default (maxRetries: 2) is disabled so
          // 429s are retried exactly as llm/retry.ts specifies (retry-after,
          // capped 60 s, at most 2 retries, never 413) instead of twice over.
          const result = await withRateLimitRetry(() =>
            generateText({
              model: createLanguageModel(settings, modelId),
              system,
              prompt: user,
              temperature,
              maxRetries: 0,
            }),
          );
          return result.text;
        } catch (error) {
          if (error instanceof ConfigError) throw error;
          lastError = error;
        }
      }
      throw new ExternalServiceError(
        dailyLimitMessage(settings.provider, lastError) ??
          `Could not get a response from ${settings.provider}. Check the model and Settings.`,
        { cause: lastError },
      );
    },
    async extract(args) {
      return extractObject(settings, args);
    },
    async transcribe(audio, _filename) {
      try {
        const result = await generateTranscript({
          model: createTranscriptionModel(settings),
          audio,
        });
        return result.text;
      } catch (error) {
        if (error instanceof ConfigError) throw error;
        throw new ExternalServiceError(
          "Could not transcribe audio. Check the provider and Settings.",
          { cause: error },
        );
      }
    },
  };
}
