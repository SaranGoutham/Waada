import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigError, ExternalServiceError } from "../src/errors.ts";

const mocks = vi.hoisted(() => ({
  createLanguageModel: vi.fn(() => ({}) as never),
  createTranscriptionModel: vi.fn(() => ({}) as never),
  generateText: vi.fn(),
  transcribe: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: mocks.generateText,
  transcribe: mocks.transcribe,
}));

vi.mock("../src/llm/providers.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/llm/providers.ts")>()),
  createLanguageModel: mocks.createLanguageModel,
  createTranscriptionModel: mocks.createTranscriptionModel,
}));

import { createLLM } from "../src/llm/index.ts";
import { saveLlmSettings } from "../src/llm/settings.ts";

describe("LLM runtime", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "waada-llm-runtime-"));
    vi.stubEnv("WAADA_DATA_DIR", dataDir);
    vi.clearAllMocks();
    await saveLlmSettings({
      provider: "groq",
      model: "primary",
      fallbackModel: "fallback",
      credentials: { groq: { apiKey: "test-key" } },
      transcription: { provider: "groq", model: "whisper-large-v3-turbo" },
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dataDir, { force: true, recursive: true });
  });

  it("returns the primary chat-model response", async () => {
    mocks.generateText.mockResolvedValueOnce({ text: "primary reply" });
    const llm = await createLLM();

    await expect(llm.chat({ system: "s", user: "u" })).resolves.toBe("primary reply");
    expect(mocks.createLanguageModel).toHaveBeenCalledTimes(1);
  });

  it("retries chat exactly once with the configured fallback model", async () => {
    mocks.generateText
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce({ text: "fallback reply" });
    const llm = await createLLM();

    await expect(llm.chat({ system: "s", user: "u" })).resolves.toBe("fallback reply");
    const modelCalls = mocks.createLanguageModel.mock.calls as unknown as Array<[unknown, string]>;
    expect(modelCalls.map((call) => call[1])).toEqual(["primary", "fallback"]);
  });

  it("preserves missing-provider configuration errors", async () => {
    mocks.createLanguageModel.mockImplementationOnce(() => {
      throw new ConfigError("Add a Groq API key in Settings to use Groq.");
    });
    const llm = await createLLM();

    await expect(llm.chat({ system: "s", user: "u" })).rejects.toBeInstanceOf(ConfigError);
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("maps exhausted chat failures to a safe external-service error", async () => {
    mocks.generateText.mockRejectedValue(new Error("provider unavailable"));
    const llm = await createLLM();

    await expect(llm.chat({ system: "s", user: "u" })).rejects.toBeInstanceOf(ExternalServiceError);
  });

  it("uses the selected transcription model and returns its text", async () => {
    mocks.transcribe.mockResolvedValueOnce({ text: "hello from the call" });
    const llm = await createLLM();

    await expect(llm.transcribe(new Uint8Array([1, 2]), "call.wav")).resolves.toBe(
      "hello from the call",
    );
    expect(mocks.createTranscriptionModel).toHaveBeenCalledTimes(1);
    expect(mocks.transcribe.mock.calls[0]?.[0]?.audio).toEqual(new Uint8Array([1, 2]));
  });

  it("preserves the friendly transcription configuration error", async () => {
    mocks.createTranscriptionModel.mockImplementationOnce(() => {
      throw new ConfigError("Add a Groq or OpenAI key in Settings to transcribe audio");
    });
    const llm = await createLLM();

    await expect(llm.transcribe(new Uint8Array([1]), "call.wav")).rejects.toThrow(
      "Add a Groq or OpenAI key in Settings to transcribe audio",
    );
  });

  it("maps transcription provider failures to a safe external-service error", async () => {
    mocks.transcribe.mockRejectedValueOnce(new Error("provider unavailable"));
    const llm = await createLLM();

    await expect(llm.transcribe(new Uint8Array([1]), "call.wav")).rejects.toBeInstanceOf(
      ExternalServiceError,
    );
  });
});
