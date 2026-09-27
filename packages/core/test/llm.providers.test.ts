import { describe, expect, it, vi } from "vitest";
import { ConfigError } from "../src/errors.ts";
import {
  createLanguageModel,
  createTranscriptionModel,
  isGroqConfigured,
  providerInfo,
  providers,
  resolveGroqApiKey,
  testConnection,
} from "../src/llm/providers.ts";
import { redactedSettings } from "../src/llm/settings.ts";

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

describe("Groq GROQ_API_KEY env fallback", () => {
  const groqSettings = (apiKey?: string) => ({
    provider: "groq" as const,
    model: "openai/gpt-oss-120b",
    credentials: apiKey ? { groq: { apiKey } } : {},
  });

  it("prefers the Settings key over the env key", () => {
    vi.stubEnv("GROQ_API_KEY", "env-key");
    try {
      expect(resolveGroqApiKey(groqSettings("settings-key"))).toBe("settings-key");
      // A settings-built model must not throw when both keys exist.
      expect(() => createLanguageModel(groqSettings("settings-key"))).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses GROQ_API_KEY when Settings has no Groq key", () => {
    vi.stubEnv("GROQ_API_KEY", "env-key");
    try {
      expect(resolveGroqApiKey(groqSettings())).toBe("env-key");
      expect(isGroqConfigured(groqSettings())).toBe(true);
      expect(() => createLanguageModel(groqSettings())).not.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("treats an empty env key as unset and throws a friendly ConfigError", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    try {
      expect(resolveGroqApiKey(groqSettings())).toBeUndefined();
      expect(isGroqConfigured(groqSettings())).toBe(false);
      expect(() => createLanguageModel(groqSettings())).toThrow(ConfigError);
      expect(() => createLanguageModel(groqSettings())).toThrow(
        "Add a Groq API key in Settings to use Groq.",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses the env key for Groq transcription when Settings is empty", () => {
    vi.stubEnv("GROQ_API_KEY", "env-key");
    try {
      const model = createTranscriptionModel({
        provider: "groq",
        model: "openai/gpt-oss-120b",
        credentials: {},
        transcription: { provider: "groq", model: "whisper-large-v3-turbo" },
      });
      expect(model).toBeDefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reports testConnection as misconfigured when neither key exists", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    try {
      await expect(testConnection("groq", groqSettings())).resolves.toEqual({
        ok: false,
        error: "Add a Groq API key in Settings to use Groq.",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("marks Groq configured in redacted output without exposing the key", () => {
    vi.stubEnv("GROQ_API_KEY", "env-secret-key");
    try {
      const redacted = redactedSettings(groqSettings());
      expect(redacted.credentials.groq?.apiKey).toBe("[redacted]");
      expect(JSON.stringify(redacted)).not.toContain("env-secret-key");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
