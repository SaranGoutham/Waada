import { describe, expect, it } from "vitest";
import { ConfigError } from "../src/errors.ts";
import {
  createLanguageModel,
  createTranscriptionModel,
  providerInfo,
  providers,
  testConnection,
} from "../src/llm/providers.ts";

describe("LLM provider registry", () => {
  it("publishes approved provider capabilities and the experimental ChatGPT placeholder", () => {
    expect(providers.map((provider) => provider.id)).toEqual([
      "groq",
      "openai",
      "anthropic",
      "google",
      "openrouter",
      "ollama",
      "chatgpt",
    ]);
    expect(providerInfo("ollama")).toMatchObject({
      requiresKey: false,
      supportsTranscription: false,
      supportsStructuredOutput: true,
    });
    expect(providerInfo("chatgpt")).toMatchObject({ experimental: true, requiresKey: false });
  });

  it("uses the approved Ollama OpenAI-compatible endpoint without a user API key", () => {
    const model = createLanguageModel({
      provider: "ollama",
      model: "qwen3:8b",
      credentials: { ollama: { baseUrl: "http://localhost:11434/v1" } },
    });

    expect(model).toBeDefined();
  });

  it("returns friendly configuration failures without attempting a connection", async () => {
    await expect(
      testConnection("chatgpt", { provider: "chatgpt", model: "experimental", credentials: {} }),
    ).resolves.toEqual({
      ok: false,
      error: "ChatGPT subscription login is experimental and has not been configured.",
    });
  });

  it("requires a configured Groq or OpenAI transcription provider", () => {
    expect(() =>
      createTranscriptionModel({ provider: "ollama", model: "qwen3:8b", credentials: {} }),
    ).toThrow(ConfigError);
    expect(() =>
      createTranscriptionModel({ provider: "ollama", model: "qwen3:8b", credentials: {} }),
    ).toThrow("Add a Groq or OpenAI key in Settings to transcribe audio");
  });
});
