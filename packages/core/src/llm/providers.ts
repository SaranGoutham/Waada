import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, type LanguageModel, type TranscriptionModel } from "ai";
import { ConfigError } from "../errors.ts";
import type { LlmSettings } from "./settings.ts";

export type ProviderId = LlmSettings["provider"];

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  suggestedModels: string[];
  supportsStructuredOutput: boolean;
  supportsTranscription: boolean;
  requiresKey: boolean;
  experimental?: boolean;
};

export const providers: readonly ProviderInfo[] = [
  {
    id: "groq",
    label: "Groq",
    suggestedModels: ["openai/gpt-oss-120b", "qwen/qwen3-32b"],
    supportsStructuredOutput: true,
    supportsTranscription: true,
    requiresKey: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    suggestedModels: ["gpt-4.1-mini", "gpt-5-mini"],
    supportsStructuredOutput: true,
    supportsTranscription: true,
    requiresKey: true,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    suggestedModels: ["claude-sonnet-4-5"],
    supportsStructuredOutput: true,
    supportsTranscription: false,
    requiresKey: true,
  },
  {
    id: "google",
    label: "Google",
    suggestedModels: ["gemini-2.5-flash"],
    supportsStructuredOutput: true,
    supportsTranscription: false,
    requiresKey: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    suggestedModels: ["openai/gpt-4.1-mini"],
    supportsStructuredOutput: true,
    supportsTranscription: false,
    requiresKey: true,
  },
  {
    id: "ollama",
    label: "Ollama",
    suggestedModels: ["qwen3:8b", "llama3.3"],
    supportsStructuredOutput: true,
    supportsTranscription: false,
    requiresKey: false,
  },
  {
    id: "chatgpt",
    label: "ChatGPT subscription",
    suggestedModels: [],
    supportsStructuredOutput: false,
    supportsTranscription: false,
    requiresKey: false,
    experimental: true,
  },
];

export function providerInfo(id: ProviderId): ProviderInfo {
  const provider = providers.find((entry) => entry.id === id);
  if (!provider) throw new ConfigError("Unknown LLM provider.");
  return provider;
}

export function createLanguageModel(
  settings: LlmSettings,
  modelId = settings.model,
): LanguageModel {
  switch (settings.provider) {
    case "groq": {
      const key = settings.credentials.groq?.apiKey;
      if (!key) throw new ConfigError("Add a Groq API key in Settings to use Groq.");
      return createGroq({ apiKey: key })(modelId);
    }
    case "openai": {
      const key = settings.credentials.openai?.apiKey;
      if (!key) throw new ConfigError("Add an OpenAI API key in Settings to use OpenAI.");
      return createOpenAI({ apiKey: key })(modelId);
    }
    case "anthropic": {
      const key = settings.credentials.anthropic?.apiKey;
      if (!key) throw new ConfigError("Add an Anthropic API key in Settings to use Anthropic.");
      return createAnthropic({ apiKey: key })(modelId);
    }
    case "google": {
      const key = settings.credentials.google?.apiKey;
      if (!key) throw new ConfigError("Add a Google API key in Settings to use Google.");
      return createGoogleGenerativeAI({ apiKey: key })(modelId);
    }
    case "openrouter": {
      const credential = settings.credentials.openrouter;
      if (!credential?.apiKey || credential.via !== "key")
        throw new ConfigError("Add an OpenRouter API key in Settings to use OpenRouter.");
      return createOpenRouter({ apiKey: credential.apiKey, compatibility: "strict" })(modelId);
    }
    case "ollama": {
      const baseURL = settings.credentials.ollama?.baseUrl ?? "http://localhost:11434/v1";
      return createOpenAICompatible({ name: "ollama", apiKey: "ollama", baseURL })(modelId);
    }
    case "chatgpt":
      throw new ConfigError(
        "ChatGPT subscription login is experimental and has not been configured.",
      );
  }
}

export function createTranscriptionModel(settings: LlmSettings): TranscriptionModel {
  const selection = settings.transcription;
  if (!selection) throw new ConfigError("Add a Groq or OpenAI key in Settings to transcribe audio");
  if (selection.provider === "groq") {
    const key = settings.credentials.groq?.apiKey;
    if (key) return createGroq({ apiKey: key }).transcription(selection.model);
  }
  if (selection.provider === "openai") {
    const key = settings.credentials.openai?.apiKey;
    if (key) return createOpenAI({ apiKey: key }).transcription(selection.model);
  }
  throw new ConfigError("Add a Groq or OpenAI key in Settings to transcribe audio");
}

export async function testConnection(
  provider: ProviderId,
  settings: LlmSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const model = createLanguageModel({ ...settings, provider });
    await generateText({ model, prompt: "Reply with OK.", maxOutputTokens: 4 });
    return { ok: true };
  } catch (error) {
    if (error instanceof ConfigError) return { ok: false, error: error.message };
    return {
      ok: false,
      error: `Could not connect to ${providerInfo(provider).label}. Check the model and Settings.`,
    };
  }
}
